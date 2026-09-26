# POLARIS operational database setup

Use a dedicated Supabase development project first. Do not paste service-role
credentials into SQL files, source code, Git commits, screenshots, or chat.

## 1. Apply the schema

In Supabase SQL Editor, run these files in order:

1. `database/schema.sql`
2. `database/seed.sql`
3. `database/migrations/20260925_operational_telemetry.sql`

The migration is additive and may be run after an existing prototype schema.

## 2. Create operators

In Authentication > Users, create one account for India HQ, one for Maitri,
and one for Bharati. Copy each generated UUID. Then run the following after
replacing every placeholder:

```sql
insert into public.user_profiles (id, full_name, role, station_id)
values
    ('HQ_AUTH_UUID', 'India HQ Operator', 'india_operator', null),
    ('MAITRI_AUTH_UUID', 'Maitri Station Operator', 'station_operator', 'station-maitri'),
    ('BHARATI_AUTH_UUID', 'Bharati Station Operator', 'station_operator', 'station-bharati')
on conflict (id) do update
set
    full_name = excluded.full_name,
    role = excluded.role,
    station_id = excluded.station_id;
```

Roles are server-controlled. Do not allow public signup metadata to select an
operator role.

## 3. Verify the database

Run:

```sql
select id, name from public.stations order by id;
select id, full_name, role, station_id from public.user_profiles order by role, station_id;
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'devices', 'telemetry_logs', 'alerts', 'model_versions', 'predictions',
    'report_documents', 'report_schedules', 'report_deliveries'
  )
order by table_name;
```

Expected: two stations, three operator profiles, and all eight operational
tables.

## 4. Configure local secrets

Only the browser receives the publishable key. Node and FastAPI receive the
secret key (or legacy service-role key) through ignored `.env` files or a
hosting secret manager. The existing `*_ANON_KEY` and `*_SERVICE_ROLE_KEY`
environment variable names accept these newer key formats.

After local configuration, set `DEMO_MODE=false` and
`ALLOW_SYNTHETIC_ML=false`, start the services, and request:

- Node: `GET /api/health/ready`
- FastAPI: `GET /api/health/ready`

Both must return `READY` before connected-mode testing.
