# POLARIS deployment guide

The repository now ships as a single Docker Compose application. Only the web gateway is exposed publicly; the Node API, FastAPI prediction service and optional telemetry simulator communicate on Docker's private network.

## Deployment layout

| Service | Purpose | Public route |
| --- | --- | --- |
| `frontend` | React production build and Nginx gateway | `/` |
| `backend` | Station APIs, reports, priority queue and Socket.IO | `/backend/*` |
| `ml` | FastAPI prediction, what-if and research analysis | `/ml/*` |
| `simulator` | Generates Maitri and Bharati telemetry | private worker |

This same-origin layout avoids mixed-content and cross-origin failures after HTTPS is enabled.

## 1. Prerequisites

- A Linux VM or hosting service with Docker Engine 24+ and Docker Compose v2.
- At least 2 GB RAM for the Python/scikit-learn image; 4 GB is safer for builds.
- A domain name is recommended for HTTPS, but an IP address is enough for an internal demo.

## 2. Configure the deployment

From the repository root:

```bash
cp .env.deploy.example .env
```

Edit `.env` and set:

- `PUBLIC_ORIGIN` to the exact URL users will open, such as `https://polaris.example.org`.
- `APP_PORT=80` when the container should listen directly on HTTP port 80. Keep `8080` when a load balancer or TLS reverse proxy sits in front.
- `DEVICE_INGEST_API_KEY` to a random value of at least 32 characters.
- Keep `DEMO_MODE=false` and `VITE_DATA_MODE=CONNECTED` for the authenticated Supabase environment. These are the deployment defaults.
- Configure Supabase, run `database/schema.sql`, `database/seed.sql`, and the files in `database/migrations/`, then provide the service-role secret only through the hosting provider's secret manager.
- Use `DEMO_MODE=true` only for a deliberately isolated, non-production demo without real operator authentication.
- `GEMINI_API_KEY` is optional. Deterministic forecasts and what-if simulations work without it.

Do not commit the generated `.env` file.

## 3. Build and start

For the complete SIH demo, including continuously changing telemetry committed through the authenticated device-ingestion path:

```bash
docker compose --profile simulation up -d --build
```

For a configured deployment receiving real external telemetry, omit the simulator:

```bash
docker compose up -d --build
```

Check health and logs:

```bash
docker compose ps
docker compose logs -f --tail=100 frontend backend ml simulator
```

Open `http://SERVER_IP:APP_PORT`. Health endpoints are available at:

- `/healthz` — web gateway
- `/backend/api/health` — Node API
- `/ml/api/health` — FastAPI service

## 4. Add HTTPS

In production, terminate TLS at the cloud load balancer or a reverse proxy such as Caddy/Nginx. Forward the public domain to the Compose frontend port and set `PUBLIC_ORIGIN` to the final `https://` origin. No browser API URLs need to be changed because all traffic is routed through the same domain.

Never expose ports 5000 or 8000 directly to the internet. The Compose file intentionally uses `expose` instead of `ports` for those services.

## 5. Updating the deployed application

```bash
git pull
docker compose --profile simulation up -d --build --remove-orphans
docker image prune -f
```

To roll back, check out the previous known-good commit and run the same Compose command again.

## 6. Provider mapping

If the platform supports Docker Compose, deploy `compose.yaml` directly. If it requires separate services, create:

1. one public web service from `deploy/frontend.Dockerfile`;
2. one private Node service from `deploy/backend.Dockerfile`;
3. one private Python service from `deploy/fastapi.Dockerfile`;
4. one optional background worker from `deploy/simulator.Dockerfile`.

The frontend gateway must be able to resolve the private service names `backend` and `ml`. If the provider assigns different internal hostnames, update `deploy/nginx.conf` accordingly.

The existing `vercel.json` is suitable only for a frontend preview. Vercel by itself will not run this repository's persistent Node Socket.IO process, FastAPI service and telemetry worker. Use the Docker stack for the complete application, or deploy those services separately and replace the Nginx upstreams with their hosted URLs.

For the checked-in Render Blueprint, service sizing, secret-entry map and cutover procedure, see [`RENDER_DEPLOYMENT.md`](RENDER_DEPLOYMENT.md). The Blueprint keeps the Node and FastAPI services private and exposes them through a single HTTPS Nginx gateway.

## 7. Pre-launch checklist

- `PUBLIC_ORIGIN` exactly matches the deployed URL.
- Secrets are stored in the provider, not Git.
- The three health URLs return successful responses.
- Maitri and Bharati telemetry values update at least every few seconds when the simulation profile is active.
- What-if predictions identify `SUPABASE_COMMITTED_TELEMETRY` as their source and create a row in `predictions`.
- The combined 12-hour report, HQ delivery record, and 12-hour schedule are present in Supabase.
- A what-if run changes both forecast text and its graph.
- Report JSON/PDF download and print preview work.
- The station-role access checks are tested before setting `DEMO_MODE=false`.
- Firewall permits only SSH and the public HTTP/HTTPS ports.

## Important architecture note

In demo mode, live telemetry and some report scheduling state are in memory. Restarting containers clears that state. The connected deployment defaults require Supabase for durable telemetry, prediction audits, reports, schedules, and verified user authentication.
