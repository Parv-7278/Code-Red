# POLARIS deployment on Render

`render.yaml` deploys POLARIS as four services in Render's Singapore region:

| Render service | Type | Purpose | Public access |
| --- | --- | --- | --- |
| `polaris-code-red-5791-web` | Web service | React build and Nginx gateway | Yes |
| `polaris-code-red-5791-api` | Private service | Express APIs, reports and Socket.IO | Through `/backend/*` |
| `polaris-code-red-5791-ml` | Private service | FastAPI predictions and research analysis | Through `/ml/*` |
| `polaris-code-red-5791-simulator` | Background worker | Continuous Maitri and Bharati telemetry | No |

Only the Nginx gateway is public. The browser uses one HTTPS origin, while Nginx sends API, ML and Socket.IO requests over Render's private network.

## Cost check before creation

This Blueprint intentionally uses always-on paid compute because private services and background workers do not have free instances. The ML service uses `1c-2g` for Python, NumPy and scikit-learn; the other services use `0.5c-512mb`.

Render displays the estimated monthly cost before resource creation. Review it with the project owner before clicking **Apply**. Creating a Blueprint can create billable resources.

## 1. Prerequisites

Before connecting Render:

1. Merge the Render deployment pull request into the repository's default branch.
2. Confirm `database/schema.sql`, `database/seed.sql`, and `database/migrations/20260925_operational_telemetry.sql` have already been applied in Supabase.
3. Keep these values available in a password manager or local untracked file:
   - Supabase project URL
   - Supabase publishable/anon key
   - Supabase service-role secret
   - the existing 64-character device-ingestion key
4. Never paste secrets into GitHub files, pull requests, issues, screenshots or chat.

## 2. Create the Blueprint

The owner of the private GitHub repository should:

1. Sign in at <https://dashboard.render.com/> using GitHub.
2. Select **New** and then **Blueprint**.
3. Connect the repository containing this `render.yaml` file.
4. Select the default branch (`main`).
5. Keep the Blueprint file path as `render.yaml`.
6. Review all four services and the estimated cost before continuing.

Render prompts for every variable marked `sync: false`. Paste the values as follows:

| Service | Variable | Value to paste |
| --- | --- | --- |
| Web | `VITE_SUPABASE_URL` | Supabase project URL |
| Web | `VITE_SUPABASE_ANON_KEY` | Supabase publishable/anon key |
| API | `SUPABASE_URL` | Same Supabase project URL |
| API | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret |
| API | `DEVICE_INGEST_API_KEY` | Existing 64-character device key |
| ML | `SUPABASE_URL` | Same Supabase project URL |
| ML | `SUPABASE_SERVICE_ROLE_KEY` | Same service-role secret |
| ML | `DEVICE_INGEST_API_KEY` | Same device key |
| Simulator | `DEVICE_INGEST_API_KEY` | Same device key |

The device key must be identical in the API, ML and simulator services. Never use the publishable key where the service-role secret is requested.

## 3. First deployment

Apply the Blueprint and wait for all four services to finish building. Build order is not important, but the web gateway will become fully usable only after the two private services are running.

The expected public URL is:

```text
https://polaris-code-red-5791-web.onrender.com
```

If Render reports that this service name is unavailable, stop before creating resources. Rename the four services consistently in `render.yaml`, update the three private hostnames in `deploy/nginx.render.conf`, and update both `CORS_ORIGINS` values.

## 4. Supabase authentication URL

In Supabase, open **Authentication → URL Configuration** and set the deployed web URL as the Site URL. Add the same origin to the allowed redirect URLs according to the authentication flows used by the application.

If a custom domain is added later, update `CORS_ORIGINS` on both the API and ML services to include that exact HTTPS origin, then redeploy them.

## 5. Verification

Open each URL and confirm an HTTP success response:

```text
https://polaris-code-red-5791-web.onrender.com/healthz
https://polaris-code-red-5791-web.onrender.com/backend/api/health/live
https://polaris-code-red-5791-web.onrender.com/backend/api/health/ready
https://polaris-code-red-5791-web.onrender.com/ml/api/health/live
https://polaris-code-red-5791-web.onrender.com/ml/api/health/ready
```

Then verify:

1. HQ, Maitri and Bharati users can sign in with their correct roles.
2. Live telemetry changes every few seconds.
3. Socket.IO reconnects after a browser refresh.
4. Telemetry rows appear in Supabase without duplicates.
5. What-if predictions show `SUPABASE_COMMITTED_TELEMETRY` provenance.
6. Alerts can be acknowledged and the audit fields persist.
7. The 12-hour report, delivery record, JSON export and PDF download work.

## 6. Cut over from Vercel

Do not delete Vercel until the Render verification checklist passes. Afterward:

1. Move the custom domain to the Render web service, if one exists.
2. Update the Supabase Site URL, redirect URLs and both Render `CORS_ORIGINS` values to the final domain.
3. Remove the Vercel GitHub integration or disable its deployment check.
4. Delete the old Vercel project only after a final production smoke test.

## Optional services

The simulator is required only when the demo needs continuous generated telemetry. If real station ingestion is available, remove or suspend the simulator worker to avoid unnecessary compute and duplicate telemetry.

`GEMINI_API_KEY` is optional. Add it only to the ML private service in Render if external language-model synthesis is required. Deterministic prediction and what-if functionality does not require it.
