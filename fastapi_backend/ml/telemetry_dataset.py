"""
Telemetry Dataset and Ingestion Engine for POLARIS ML Pipeline.
Handles raw telemetry normalization, type conversion, validation, and historical time-series retrieval.
"""

import math
import random
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field
from config import settings

logger = logging.getLogger("polaris.ml.dataset")

MIN_SAMPLES_FOR_TRAINING = 20
MIN_SAMPLES_FOR_INFERENCE = 4

class TelemetryRecord(BaseModel):
    """Normalized telemetry observation for an Antarctic station."""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    station_id: str = Field(default="maitri", description="Station identifier ('maitri', 'bharati')")
    battery_level: float = Field(default=75.0, description="Battery state of charge percentage (0 - 100%)")
    power_consumption: float = Field(default=105.0, description="Total active microgrid power load in kW")
    energy_generation: float = Field(default=132.0, description="Total electrical generation in kW")
    generator_temperature: float = Field(default=74.0, description="Primary generator core temperature in °C")
    generator_status: str = Field(default="RUNNING", description="'RUNNING', 'STANDBY', 'OVERHEAT', 'FAULT'")
    ambient_temperature: float = Field(default=-18.5, description="External ambient temperature in °C")
    wind_speed: float = Field(default=28.0, description="Wind speed in km/h")
    humidity: float = Field(default=68.0, description="Relative humidity percentage (0 - 100%)")
    voltage: Optional[float] = Field(default=415.0, description="3-phase bus voltage in V")
    current: Optional[float] = Field(default=180.0, description="Primary generator bus current in A")
    surplus: Optional[float] = Field(default=None, description="Net power surplus (Gen - Cons) in kW")
    source: str = Field(default="UNKNOWN", description="SENSOR, MANUAL_TEST, EXTERNAL_REFERENCE, or SIMULATION")
    quality_status: str = Field(default="VALID", description="Telemetry quality classification")

    @classmethod
    def from_dict(cls, raw: Dict[str, Any], default_station: str = "maitri") -> "TelemetryRecord":
        """Flexible parser converting database rows or raw Python dicts into TelemetryRecord."""
        # Parse timestamp
        raw_ts = raw.get("timestamp") or raw.get("recorded_at") or raw.get("created_at")
        if isinstance(raw_ts, str):
            try:
                ts = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
            except Exception:
                ts = datetime.utcnow()
        elif isinstance(raw_ts, datetime):
            ts = raw_ts
        else:
            ts = datetime.utcnow()

        # Parse station_id
        raw_st = str(raw.get("station_id", default_station)).lower()
        station_id = "bharati" if "bharati" in raw_st or raw_st == "2" else "maitri"

        # Parse battery
        battery = float(
            raw.get("battery_level")
            if raw.get("battery_level") is not None
            else raw.get("battery_charge_pct", raw.get("battery", 75.0))
        )

        # Parse power consumption
        consumption = float(
            raw.get("power_consumption")
            if raw.get("power_consumption") is not None
            else raw.get("total_consumption", raw.get("consumption", 105.0))
        )

        # Parse generation
        generation = float(
            raw.get("energy_generation")
            if raw.get("energy_generation") is not None
            else raw.get("total_generation", raw.get("generation", 132.0))
        )

        # Parse surplus
        surplus = raw.get("surplus")
        if surplus is None:
            surplus = round(generation - consumption, 2)
        else:
            surplus = float(surplus)

        # Parse generator temperature
        gen_temp = raw.get("generator_temperature") or raw.get("gen_temp")
        if gen_temp is None:
            # Physical thermal estimation if not directly logged
            is_bh = station_id == "bharati"
            base_temp = 68.0 if is_bh else 74.0
            load_factor = consumption / (190.0 if is_bh else 135.0)
            gen_temp = round(base_temp + (load_factor * 12.0), 2)
        else:
            gen_temp = float(gen_temp)

        gen_status = str(raw.get("generator_status", "RUNNING")).upper()
        if gen_status not in ["RUNNING", "STANDBY", "OVERHEAT", "FAULT"]:
            gen_status = "RUNNING"

        ambient_temp = float(raw.get("ambient_temperature", raw.get("temperature", -18.5)))
        wind_speed = float(raw.get("wind_speed", 28.0))
        humidity = float(raw.get("humidity", 68.0))
        voltage = float(raw.get("voltage", 415.0))
        current = float(raw.get("current", 180.0))

        return cls(
            timestamp=ts,
            station_id=station_id,
            battery_level=round(battery, 2),
            power_consumption=round(consumption, 2),
            energy_generation=round(generation, 2),
            generator_temperature=round(gen_temp, 2),
            generator_status=gen_status,
            ambient_temperature=round(ambient_temp, 2),
            wind_speed=round(wind_speed, 2),
            humidity=round(humidity, 2),
            voltage=round(voltage, 1),
            current=round(current, 1),
            surplus=round(surplus, 2),
            source=str(raw.get("source", "UNKNOWN")).upper(),
            quality_status=str(raw.get("quality_status", "VALID")).upper(),
        )


class TelemetryDataset:
    """Manages telemetry datasets, synthetic telemetry generation, and historical querying."""

    @staticmethod
    def normalize_station_id(station_id: Union[str, int]) -> str:
        """Returns canonical station slug: 'maitri' or 'bharati'."""
        s = str(station_id).lower().strip()
        if "bharati" in s or s == "2":
            return "bharati"
        return "maitri"

    @classmethod
    def generate_realistic_telemetry(
        cls,
        station_id: str = "maitri",
        num_records: int = 168,
        interval_hours: float = 1.0,
        inject_anomaly: bool = False
    ) -> List[TelemetryRecord]:
        """
        Generates realistic Antarctic microgrid physics telemetry time-series:
        - Diurnal solar cycles & base camp power rhythms (08:00 - 20:00 peak)
        - Katabatic wind surges driving wind turbine yield
        - Generator core thermal inertia and resistive heating
        - Battery state of charge differential equations
        """
        st = cls.normalize_station_id(station_id)
        is_bharati = (st == "bharati")

        base_gen = 185.0 if is_bharati else 132.0
        base_cons = 148.0 if is_bharati else 105.0
        base_batt = 88.0 if is_bharati else 78.0
        base_temp = 68.0 if is_bharati else 74.0

        now = datetime.utcnow()
        records: List[TelemetryRecord] = []

        batt = base_batt
        gen_temp = base_temp

        for i in range(num_records, 0, -1):
            ts = now - timedelta(hours=i * interval_hours)
            hour = ts.hour + ts.minute / 60.0

            # Diurnal consumption curve (higher daytime science/habitat loads)
            diurnal_load = math.sin((hour - 6) * math.pi / 12) * (12.0 if is_bharati else 8.0)
            cons = round(base_cons + diurnal_load + random.uniform(-3.5, 4.0), 2)

            # Solar generation pattern during daylight window
            solar_yield = max(0.0, math.sin((hour - 4) * math.pi / 14)) * (26.0 if is_bharati else 14.0)
            # Wind generation with gust variability
            wind_speed = round(max(5.0, 24.0 + math.sin(i * 0.15) * 12.0 + random.uniform(-4.0, 5.0)), 1)
            wind_yield = round((wind_speed / 40.0) * (18.0 if is_bharati else 10.0), 2)
            gen = round(base_gen + solar_yield + wind_yield + random.uniform(-2.5, 3.0), 2)

            # Anomaly injection for testing
            if inject_anomaly and i < 8:
                cons += 35.0  # Sudden load spike
                gen_temp += 16.0  # Overheating
                gen_status = "OVERHEAT"
            else:
                gen_status = "RUNNING"

            surplus = round(gen - cons, 2)

            # Battery SOC integration
            batt_delta = (surplus / (60.0 if is_bharati else 40.0)) * 0.5
            batt = round(max(30.0, min(99.0, batt + batt_delta + random.uniform(-0.4, 0.4))), 2)

            # Generator thermal accumulation
            load_factor = cons / (190.0 if is_bharati else 135.0)
            ambient_temp = round(-22.0 + math.sin(hour * math.pi / 12) * 5.0 + random.uniform(-1.0, 1.0), 1)
            target_gen_temp = base_temp + (load_factor * 14.0) - (ambient_temp * 0.1)
            gen_temp = round(gen_temp * 0.85 + target_gen_temp * 0.15 + random.uniform(-0.3, 0.3), 2)

            records.append(TelemetryRecord(
                timestamp=ts,
                station_id=st,
                battery_level=batt,
                power_consumption=cons,
                energy_generation=gen,
                generator_temperature=gen_temp,
                generator_status=gen_status,
                ambient_temperature=ambient_temp,
                wind_speed=wind_speed,
                humidity=round(random.uniform(62.0, 75.0), 1),
                voltage=415.0 if not is_bharati else 400.0,
                current=round(cons * 1.6, 1),
                surplus=surplus,
                source="SIMULATION",
                quality_status="VALID",
            ))

        return records

    @classmethod
    async def load_telemetry_for_station(
        cls,
        station_id: str,
        limit: int = 300,
        fallback_if_empty: Optional[bool] = None
    ) -> List[TelemetryRecord]:
        """
        Loads chronological telemetry for a station from Supabase (or fallback generator).
        Filters strictly by target station to maintain separate models for Maitri & Bharati.
        """
        st = cls.normalize_station_id(station_id)
        allow_synthetic = settings.ALLOW_SYNTHETIC_ML if fallback_if_empty is None else fallback_if_empty
        records: List[TelemetryRecord] = []

        try:
            from services.supabase_client import fetch_energy_telemetry_db, fetch_station_telemetry_db
            db_station_id = 2 if st == "bharati" else 1

            # 1. Fetch from energy_telemetry table
            raw_energy = await fetch_energy_telemetry_db(db_station_id, limit=limit)
            if raw_energy:
                for r in raw_energy:
                    records.append(TelemetryRecord.from_dict(r, default_station=st))

            # 2. Fetch from telemetry_logs table if energy_telemetry is small
            if len(records) < MIN_SAMPLES_FOR_TRAINING:
                raw_logs = await fetch_station_telemetry_db(f"station-{st}", limit=limit)
                for r in raw_logs:
                    records.append(TelemetryRecord.from_dict(r, default_station=st))

        except Exception as e:
            logger.warning(f"[TelemetryDataset] Database retrieval notice for {st}: {e}")

        # Ensure chronological ordering (oldest to newest)
        records.sort(key=lambda r: r.timestamp)

        # Fallback to rich physical simulator if database has insufficient data
        if len(records) < MIN_SAMPLES_FOR_TRAINING and allow_synthetic:
            logger.warning(f"[TelemetryDataset] Replacing {len(records)} records with an explicitly simulated baseline for {st}.")
            sim_records = cls.generate_realistic_telemetry(station_id=st, num_records=168)
            records = sim_records

        return records
