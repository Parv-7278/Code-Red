# ❄️ Digital Platform for Efficient Remote Management of Indian Antarctic Research Stations

> **Smart India Hackathon (SIH 2026) Prototype**  
> Simulating remote operations, low-bandwidth telemetry, and prioritized emergency alert handling for **Maitri** and **Bharati** research stations.

Production packaging and server deployment instructions are available in [DEPLOYMENT.md](DEPLOYMENT.md).

POLARIS DEV AUTHENTICATION ACCOUNTS

INDIA HQ
Email: bhavyadawar5791+polaris-hq@gmail.com
Password: Polaris-HQ!Demo#2026_A9
Role: india_operator
Station: All stations

MAITRI
Email: bhavyadawar5791+polaris-maitri@gmail.com
Password: Polaris-Maitri!Demo#2026_B7
Role: station_operator
Station: station-maitri

BHARATI
Email: bhavyadawar5791+polaris-bharati@gmail.com
Password: Polaris-Bharati!Demo#2026_C4
Role: station_operator
Station: station-bharati

---

## 🧭 System Architecture & Flow

```
Antarctic Station Simulator (Python)
        │ (Telemetry & Emergency Injection)
        ▼
Node.js + Express Backend
        │
        ▼
Priority Queue & Communication Simulator
        │ (Emergency alerts preempt buffer; Normal packets rate-limited)
        ▼
Latency Measurement Engine
        │ (Calculates Queue Delay + Propagation Delay + Total Latency)
        ▼
Supabase Database (PostgreSQL)
        │
        ▼
React India Mission Control Dashboard (Vite + WebSockets)
```

---

## 📁 Clean Modular Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.js             # Supabase client with graceful local fallback
│   │   ├── controllers/
│   │   │   ├── alertController.js      # Alert ingestion and acknowledgment
│   │   │   ├── simulatorController.js  # Emergency scenario triggers
│   │   │   └── telemetryController.js  # Telemetry endpoints & queue metrics
│   │   ├── queue/
│   │   │   ├── PriorityQueue.js        # Priority queue data structure
│   │   │   └── satelliteLink.js        # Sat-link throughput & latency measurement
│   │   ├── routes/
│   │   │   ├── alertRoutes.js          # /api/alerts
│   │   │   ├── simulatorRoutes.js      # /api/simulator
│   │   │   └── telemetryRoutes.js      # /api/telemetry
│   │   ├── services/
│   │   │   ├── alertService.js         # Prioritized alert dispatch logic
│   │   │   └── telemetryService.js     # Sensor data processing & caching
│   │   └── server.js                   # Express server & Socket.IO broadcaster
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AlertFeed.jsx           # Incident feed with priority badges & ack
│   │   │   ├── Header.jsx              # Mission Control status bar
│   │   │   ├── LatencyChart.jsx        # Queue delay & latency comparison monitor
│   │   │   ├── MetricCard.jsx          # Sensor reading card with threshold styling
│   │   │   ├── ScenarioControl.jsx     # Inject scenarios (Generator Overheat, Blizzard)
│   │   │   ├── StationSelector.jsx     # Switch between Maitri and Bharati stations
│   │   │   └── TelemetryGrid.jsx       # Real-time sensor metrics grid
│   │   ├── context/
│   │   │   └── TelemetryContext.jsx    # Live state & WebSocket listener
│   │   ├── services/
│   │   │   ├── api.js                  # Backend REST API client
│   │   │   └── supabaseClient.js       # Optional client-side Supabase setup
│   │   ├── App.css                     # Mission control component styling
│   │   ├── App.jsx                     # Main layout
│   │   ├── index.css                   # Arctic dark theme, typography & utilities
│   │   └── main.jsx                    # React entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
│
├── simulator/
│   ├── config.py                       # Station coordinates and baseline parameters
│   ├── sensors.py                      # Realistic sensor stochastic drift model
│   ├── scenarios.py                    # Generator thermal runaway & blizzard tests
│   ├── simulator.py                    # Main simulation runner & CLI dispatch loop
│   ├── requirements.txt
│   └── README.md
│
├── database/
│   ├── schema.sql                      # Supabase PostgreSQL schema definition
│   └── seed.sql                        # Initial station seed data
│
├── .gitignore
└── README.md
```

---

## ⚡ Quick Start Guide

### 1. Database (Supabase)
Execute `database/schema.sql` followed by `database/seed.sql` in your Supabase SQL editor.
If Supabase credentials are not provided, the APIs use an in-memory simulated store and the frontend displays a simulation-prototype banner.

### 2. Configure local environment
```bash
copy backend\.env.example backend\.env
copy fastapi_backend\.env.example fastapi_backend\.env
copy frontend\.env.example frontend\.env
```

Keep `DEMO_MODE=true` only for local demonstrations. Header-based demo roles are disabled when the Node API runs with `NODE_ENV=production`.

For a configured deployment, set `DEMO_MODE=false`, provide the Supabase URL and service-role key to both backends, provide the Supabase URL and publishable key to the frontend, and use the same strong `DEVICE_INGEST_API_KEY` in the backends and station simulator. Operator API calls then use verified Supabase bearer tokens and server-controlled `user_profiles` roles.

Apply `database/schema.sql` before disabling demo mode. It now includes energy telemetry, persistent remote-operation audit records, alert event IDs, indexes, and row-level security policies.

### 3. Install and start the complete application
```bash
npm install
pip install -r fastapi_backend/requirements.txt
npm run dev
```

This starts the Node API on `http://localhost:5000`, FastAPI/ML on `http://localhost:8000`, the React dashboard on `http://localhost:3000`, and the live station telemetry simulator.

Run `npm run check` before a demonstration to execute the queue verification and production frontend build.

### 4. Optional station sensor simulator (Python)
```bash
cd simulator
pip install -r requirements.txt

# Start normal background telemetry stream
python simulator.py

# Or trigger the Generator Thermal Runaway scenario (70°C → 78°C → 85°C → 92°C → 95°C)
python simulator.py --scenario generator_overheat --station station-maitri
```

---

## ⚠️ Important Simulation Disclaimer
- This project is a **software simulation prototype** created for SIH 2026.
- Latency and queueing delay values are measured directly by the **Satellite Link Simulator** module to demonstrate the algorithmic advantages of priority queueing under constrained satellite links.
