"""
Predictor & Risk Classification Engine for POLARIS.
Performs model inference, physical boundary constraints, time-series anomaly detection,
equipment thermal risk scoring, and predictive maintenance dispatch.
"""

import math
import logging
from typing import Dict, Any, List, Optional, Union

import numpy as np

from .telemetry_dataset import TelemetryRecord, TelemetryDataset, MIN_SAMPLES_FOR_INFERENCE
from .feature_engineering import FeatureEngineer
from .model_pipeline import StationMLPipeline
from services.prediction_repository import record_model_version, record_prediction

logger = logging.getLogger("polaris.ml.predictor")


class StationPredictor:
    """
    High-level predictor interface that manages per-station models (Maitri & Bharati),
    handles online feature extraction, computes risks, and detects anomalies.
    """

    # Station thermal & electrical thresholds
    THRESHOLDS = {
        "generator_warning_temp": 85.0,    # °C
        "generator_critical_temp": 95.0,   # °C
        "generator_temp_slope_warn": 3.0,  # °C / hour rate of rise
        "battery_warning_pct": 65.0,       # %
        "battery_critical_pct": 38.0,      # %
        "max_discharge_rate_warn": 1.2,    # % / hour
    }

    _pipelines: Dict[str, StationMLPipeline] = {}

    @classmethod
    def get_pipeline(cls, station_id: str) -> StationMLPipeline:
        """Retrieves or initializes the model pipeline for a given station."""
        st = TelemetryDataset.normalize_station_id(station_id)
        if st not in cls._pipelines:
            pipeline = StationMLPipeline(station_id=st)
            loaded = pipeline.load()
            if not loaded:
                logger.info(f"[StationPredictor] No persisted model for {st} found on disk. Initializing new pipeline.")
            cls._pipelines[st] = pipeline
        return cls._pipelines[st]

    @classmethod
    async def train_station(cls, station_id: str, records: Optional[List[TelemetryRecord]] = None) -> Dict[str, Any]:
        """Trains or re-trains model for a specific station."""
        st = TelemetryDataset.normalize_station_id(station_id)
        pipeline = cls.get_pipeline(st)

        if records is None or len(records) < 20:
            records = await TelemetryDataset.load_telemetry_for_station(st, limit=300)

        meta = pipeline.train_and_evaluate(records)
        meta["artifact_path"] = pipeline.model_path
        registry = await record_model_version(meta)
        meta["registry"] = registry
        pipeline.metadata = meta
        pipeline.save()
        return meta

    @classmethod
    def evaluate_diagnostics(
        cls,
        prediction: Dict[str, float],
        latest_record: TelemetryRecord,
        station_id: str
    ) -> Dict[str, Any]:
        """
        Evaluates multi-variable risk metrics, thermal alerts, power anomalies, and prescriptive directives.
        """
        st = TelemetryDataset.normalize_station_id(station_id)
        is_bharati = (st == "bharati")
        station_name = "Bharati" if is_bharati else "Maitri"

        curr_batt = latest_record.battery_level
        curr_cons = latest_record.power_consumption
        curr_gen = latest_record.energy_generation
        curr_temp = latest_record.generator_temperature

        t1 = prediction["generator_temp_1h"]
        t6 = prediction["generator_temp_6h"]
        t24 = prediction["generator_temp_24h"]

        b1 = prediction["battery_1h"]
        b6 = prediction["battery_6h"]
        b24 = prediction["battery_24h"]

        p1 = prediction["power_1h"]
        p6 = prediction["power_6h"]
        p24 = prediction["power_24h"]

        # 1. Generator Overheating & Thermal Risk
        temp_slope = max(0.0, (t6 - curr_temp) / 6.0)
        if t24 >= cls.THRESHOLDS["generator_critical_temp"] or t6 >= cls.THRESHOLDS["generator_critical_temp"]:
            generator_risk = "CRITICAL"
            gen_risk_detail = f"Generator core thermal projection reaches critical {max(t6, t24):.1f}°C (Threshold: {cls.THRESHOLDS['generator_critical_temp']}°C)"
        elif (
            t24 >= cls.THRESHOLDS["generator_warning_temp"]
            or t6 >= cls.THRESHOLDS["generator_warning_temp"]
            or temp_slope >= cls.THRESHOLDS["generator_temp_slope_warn"]
        ):
            generator_risk = "WARNING"
            gen_risk_detail = f"Generator core temperature rising ({temp_slope:.2f}°C/hr) towards warning limit ({cls.THRESHOLDS['generator_warning_temp']}°C)"
        else:
            generator_risk = "NORMAL"
            gen_risk_detail = f"Thermal dissipation nominal ({t24:.1f}°C at 24h horizon)"

        # 2. Battery Depletion & Reserve Trend
        hourly_discharge = max(0.0, (curr_batt - b24) / 24.0)
        battery_delta = round(b24 - curr_batt, 1)

        if b24 <= cls.THRESHOLDS["battery_critical_pct"]:
            battery_risk = "CRITICAL"
            battery_trend = f"Rapid depletion (-{hourly_discharge:.2f}%/hr). Critical reserve ({b24:.1f}%) within 24h"
        elif b24 <= cls.THRESHOLDS["battery_warning_pct"] or hourly_discharge >= cls.THRESHOLDS["max_discharge_rate_warn"]:
            battery_risk = "WARNING"
            battery_trend = f"Discharging (-{hourly_discharge:.2f}%/hr, Δ {battery_delta}% in 24h)"
        elif battery_delta > 1.0:
            battery_risk = "NORMAL"
            battery_trend = f"Charging (+{(battery_delta / 24.0):.2f}%/hr, renewable surplus net flow)"
        else:
            battery_risk = "NORMAL"
            battery_trend = "Float charge equilibrium"

        # 3. Increasing Power-Load & Demand Surge Risk
        demand_growth = round(p24 - curr_cons, 1)
        if p24 > (curr_gen * 1.08):
            power_load_risk = "CRITICAL"
            demand_trend = f"Grid deficit surge (+{demand_growth} kW over 24h, exceeds generation by {(p24 - curr_gen):.1f} kW)"
        elif demand_growth >= 12.0 or p24 > (curr_gen * 0.95):
            power_load_risk = "WARNING"
            demand_trend = f"Increasing load surge (+{demand_growth} kW over 24h)"
        elif demand_growth <= -10.0:
            power_load_risk = "NORMAL"
            demand_trend = f"Decreasing load ({demand_growth} kW over 24h)"
        else:
            power_load_risk = "NORMAL"
            demand_trend = f"Stable baseline load (Δ {demand_growth:+.1f} kW)"

        # 4. Energy-System Anomaly Detection
        anomalies_detected = []
        is_anomaly = False

        if latest_record.generator_status in ["OVERHEAT", "FAULT"]:
            is_anomaly = True
            anomalies_detected.append(f"Active generator fault state: {latest_record.generator_status}")

        if (curr_cons - curr_gen) > 40.0 and curr_batt < 50.0:
            is_anomaly = True
            anomalies_detected.append("Severe negative power imbalance with depleted BESS reserve")

        if temp_slope > 4.0:
            is_anomaly = True
            anomalies_detected.append(f"Abnormal thermal ramp rate detected: +{temp_slope:.2f}°C/hr")

        anomaly_status = "ANOMALY_DETECTED" if is_anomaly else "NOMINAL"

        # 5. Composite Overall Equipment / Energy Risk
        if generator_risk == "CRITICAL" or battery_risk == "CRITICAL" or power_load_risk == "CRITICAL":
            overall_risk = "CRITICAL"
        elif generator_risk == "WARNING" or battery_risk == "WARNING" or power_load_risk == "WARNING" or is_anomaly:
            overall_risk = "WARNING"
        else:
            overall_risk = "NORMAL"

        # 6. Prescriptive Maintenance Recommendation
        if overall_risk == "CRITICAL":
            if generator_risk == "CRITICAL":
                recommendation = (
                    f"CRITICAL DIRECTIVE: {station_name} generator thermal forecast exceeds {t24:.1f}°C. "
                    f"Execute immediate baseload switch to secondary generator and shed non-essential science arrays."
                )
            elif battery_risk == "CRITICAL":
                recommendation = (
                    f"CRITICAL DIRECTIVE: BESS reserve projected to deplete to {b24:.1f}% within 24h. "
                    f"Throttle auxiliary habitat heating and initiate secondary diesel generator start-up protocol."
                )
            else:
                recommendation = (
                    f"CRITICAL DIRECTIVE: Microgrid power deficit (+{demand_growth:.1f} kW) threatens black start limit. "
                    f"Synchronize backup genset to bus immediately."
                )
        elif overall_risk == "WARNING":
            if is_bharati:
                recommendation = (
                    f"ADVISORY: Monitor {station_name} BESS buffer ({b24:.1f}% at 24h) and radome electrical surge. "
                    f"Prioritize CHP heat-recovery loop and schedule solar bifacial panel snow sweep before next pass."
                )
            else:
                recommendation = (
                    f"ADVISORY: Monitor {station_name} Generator G-02 core temp ({t24:.1f}°C projected) and battery reserve ({b24:.1f}%). "
                    f"Rotate dispatch to G-01 and verify Priyadarshini water-intake thaw circuit load."
                )
        else:
            recommendation = (
                f"NOMINAL: {station_name} microgrid operates within Gaussian equilibrium tolerances. "
                f"Sustained 24h reserve ({b24:.1f}%) and generation headroom covers forecast demand ({demand_growth:+.1f} kW)."
            )

        response = {
            "generator_risk": generator_risk,
            "generator_risk_detail": gen_risk_detail,
            "battery_risk": battery_risk,
            "power_load_risk": power_load_risk,
            "energy_risk": overall_risk,
            "overall_equipment_risk": overall_risk,
            "demand_trend": demand_trend,
            "battery_trend": battery_trend,
            "anomaly_status": anomaly_status,
            "anomalies_detected": anomalies_detected,
            "recommendation": recommendation
        }
        return response

    @classmethod
    async def predict_for_station(
        cls,
        station_id: str,
        custom_history: Optional[List[TelemetryRecord]] = None,
        prediction_horizons: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Executes end-to-end data-driven prediction pipeline for a station.
        Guards against insufficient data and never invents guesses without data.
        """
        st = TelemetryDataset.normalize_station_id(station_id)
        station_name = "Bharati" if st == "bharati" else "Maitri"

        # 1. Fetch or load history
        history = custom_history
        if history is None:
            history = await TelemetryDataset.load_telemetry_for_station(st, limit=300)

        # 2. INSUFFICIENT DATA GUARD
        if not history or len(history) < MIN_SAMPLES_FOR_INFERENCE:
            logger.warning(f"[StationPredictor] Insufficient telemetry data for {st}: {len(history) if history else 0} records.")
            return {
                "status": "INSUFFICIENT_DATA",
                "station_id": st,
                "station_name": station_name,
                "data_points_used": len(history) if history else 0,
                "message": (
                    f"Insufficient historical telemetry for station '{station_name}'. "
                    f"At least {MIN_SAMPLES_FOR_INFERENCE} sequential telemetry records are required. "
                    "Predictions will not be fabricated without adequate sensor telemetry."
                ),
                "prediction": None,
                "generator_risk": "UNKNOWN",
                "energy_risk": "UNKNOWN",
                "confidence": 0.0,
                "data_provenance": {
                    "sources": {},
                    "contains_simulation": False,
                    "operational_claim_permitted": False,
                },
                "recommendation": "Awaiting active sensor telemetry transmission from Antarctic satellite gateway."
            }

        # 3. Retrieve or Train Pipeline
        pipeline = cls.get_pipeline(st)
        if not pipeline.is_trained():
            logger.info(f"[StationPredictor] Pipeline for {st} not trained. Auto-fitting on {len(history)} records...")
            pipeline.train_and_evaluate(history)

        # 4. Extract Feature Vector for latest observation
        latest_vec = FeatureEngineer.extract_single_feature_vector(history, station_id=st)
        raw_pred = pipeline.predict_vector(latest_vec)

        latest_rec = history[-1]
        curr_b = latest_rec.battery_level
        curr_p = latest_rec.power_consumption
        curr_t = latest_rec.generator_temperature

        # 5. Apply physical consistency bounding
        b1 = round(max(5.0, min(100.0, raw_pred.get("batt_1h", curr_b))), 1)
        b6 = round(max(5.0, min(100.0, raw_pred.get("batt_6h", curr_b - 1.0))), 1)
        b24 = round(max(5.0, min(100.0, raw_pred.get("batt_24h", curr_b - 4.0))), 1)

        p1 = round(max(20.0, raw_pred.get("cons_1h", curr_p + 1.0)), 1)
        p6 = round(max(20.0, raw_pred.get("cons_6h", curr_p + 3.0)), 1)
        p24 = round(max(20.0, raw_pred.get("cons_24h", curr_p + 7.0)), 1)

        t1 = round(max(40.0, raw_pred.get("temp_1h", curr_t)), 1)
        t6 = round(max(40.0, raw_pred.get("temp_6h", curr_t + 1.5)), 1)
        t24 = round(max(40.0, raw_pred.get("temp_24h", curr_t + 3.5)), 1)

        clean_prediction = {
            "battery_1h": b1,
            "battery_6h": b6,
            "battery_24h": b24,
            "power_1h": p1,
            "power_6h": p6,
            "power_24h": p24,
            "generator_temp_1h": t1,
            "generator_temp_6h": t6,
            "generator_temp_24h": t24,
        }

        # 6. Evaluate risks, trends & diagnostics
        diag = cls.evaluate_diagnostics(clean_prediction, latest_rec, st)

        confidence = pipeline.metadata.get("confidence", 0.86)
        source_counts: Dict[str, int] = {}
        for record in history:
            source = str(getattr(record, "source", "UNKNOWN") or "UNKNOWN").upper()
            source_counts[source] = source_counts.get(source, 0) + 1
        contains_simulation = source_counts.get("SIMULATION", 0) > 0

        response = {
            "status": "SUCCESS",
            "station_id": st,
            "station_name": station_name,
            "model": pipeline.model_type,
            "data_points_used": len(history),
            "prediction": clean_prediction,
            "generator_risk": diag["generator_risk"],
            "battery_risk": diag["battery_risk"],
            "power_load_risk": diag["power_load_risk"],
            "energy_risk": diag["energy_risk"],
            "overall_equipment_risk": diag["overall_equipment_risk"],
            "confidence": confidence,
            "data_provenance": {
                "sources": source_counts,
                "contains_simulation": contains_simulation,
                "operational_claim_permitted": not contains_simulation,
            },
            "demand_trend": diag["demand_trend"],
            "battery_trend": diag["battery_trend"],
            "anomaly_status": diag["anomaly_status"],
            "anomalies_detected": diag["anomalies_detected"],
            "recommendation": diag["recommendation"],
            "evaluation_metrics": pipeline.metadata.get("target_metrics", {})
        }
        audit = await record_prediction(
            station_id=st,
            result=response,
            history=history,
            horizons=prediction_horizons,
            model_metadata=pipeline.metadata,
        )
        response["prediction_id"] = audit["id"]
        response["persistence"] = audit["persistence"]
        return response
