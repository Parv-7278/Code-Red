"""Build ML what-if input history from committed operational telemetry."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

from ml.synthetic_telemetry import SyntheticTelemetryPoint
from services.supabase_client import fetch_station_telemetry_db


def _number(value: Any, fallback: float) -> float:
    try:
        parsed = float(value)
        return parsed if parsed == parsed else fallback
    except (TypeError, ValueError):
        return fallback


def _timestamp(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return datetime.now(timezone.utc)


def _first(raw: Dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if raw.get(key) is not None:
            return raw[key]
    return None


def _to_model_point(row: Dict[str, Any], imputed_fields: set[str]) -> SyntheticTelemetryPoint:
    raw = row.get("raw_payload") if isinstance(row.get("raw_payload"), dict) else {}
    demand = _number(row.get("power_consumption"), 0.0)

    generation_value = _first(raw, "power_generation", "active_power_generation", "generation_kw")
    if generation_value is None:
        generation_value = demand
        imputed_fields.add("power_generation")

    humidity_value = _first(raw, "humidity", "humidity_pct")
    if humidity_value is None:
        humidity_value = 65.0
        imputed_fields.add("humidity")

    reserve_value = _first(raw, "life_support_reserve", "life_support_reserve_pct")
    if reserve_value is None:
        reserve_value = row.get("water_level")
        imputed_fields.add("life_support_reserve_from_water_level_proxy")

    fuel_value = _first(raw, "fuel_reserves_liters", "fuel_level_liters")
    if fuel_value is None:
        fuel_value = 50000.0
        imputed_fields.add("fuel_reserves_liters")

    voltage_value = _first(raw, "bus_voltage", "bus_voltage_v")
    if voltage_value is None:
        voltage_value = 415.0
        imputed_fields.add("bus_voltage")

    derate_value = _first(raw, "generator_capacity_derate", "generator_derate_pct")
    if derate_value is None:
        derate_value = 0.0
        imputed_fields.add("generator_capacity_derate")

    status = str(row.get("generator_status") or "RUNNING").upper()
    if status not in {"RUNNING", "DERATED", "WARNING", "OVERHEAT", "FAULT"}:
        status = "WARNING" if "WARN" in status else "RUNNING"

    return SyntheticTelemetryPoint(
        timestamp=_timestamp(row.get("recorded_at") or row.get("received_at")),
        station_id=str(row.get("station_id")),
        ambient_temperature=_number(row.get("temperature"), -25.0),
        wind_velocity=_number(row.get("wind_speed"), 0.0),
        humidity=_number(humidity_value, 65.0),
        power_generation=_number(generation_value, demand),
        power_consumption=demand,
        battery_level=_number(row.get("battery_level"), 50.0),
        generator_temperature=_number(row.get("generator_temperature"), 70.0),
        generator_status=status,
        generator_capacity_derate=_number(derate_value, 0.0),
        life_support_reserve=_number(reserve_value, 80.0),
        fuel_reserves_liters=_number(fuel_value, 50000.0),
        bus_voltage=_number(voltage_value, 415.0),
    )


async def load_committed_what_if_history(
    station_id: str,
    limit: int = 64,
) -> Tuple[List[SyntheticTelemetryPoint], Dict[str, Any]]:
    """Return chronological model points and transparent field provenance."""
    rows = await fetch_station_telemetry_db(station_id, limit=limit)
    if not rows:
        return [], {
            "telemetry": "UNAVAILABLE",
            "input_sample_count": 0,
            "imputed_fields": [],
        }

    imputed_fields: set[str] = set()
    points = [_to_model_point(row, imputed_fields) for row in reversed(rows)]
    points.sort(key=lambda point: point.timestamp)
    return points, {
        "telemetry": "SUPABASE_COMMITTED_TELEMETRY",
        "input_sample_count": len(points),
        "input_start": points[0].timestamp.isoformat(),
        "input_end": points[-1].timestamp.isoformat(),
        "observed_fields": [
            "temperature",
            "wind_speed",
            "power_consumption",
            "battery_level",
            "generator_temperature",
            "generator_status",
            "water_level",
        ],
        "imputed_fields": sorted(imputed_fields),
    }
