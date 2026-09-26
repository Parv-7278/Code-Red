-- POLARIS operational telemetry foundation.
-- Additive migration: safe to apply to the existing prototype schema.

create or replace function public.current_polaris_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select role from public.user_profiles where id = auth.uid()
$$;

revoke all on function public.current_polaris_role() from public;
grant execute on function public.current_polaris_role() to authenticated;

drop policy if exists "India operators can view all user profiles" on user_profiles;
create policy "India operators can view all user profiles"
    on user_profiles for select
    using (public.current_polaris_role() = 'india_operator');

create table if not exists devices (
    id varchar(100) primary key,
    station_id varchar(50) not null references stations(id),
    display_name varchar(150) not null,
    device_type varchar(80) not null,
    status varchar(30) not null default 'ACTIVE'
        check (status in ('ACTIVE', 'DISABLED', 'MAINTENANCE')),
    last_seen_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table telemetry_logs
    add column if not exists packet_id varchar(150),
    add column if not exists device_id varchar(100),
    add column if not exists source varchar(30) not null default 'SENSOR',
    add column if not exists quality_status varchar(30) not null default 'VALID',
    add column if not exists received_at timestamptz not null default now(),
    add column if not exists raw_payload jsonb;

alter table alerts
    add column if not exists deduplication_key varchar(200),
    add column if not exists occurrence_count integer not null default 1,
    add column if not exists last_observed_at timestamptz,
    add column if not exists acknowledged_by uuid references auth.users(id),
    add column if not exists acknowledged_by_name varchar(150),
    add column if not exists acknowledged_at timestamptz,
    add column if not exists resolved_by uuid references auth.users(id),
    add column if not exists resolved_by_name varchar(150),
    add column if not exists resolved_at timestamptz,
    add column if not exists resolution_note text;

create index if not exists idx_alerts_deduplication_status
    on alerts (deduplication_key, status, triggered_at desc);

create table if not exists model_versions (
    id uuid primary key default gen_random_uuid(),
    station_id varchar(50) not null references stations(id),
    model_name varchar(100) not null,
    version varchar(100) not null,
    algorithm varchar(100) not null,
    training_sample_count integer not null,
    training_data_start timestamptz,
    training_data_end timestamptz,
    metrics jsonb not null default '{}'::jsonb,
    data_provenance jsonb not null default '{}'::jsonb,
    artifact_path text,
    status varchar(30) not null default 'ACTIVE',
    trained_at timestamptz,
    created_at timestamptz not null default now(),
    unique (station_id, version)
);

create table if not exists predictions (
    id uuid primary key default gen_random_uuid(),
    station_id varchar(50) not null references stations(id),
    model_name varchar(100) not null,
    model_version varchar(100) not null,
    horizons_hours integer[] not null,
    input_start timestamptz,
    input_end timestamptz,
    input_sample_count integer not null,
    data_provenance jsonb not null default '{}'::jsonb,
    prediction_result jsonb not null,
    risk_summary jsonb not null default '{}'::jsonb,
    confidence decimal(8, 5),
    status varchar(30) not null default 'PREDICTED',
    actual_result jsonb,
    evaluation_metrics jsonb,
    evaluated_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_model_versions_station_time
    on model_versions (station_id, trained_at desc);

create index if not exists idx_predictions_station_time
    on predictions (station_id, created_at desc);

create table if not exists report_documents (
    report_id varchar(150) primary key,
    report_type varchar(80) not null,
    station_scope varchar(50) not null,
    period_start timestamptz not null,
    period_end timestamptz not null,
    generated_at timestamptz not null,
    payload jsonb not null,
    created_at timestamptz not null default now()
);

create table if not exists report_schedules (
    id uuid primary key default gen_random_uuid(),
    station_scope varchar(50) not null unique,
    enabled boolean not null default false,
    cadence_hours integer not null default 12,
    recipient varchar(255) not null,
    requested_by_role varchar(50),
    next_dispatch_at timestamptz,
    last_dispatch_at timestamptz,
    service_scope text,
    updated_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create table if not exists report_deliveries (
    delivery_id varchar(150) primary key,
    report_id varchar(150) not null references report_documents(report_id),
    station_scope varchar(50) not null,
    destination jsonb not null,
    trigger varchar(30) not null,
    status varchar(40) not null,
    requested_by_role varchar(50),
    delivered_at timestamptz,
    checksum varchar(100),
    created_at timestamptz not null default now()
);

create index if not exists idx_report_deliveries_scope_time
    on report_deliveries (station_scope, delivered_at desc);

create index if not exists idx_report_schedules_due
    on report_schedules (enabled, next_dispatch_at);

alter table model_versions enable row level security;
alter table predictions enable row level security;
alter table report_documents enable row level security;
alter table report_schedules enable row level security;
alter table report_deliveries enable row level security;

grant usage on schema public to authenticated, service_role;
grant select on table
    stations,
    devices,
    telemetry_logs,
    energy_telemetry,
    alerts,
    remote_operations,
    model_versions,
    predictions,
    report_documents,
    report_schedules,
    report_deliveries,
    latency_logs,
    user_profiles
to authenticated;
grant all privileges on table
    stations,
    devices,
    telemetry_logs,
    energy_telemetry,
    alerts,
    remote_operations,
    model_versions,
    predictions,
    report_documents,
    report_schedules,
    report_deliveries,
    latency_logs,
    user_profiles
to service_role;
grant usage, select on all sequences in schema public to service_role;

drop policy if exists "Operators can view authorized model versions" on model_versions;
create policy "Operators can view authorized model versions"
    on model_versions for select
    using (
        exists (
            select 1 from user_profiles
            where id = auth.uid()
              and (role = 'india_operator' or station_id = model_versions.station_id)
        )
    );

drop policy if exists "Operators can view authorized predictions" on predictions;
create policy "Operators can view authorized predictions"
    on predictions for select
    using (
        exists (
            select 1 from user_profiles
            where id = auth.uid()
              and (role = 'india_operator' or station_id = predictions.station_id)
        )
    );

drop policy if exists "Operators can view authorized report documents" on report_documents;
create policy "Operators can view authorized report documents"
    on report_documents for select
    using (
        exists (
            select 1 from user_profiles
            where id = auth.uid()
              and (
                role = 'india_operator'
                or station_id = report_documents.station_scope
              )
        )
    );

drop policy if exists "Operators can view authorized report schedules" on report_schedules;
create policy "Operators can view authorized report schedules"
    on report_schedules for select
    using (
        exists (
            select 1 from user_profiles
            where id = auth.uid()
              and (
                role = 'india_operator'
                or station_id = report_schedules.station_scope
              )
        )
    );

drop policy if exists "Operators can view authorized report deliveries" on report_deliveries;
create policy "Operators can view authorized report deliveries"
    on report_deliveries for select
    using (
        exists (
            select 1 from user_profiles
            where id = auth.uid()
              and (
                role = 'india_operator'
                or station_id = report_deliveries.station_scope
                or report_deliveries.station_scope = 'all-stations'
              )
        )
    );

create unique index if not exists uq_telemetry_packet_id
    on telemetry_logs (packet_id)
    where packet_id is not null;

create index if not exists idx_telemetry_device_time
    on telemetry_logs (device_id, recorded_at desc);

create index if not exists idx_telemetry_source_time
    on telemetry_logs (source, recorded_at desc);

alter table devices enable row level security;

drop policy if exists "India operators can view all devices" on devices;
create policy "India operators can view all devices"
    on devices for select
    using (
        exists (
            select 1 from user_profiles
            where id = auth.uid() and role = 'india_operator'
        )
    );

drop policy if exists "Station operators can view assigned devices" on devices;
create policy "Station operators can view assigned devices"
    on devices for select
    using (
        station_id = (
            select station_id from user_profiles where id = auth.uid()
        )
    );

insert into devices (id, station_id, display_name, device_type)
values
    ('maitri-station-gateway', 'station-maitri', 'Maitri Station Gateway', 'STATION_GATEWAY'),
    ('bharati-station-gateway', 'station-bharati', 'Bharati Station Gateway', 'STATION_GATEWAY'),
    ('station-maitri-manual-console', 'station-maitri', 'Maitri Manual Operations Console', 'MANUAL_CONSOLE'),
    ('station-bharati-manual-console', 'station-bharati', 'Bharati Manual Operations Console', 'MANUAL_CONSOLE')
on conflict (id) do update
set
    display_name = excluded.display_name,
    device_type = excluded.device_type,
    updated_at = now();
