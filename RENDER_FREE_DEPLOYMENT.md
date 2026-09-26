# Render Free Demo Deployment

This deployment is designed for demos and hackathons. It runs the React frontend, Node API, FastAPI service, Nginx gateway and telemetry simulator in one free Render web service. Supabase remains the persistent database and authentication provider.

The production-oriented multi-service Blueprint remains available in `render.yaml`. Use `render.free.yaml` for the free demo deployment.

## Free-tier trade-offs

- The service sleeps after 15 minutes without inbound traffic.
- A cold start can take about one minute.
- The simulator pauses while the service sleeps and resumes after restart.
- All processes share 512 MB RAM and one service instance.
- The deployment is suitable for demonstrations, not production availability.

## Create the Blueprint

1. Open the Render workspace that has access to `Parv-7278/Code-Red`.
2. Select **New > Blueprint** and connect the repository.
3. Enter:

   - Blueprint name: `polaris-code-red-free`
   - Branch: `main`
   - Blueprint path: `render.free.yaml`

4. Confirm that Render shows exactly one web service named `polaris-code-red-5791-free` with the **Free** compute plan.
5. Enter the variables marked as secret:

   | Variable | Value |
   | --- | --- |
   | `SUPABASE_URL` | Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret |
   | `DEVICE_INGEST_API_KEY` | Existing 64-character device key |
   | `VITE_SUPABASE_URL` | Same Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase publishable/anon key |

6. Verify that the estimated compute cost is **$0/month** before applying the Blueprint.

Never put these secret values in Git, pull requests, screenshots, chat messages or documentation.

## Supabase URL configuration

After the first successful deployment, use the service URL in Supabase Authentication URL Configuration:

- Site URL: `https://polaris-code-red-5791-free.onrender.com`
- Redirect URL: `https://polaris-code-red-5791-free.onrender.com/**`

If Render changes the service name because it is unavailable, update `CORS_ORIGINS` in the Render service to the actual URL and redeploy.

## Verify

Open these URLs after the deployment reports **Live**:

```text
https://polaris-code-red-5791-free.onrender.com/healthz
https://polaris-code-red-5791-free.onrender.com/backend/api/health/live
https://polaris-code-red-5791-free.onrender.com/backend/api/health/ready
https://polaris-code-red-5791-free.onrender.com/ml/api/health/live
https://polaris-code-red-5791-free.onrender.com/ml/api/health/ready
```

Then sign in with each demo operator account and verify telemetry, alerts, predictions and report generation.
