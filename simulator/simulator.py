import os
import sys
import argparse
import time
import json
import urllib.request
import urllib.error

# Fix Windows console UTF-8 UnicodeEncodeError
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Ensure simulator directory is in sys.path regardless of working directory
_SIMULATOR_DIR = os.path.dirname(os.path.abspath(__file__))
if _SIMULATOR_DIR not in sys.path:
    sys.path.insert(0, _SIMULATOR_DIR)

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

from config import STATIONS, TELEMETRY_ENDPOINT, ALERT_ENDPOINT, TELEMETRY_INTERVAL_SECONDS
from sensors import StationSensorModel
from scenarios import run_generator_thermal_runaway, run_blizzard_warning

DEVICE_INGEST_API_KEY = os.getenv("DEVICE_INGEST_API_KEY", "")

def _ingest_headers():
    headers = {'Content-Type': 'application/json'}
    if DEVICE_INGEST_API_KEY:
        headers['x-device-api-key'] = DEVICE_INGEST_API_KEY
    return headers

def _http_post(url, payload):
    """Resilient HTTP POST supporting both requests and urllib standard library."""
    if HAS_REQUESTS:
        try:
            res = requests.post(url, json=payload, headers=_ingest_headers(), timeout=2.0)
            return res.status_code, res.text
        except Exception:
            pass

    # Fallback to urllib.request
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers=_ingest_headers(),
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=2.0) as res:
            return res.status, res.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')
    except Exception as e:
        return 0, str(e)

def send_telemetry(payload):
    st_name = "MAITRI" if "maitri" in payload.get('station_id', '') else "BHARATI"
    temp = payload.get('temperature', 0)
    gen_temp = payload.get('generator_temperature', 0)
    batt = payload.get('battery_level') or payload.get('battery') or 0

    endpoints_to_try = [
        TELEMETRY_ENDPOINT,
        "http://localhost:5000/api/telemetry",
        "http://localhost:5000/api/sensor-data",
        "http://localhost:8000/api/telemetry",
    ]
    # Remove duplicate endpoints preserving order
    seen = set()
    endpoints = [x for x in endpoints_to_try if not (x in seen or seen.add(x))]

    for endpoint in endpoints:
        status_code, text = _http_post(endpoint, payload)
        if status_code in [200, 201, 202]:
            print(f"[SIMULATOR] Station: {st_name} | Temp: {temp}°C | Gen: {gen_temp}°C | Battery: {batt}% | Status: {status_code} OK (-> {endpoint})", flush=True)
            return
    
    print(f"[SIMULATOR ERROR] Connection failed for {st_name} to endpoints: {endpoints}", flush=True)

def send_alert(payload):
    st_name = "MAITRI" if "maitri" in payload.get('station_id', '') else "BHARATI"
    endpoints_to_try = [
        ALERT_ENDPOINT,
        "http://localhost:5000/api/alerts",
        "http://localhost:8000/api/alerts",
    ]
    seen = set()
    endpoints = [x for x in endpoints_to_try if not (x in seen or seen.add(x))]

    for endpoint in endpoints:
        status_code, text = _http_post(endpoint, payload)
        if status_code in [200, 201, 202]:
            print(f"[SIMULATOR ALERT] 🚨 {st_name} PRIORITY ALERT DISPATCHED: {payload.get('priority')} -> {payload.get('message')}", flush=True)
            return

    print(f"[SIMULATOR ERROR] Alert dispatch failed to endpoints: {endpoints}", flush=True)

def main():
    parser = argparse.ArgumentParser(description="Antarctic Research Station Sensor Simulator")
    parser.add_argument("--scenario", choices=["generator_overheat", "blizzard", "none"], default="none",
                        help="Trigger a specific emergency scenario immediately")
    parser.add_argument("--station", choices=["station-maitri", "station-bharati"], default="station-maitri",
                        help="Target station for scenario")
    parser.add_argument("--interval", type=float, default=TELEMETRY_INTERVAL_SECONDS,
                        help="Telemetry interval in seconds")
    args = parser.parse_args()

    # Initialize sensor models for all stations
    station_models = {
        s_id: StationSensorModel(s_id, s_meta)
        for s_id, s_meta in STATIONS.items()
    }

    print("==================================================================", flush=True)
    print("🏔️  [SIMULATOR] Starting POLARIS Station Telemetry Simulator", flush=True)
    print(f"📡 Target Endpoint: {TELEMETRY_ENDPOINT}", flush=True)
    print(f"🚨 Alert Endpoint:  {ALERT_ENDPOINT}", flush=True)
    print("==================================================================", flush=True)

    # If a specific scenario is requested
    if args.scenario == "generator_overheat":
        target_model = station_models[args.station]
        run_generator_thermal_runaway(target_model, send_telemetry, send_alert)
        return
    elif args.scenario == "blizzard":
        target_model = station_models[args.station]
        run_blizzard_warning(target_model, send_telemetry, send_alert)
        return

    # Continuous background telemetry loop
    print("\n▶️  [SIMULATOR] Starting normal multi-station telemetry loop...\n", flush=True)
    try:
        step_count = 0
        while True:
            step_count += 1
            for station_id, model in station_models.items():
                telemetry = model.step_normal_drift()
                send_telemetry(telemetry)

            time.sleep(args.interval)

    except KeyboardInterrupt:
        print("\n⏹️ [SIMULATOR] Stopped by operator.", flush=True)
        sys.exit(0)

if __name__ == "__main__":
    main()
