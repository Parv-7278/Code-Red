import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from services.supabase_client import get_supabase_client

logger = logging.getLogger("polaris.prediction_repository")


class PredictionPersistenceError(RuntimeError):
    pass


def _station_id(station_id: str) -> str:
    return "station-bharati" if "bharati" in str(station_id).lower() else "station-maitri"


async def record_model_version(metadata: Dict[str, Any]) -> Dict[str, Any]:
    version = metadata.get("version") or metadata.get("trained_at") or datetime.now(timezone.utc).isoformat()
    registry_id = str(uuid4())
    client = get_supabase_client()
    if not client:
        return {"id": registry_id, "version": version, "persistence": "MEMORY_SIMULATION"}

    payload = {
        "id": registry_id,
        "station_id": _station_id(metadata.get("station_id", "maitri")),
        "model_name": "POLARIS_STATION_FORECAST",
        "version": version,
        "algorithm": metadata.get("model_type", "UNKNOWN"),
        "training_sample_count": metadata.get("raw_records_used", 0),
        "training_data_start": metadata.get("training_data_start"),
        "training_data_end": metadata.get("training_data_end"),
        "metrics": {
            "mean_r2": metadata.get("mean_r2"),
            "mean_mae": metadata.get("mean_mae"),
            "mean_rmse": metadata.get("mean_rmse"),
            "targets": metadata.get("target_metrics", {}),
        },
        "data_provenance": metadata.get("data_provenance", {}),
        "artifact_path": metadata.get("artifact_path"),
        "status": "ACTIVE",
        "trained_at": metadata.get("trained_at"),
    }
    try:
        response = client.table("model_versions").upsert(
            payload,
            on_conflict="station_id,version",
        ).execute()
        row = (response.data or [payload])[0]
        return {"id": row.get("id", registry_id), "version": version, "persistence": "SUPABASE"}
    except Exception as error:
        logger.error("Model registry write failed: %s", error)
        raise PredictionPersistenceError("The trained model could not be registered in Supabase.") from error


async def record_prediction(
    station_id: str,
    result: Dict[str, Any],
    history: List[Any],
    horizons: Optional[List[int]],
    model_metadata: Dict[str, Any],
) -> Dict[str, Any]:
    prediction_id = str(uuid4())
    timestamps = [record.timestamp for record in history if getattr(record, "timestamp", None)]
    payload = {
        "id": prediction_id,
        "station_id": _station_id(station_id),
        "model_name": model_metadata.get("model_type", "UNKNOWN"),
        "model_version": model_metadata.get("trained_at", "UNVERSIONED"),
        "horizons_hours": horizons or [1, 6, 24],
        "input_start": min(timestamps).isoformat() if timestamps else None,
        "input_end": max(timestamps).isoformat() if timestamps else None,
        "input_sample_count": len(history),
        "data_provenance": result.get("data_provenance", {}),
        "prediction_result": result.get("prediction", {}),
        "risk_summary": result.get("risk") or {
            "generator": result.get("generator_risk"),
            "battery": result.get("battery_risk"),
            "power": result.get("power_load_risk"),
            "overall": result.get("overall_equipment_risk"),
        },
        "confidence": result.get("confidence"),
        "status": "PREDICTED",
    }
    client = get_supabase_client()
    if not client:
        return {"id": prediction_id, "persistence": "MEMORY_SIMULATION"}
    try:
        response = client.table("predictions").insert(payload).execute()
        row = (response.data or [payload])[0]
        return {"id": row.get("id", prediction_id), "persistence": "SUPABASE"}
    except Exception as error:
        logger.error("Prediction audit write failed: %s", error)
        raise PredictionPersistenceError("The prediction could not be committed to Supabase.") from error
