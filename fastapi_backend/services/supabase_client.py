import logging
from typing import Optional, Any, Dict, List
from config import settings

logger = logging.getLogger("polaris.supabase")

_supabase_client = None

def get_supabase_client():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url = settings.SUPABASE_URL
    # Server-side writes should prefer the service-role credential when one is
    # explicitly configured. The publishable key remains a read-only fallback.
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY

    if url and key and "your-project" not in url:
        try:
            from supabase import create_client, Client
            _supabase_client = create_client(url, key)
            logger.info("[Supabase] Connected to Supabase PostgreSQL at %s", url)
            return _supabase_client
        except Exception as e:
            logger.warning("[Supabase] Failed to initialize Supabase client: %s. Using local memory fallback.", e)
            _supabase_client = None
            return None
    else:
        logger.info("[Supabase] Running in local in-memory simulated mode (No valid credentials provided).")
        return None

def is_supabase_configured() -> bool:
    return get_supabase_client() is not None

async def check_supabase_connection() -> Dict[str, Any]:
    client = get_supabase_client()
    if not client:
        return {"ready": False, "status": "NOT_CONFIGURED"}
    try:
        client.table("stations").select("id").limit(1).execute()
        return {"ready": True, "status": "READY"}
    except Exception as err:
        logger.error("[Supabase] Readiness query failed: %s", err)
        return {"ready": False, "status": f"ERROR: {err}"}

async def fetch_station_telemetry_db(station_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    client = get_supabase_client()
    if not client:
        return []
    try:
        response = client.table("telemetry_logs") \
            .select("*") \
            .eq("station_id", station_id) \
            .order("recorded_at", desc=True) \
            .limit(limit) \
            .execute()
        return response.data or []
    except Exception as err:
        logger.error("[Supabase] Query error for telemetry_logs: %s", err)
        return []

async def fetch_station_alerts_db(station_id: str, status: Optional[str] = "ACTIVE") -> List[Dict[str, Any]]:
    client = get_supabase_client()
    if not client:
        return []
    try:
        query = client.table("alerts").select("*").eq("station_id", station_id)
        if status:
            query = query.eq("status", status)
        response = query.order("triggered_at", desc=True).execute()
        return response.data or []
    except Exception as err:
        logger.error("[Supabase] Query error for alerts: %s", err)
        return []

async def insert_telemetry_log_db(payload: Dict[str, Any]) -> bool:
    client = get_supabase_client()
    if not client:
        return False
    try:
        response = client.table("telemetry_logs").insert([payload]).execute()
        return bool(response.data)
    except Exception as err:
        logger.error("[Supabase] Insert error for telemetry_logs: %s", err)
        return False

def normalize_station_db_id(station_id: Any) -> int:
    """Map string station IDs ('maitri', 'station-maitri', 1) to integer DB IDs (1: Maitri, 2: Bharati)."""
    s_str = str(station_id).lower()
    if "bharati" in s_str or s_str == "2":
        return 2
    return 1

async def fetch_energy_telemetry_db(station_id: Any, limit: int = 500) -> List[Dict[str, Any]]:
    """Retrieve historical energy telemetry records for station from Supabase."""
    client = get_supabase_client()
    if not client:
        return []
    db_station_id = normalize_station_db_id(station_id)
    try:
        response = client.table("energy_telemetry") \
            .select("*") \
            .eq("station_id", db_station_id) \
            .order("recorded_at", desc=False) \
            .limit(limit) \
            .execute()
        return response.data or []
    except Exception as err:
        logger.error("[Supabase] Query error for energy_telemetry: %s", err)
        return []

async def insert_energy_telemetry_db(payload: Dict[str, Any]) -> bool:
    """Insert a single energy telemetry record into Supabase energy_telemetry table."""
    client = get_supabase_client()
    if not client:
        return False
    try:
        # Ensure station_id is integer
        st_id = normalize_station_db_id(payload.get("station_id", 1))
        db_record = {
            "station_id": st_id,
            "total_generation": float(payload.get("total_generation", payload.get("generation", 132.0))),
            "battery_charge_pct": float(payload.get("battery_charge_pct", payload.get("battery_level", payload.get("battery", 74.0)))),
            "total_consumption": float(payload.get("total_consumption", payload.get("consumption", payload.get("power_consumption", 105.0)))),
            "surplus": float(payload.get("surplus", 27.0))
        }
        if "recorded_at" in payload:
            db_record["recorded_at"] = payload["recorded_at"]
        response = client.table("energy_telemetry").insert([db_record]).execute()
        return bool(response.data)
    except Exception as err:
        logger.warning("[Supabase] Insert error for energy_telemetry: %s", err)
        return False

async def seed_historical_energy_telemetry_if_needed(target_count: int = 168) -> None:
    """
    Ensures that both Maitri (station_id=1) and Bharati (station_id=2) have a rich historical
    telemetry time series (e.g. 7 days / 168 hours of sequential hourly data) in Supabase.
    Generates realistic Antarctic microgrid physics with diurnal patterns, wind surges,
    and realistic generator thermal & load cycles.
    """
    client = get_supabase_client()
    if not client:
        return

    import random
    import math
    from datetime import datetime, timedelta

    for st_id, name in [(1, "Maitri"), (2, "Bharati")]:
        try:
            res = client.table("energy_telemetry").select("id", count="exact").eq("station_id", st_id).execute()
            current_count = res.count if res.count is not None else len(res.data or [])
            if current_count >= target_count:
                logger.info(f"[Supabase] Station {name} already has {current_count} historical energy records.")
                continue

            needed = target_count - current_count
            logger.info(f"[Supabase] Seeding {needed} historical energy telemetry records for {name}...")
            
            is_bharati = (st_id == 2)
            base_gen = 185.0 if is_bharati else 132.0
            base_cons = 148.0 if is_bharati else 105.0
            base_batt = 88.0 if is_bharati else 78.0

            now = datetime.utcnow()
            batch = []
            
            # Step backward in 1-hour increments
            for i in range(needed, 0, -1):
                rec_time = now - timedelta(hours=i)
                hour = rec_time.hour
                
                # Diurnal load modulation (higher during base activity 08:00 - 20:00 UTC)
                diurnal = math.sin((hour - 6) * math.pi / 12) * 8.0
                cons = round(base_cons + diurnal + random.uniform(-4.0, 5.0), 2)
                
                # Solar & wind generation variance
                solar_var = max(0.0, math.sin((hour - 4) * math.pi / 14)) * (25.0 if is_bharati else 14.0)
                gen = round(base_gen + solar_var + random.uniform(-3.0, 4.0), 2)
                surplus = round(gen - cons, 2)
                
                # Battery state walks smoothly with net surplus
                batt_drift = (surplus / (50.0 if is_bharati else 35.0)) * 0.4
                batt = round(max(45.0, min(98.0, base_batt + batt_drift + random.uniform(-1.5, 1.5))), 2)

                batch.append({
                    "station_id": st_id,
                    "total_generation": gen,
                    "battery_charge_pct": batt,
                    "total_consumption": cons,
                    "surplus": surplus,
                    "recorded_at": rec_time.isoformat()
                })

                # Insert in chunks of 50 to respect postgrest payload limits
                if len(batch) >= 50:
                    client.table("energy_telemetry").insert(batch).execute()
                    batch = []

            if batch:
                client.table("energy_telemetry").insert(batch).execute()

            logger.info(f"[Supabase] Successfully seeded historical telemetry for {name}.")
        except Exception as e:
            logger.warning(f"[Supabase] Historical seeding notice for {name}: {e}")

