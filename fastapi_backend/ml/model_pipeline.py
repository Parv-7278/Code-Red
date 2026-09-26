"""
Machine Learning Model Pipeline & Training Engine for POLARIS.
Implements multi-target time-series regression with TimeSeriesSplit validation,
evaluation metrics (R2, MAE, RMSE), and persistent disk storage via Joblib.
"""

import os
import json
import math
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.model_selection import TimeSeriesSplit

from .telemetry_dataset import TelemetryRecord, TelemetryDataset
from .feature_engineering import FeatureEngineer, FEATURE_NAMES, TARGET_KEYS

logger = logging.getLogger("polaris.ml.pipeline")

# Path to persist trained models
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)


class StationMLPipeline:
    """
    Supervised Time-Series Regressor Pipeline for an individual Antarctic station.
    Trains and stores separate models for Maitri and Bharati.
    """

    def __init__(self, station_id: str = "maitri"):
        self.station_id = TelemetryDataset.normalize_station_id(station_id)
        self.model: Optional[Any] = None
        self.model_type: str = "RandomForestRegressor"
        self.metadata: Dict[str, Any] = {}
        self.model_path = os.path.join(MODELS_DIR, f"station_{self.station_id}_model.joblib")
        self.meta_path = os.path.join(MODELS_DIR, f"station_{self.station_id}_meta.json")

    def is_trained(self) -> bool:
        return self.model is not None

    def save(self) -> None:
        """Persists trained model and training metadata to disk."""
        if self.model is None:
            raise ValueError("Cannot persist an untrained model.")
        joblib.dump(self.model, self.model_path)
        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, indent=2)
        logger.info(f"[StationMLPipeline] Saved model & metadata for {self.station_id} to {self.model_path}")

    def load(self) -> bool:
        """Loads model and metadata from disk if available."""
        if os.path.exists(self.model_path) and os.path.exists(self.meta_path):
            try:
                self.model = joblib.load(self.model_path)
                with open(self.meta_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                self.model_type = self.metadata.get("model_type", "RandomForestRegressor")
                logger.info(f"[StationMLPipeline] Successfully loaded persisted model for {self.station_id}")
                return True
            except Exception as e:
                logger.warning(f"[StationMLPipeline] Failed to load model for {self.station_id}: {e}")
                return False
        return False

    def train_and_evaluate(
        self,
        records: List[TelemetryRecord],
        n_splits: int = 3
    ) -> Dict[str, Any]:
        """
        Trains the time-series model on telemetry records using TimeSeriesSplit validation.
        Calculates R2, MAE, and RMSE for all horizons and saves the model to disk.
        """
        if len(records) < 20:
            raise ValueError(f"Insufficient telemetry data ({len(records)} records). Minimum 20 required.")

        # 1. Feature matrix construction
        X, Y, feature_names, target_names = FeatureEngineer.build_training_matrix(
            records=records,
            station_id=self.station_id
        )

        n_samples = len(X)
        if n_samples < 10:
            raise ValueError(f"Feature matrix too small ({n_samples} rows).")

        # 2. Time-Series Cross-Validation
        cv_splits = min(n_splits, max(2, n_samples // 15))
        tscv = TimeSeriesSplit(n_splits=cv_splits)

        cv_r2_scores = []
        cv_mae_scores = []
        cv_rmse_scores = []

        for train_idx, val_idx in tscv.split(X):
            X_tr, X_val = X[train_idx], X[val_idx]
            Y_tr, Y_val = Y[train_idx], Y[val_idx]

            fold_rf = RandomForestRegressor(
                n_estimators=35,
                max_depth=7,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=1
            )
            fold_rf.fit(X_tr, Y_tr)
            Y_val_pred = fold_rf.predict(X_val)

            # Evaluate fold
            fold_r2 = [r2_score(Y_val[:, j], Y_val_pred[:, j]) for j in range(Y.shape[1])]
            fold_mae = [mean_absolute_error(Y_val[:, j], Y_val_pred[:, j]) for j in range(Y.shape[1])]
            fold_rmse = [math.sqrt(mean_squared_error(Y_val[:, j], Y_val_pred[:, j])) for j in range(Y.shape[1])]
            cv_r2_scores.append(fold_r2)
            cv_mae_scores.append(fold_mae)
            cv_rmse_scores.append(fold_rmse)

        # 3. Final Production Fit on full history
        self.model = RandomForestRegressor(
            n_estimators=45,
            max_depth=8,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=1
        )
        self.model.fit(X, Y)
        self.model_type = "RandomForestRegressor"

        # 4. Report chronological cross-validation performance. Metrics from
        # the full training set would be optimistic and are not used here.
        metrics_per_target = {}
        r2_list = []
        mae_list = []
        rmse_list = []

        for idx, name in enumerate(target_names):
            r2 = float(np.mean([fold[idx] for fold in cv_r2_scores]))
            mae = float(np.mean([fold[idx] for fold in cv_mae_scores]))
            rmse = float(np.mean([fold[idx] for fold in cv_rmse_scores]))
            clean_r2 = r2 if not math.isnan(r2) else 0.0
            metrics_per_target[name] = {
                "r2": round(clean_r2, 3),
                "mae": round(mae, 2),
                "rmse": round(rmse, 2)
            }
            r2_list.append(clean_r2)
            mae_list.append(mae)
            rmse_list.append(rmse)

        mean_r2 = round(float(np.mean(r2_list)), 3)
        mean_mae = round(float(np.mean(mae_list)), 2)
        mean_rmse = round(float(np.mean(rmse_list)), 2)
        confidence = round(max(0.0, min(0.99, mean_r2)), 2)
        source_counts: Dict[str, int] = {}
        for record in records:
            source = str(getattr(record, "source", "UNKNOWN") or "UNKNOWN").upper()
            source_counts[source] = source_counts.get(source, 0) + 1

        # 5. Build and Save Metadata
        self.metadata = {
            "station_id": self.station_id,
            "model_type": self.model_type,
            "trained_at": datetime.utcnow().isoformat(),
            "raw_records_used": len(records),
            "feature_matrix_rows": n_samples,
            "num_features": len(feature_names),
            "features": feature_names,
            "targets": target_names,
            "cv_splits_evaluated": cv_splits,
            "mean_r2": mean_r2,
            "mean_mae": mean_mae,
            "mean_rmse": mean_rmse,
            "confidence": confidence,
            "target_metrics": metrics_per_target,
            "training_data_start": min(record.timestamp for record in records).isoformat(),
            "training_data_end": max(record.timestamp for record in records).isoformat(),
            "data_provenance": {
                "sources": source_counts,
                "contains_simulation": source_counts.get("SIMULATION", 0) > 0,
            },
        }

        self.save()
        return self.metadata

    def predict_vector(self, feature_vector: np.ndarray) -> Dict[str, float]:
        """
        Executes inference on a single 2D feature vector shape (1, num_features).
        Returns mapped dictionary of predictions.
        """
        if self.model is None:
            raise ValueError("Model is not loaded or trained.")

        pred_array = self.model.predict(feature_vector)[0]
        result = {}
        for idx, key in enumerate(TARGET_KEYS):
            result[key] = float(pred_array[idx])
        return result
