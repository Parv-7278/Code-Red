-- ==============================================================================
-- SIH 2026: Digital Platform for Efficient Remote Management of Indian Antarctic Research Stations
-- Database Schema for Supabase / PostgreSQL
-- ==============================================================================

-- 1. Research Stations Table (Maitri, Bharati)
CREATE TABLE IF NOT EXISTS stations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    status VARCHAR(20) DEFAULT 'ONLINE',
    timezone VARCHAR(50) DEFAULT 'UTC',
    timezone_label VARCHAR(20) DEFAULT 'UTC+0',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Telemetry Logs Table
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    packet_id VARCHAR(150),
    station_id VARCHAR(50) REFERENCES stations(id),
    device_id VARCHAR(100),
    source VARCHAR(30) NOT NULL DEFAULT 'SENSOR',
    quality_status VARCHAR(30) NOT NULL DEFAULT 'VALID',
    temperature DECIMAL(5, 2),        -- Ambient temperature (°C)
    battery_level DECIMAL(5, 2),      -- Battery charge percentage (%)
    power_consumption DECIMAL(8, 2),  -- Power drawn (kW)
    generator_status VARCHAR(20),     -- 'RUNNING', 'STANDBY', 'OVERHEAT', 'FAULT'
    generator_temperature DECIMAL(5, 2), -- Generator core temp (°C)
    wind_speed DECIMAL(6, 2),         -- Wind speed (km/h or knots)
    water_level DECIMAL(5, 2),        -- Fuel/Water reserve level (%)
    comms_status VARCHAR(20),         -- 'SAT_LINK_NOMINAL', 'DEGRADED', 'OFFLINE'
    recorded_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registered station gateways and sensor devices.
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(100) PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL REFERENCES stations(id),
    display_name VARCHAR(150) NOT NULL,
    device_type VARCHAR(80) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'DISABLED', 'MAINTENANCE')),
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Energy telemetry used by the FastAPI forecasting pipeline. The Python
-- service currently maps Maitri to 1 and Bharati to 2.
CREATE TABLE IF NOT EXISTS energy_telemetry (
    id BIGSERIAL PRIMARY KEY,
    station_id SMALLINT NOT NULL CHECK (station_id IN (1, 2)),
    total_generation DECIMAL(10, 2) NOT NULL,
    battery_charge_pct DECIMAL(5, 2) NOT NULL CHECK (battery_charge_pct BETWEEN 0 AND 100),
    total_consumption DECIMAL(10, 2) NOT NULL,
    surplus DECIMAL(10, 2) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Station Alerts Table (Prioritized Emergency Events)
CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE,
    station_id VARCHAR(50) REFERENCES stations(id),
    priority VARCHAR(20) NOT NULL,    -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    category VARCHAR(50) NOT NULL,    -- 'GENERATOR', 'POWER', 'WEATHER', 'COMMUNICATION'
    message TEXT NOT NULL,
    sensor_key VARCHAR(50),
    sensor_value DECIMAL(8, 2),
    threshold_value DECIMAL(8, 2),
    deduplication_key VARCHAR(200),
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    last_observed_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_by_name VARCHAR(150),
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_by_name VARCHAR(150),
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT,
    triggered_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS event_id VARCHAR(100) UNIQUE;

-- Auditable remote-operation lifecycle. These records describe simulated or
-- real command requests without claiming success until a completion state is stored.
CREATE TABLE IF NOT EXISTS remote_operations (
    id VARCHAR(100) PRIMARY KEY,
    station_id VARCHAR(50) NOT NULL REFERENCES stations(id),
    command TEXT NOT NULL,
    command_code VARCHAR(100) NOT NULL,
    operator_name VARCHAR(150) NOT NULL,
    mode VARCHAR(30) NOT NULL DEFAULT 'SIMULATION',
    status VARCHAR(40) NOT NULL,
    result TEXT,
    requested_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id VARCHAR(50) NOT NULL REFERENCES stations(id),
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(100) NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    training_sample_count INTEGER NOT NULL,
    training_data_start TIMESTAMPTZ,
    training_data_end TIMESTAMPTZ,
    metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
    data_provenance JSONB NOT NULL DEFAULT '{}'::JSONB,
    artifact_path TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    trained_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (station_id, version)
);

CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id VARCHAR(50) NOT NULL REFERENCES stations(id),
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(100) NOT NULL,
    horizons_hours INTEGER[] NOT NULL,
    input_start TIMESTAMPTZ,
    input_end TIMESTAMPTZ,
    input_sample_count INTEGER NOT NULL,
    data_provenance JSONB NOT NULL DEFAULT '{}'::JSONB,
    prediction_result JSONB NOT NULL,
    risk_summary JSONB NOT NULL DEFAULT '{}'::JSONB,
    confidence DECIMAL(8, 5),
    status VARCHAR(30) NOT NULL DEFAULT 'PREDICTED',
    actual_result JSONB,
    evaluation_metrics JSONB,
    evaluated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_documents (
    report_id VARCHAR(150) PRIMARY KEY,
    report_type VARCHAR(80) NOT NULL,
    station_scope VARCHAR(50) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_scope VARCHAR(50) NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    cadence_hours INTEGER NOT NULL DEFAULT 12,
    recipient VARCHAR(255) NOT NULL,
    requested_by_role VARCHAR(50),
    next_dispatch_at TIMESTAMPTZ,
    last_dispatch_at TIMESTAMPTZ,
    service_scope TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_deliveries (
    delivery_id VARCHAR(150) PRIMARY KEY,
    report_id VARCHAR(150) NOT NULL REFERENCES report_documents(report_id),
    station_scope VARCHAR(50) NOT NULL,
    destination JSONB NOT NULL,
    trigger VARCHAR(30) NOT NULL,
    status VARCHAR(40) NOT NULL,
    requested_by_role VARCHAR(50),
    delivered_at TIMESTAMPTZ,
    checksum VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Queue Latency Measurement Logs
CREATE TABLE IF NOT EXISTS latency_logs (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(50) REFERENCES stations(id),
    packet_id VARCHAR(100) NOT NULL,
    packet_type VARCHAR(20) NOT NULL, -- 'EMERGENCY_ALERT' or 'NORMAL_TELEMETRY'
    priority VARCHAR(20) NOT NULL,    -- 'CRITICAL', 'HIGH', 'NORMAL'
    generated_at TIMESTAMPTZ NOT NULL,
    queued_at TIMESTAMPTZ NOT NULL,
    dispatched_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL,
    queue_delay_ms INTEGER NOT NULL,
    simulated_transmission_ms INTEGER NOT NULL,
    total_latency_ms INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Profiles Table for Role-Based Access Control
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('india_operator', 'station_operator')),
    station_id VARCHAR(50) REFERENCES stations(id), -- NULL for india_operator
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast query performance on dashboards
CREATE INDEX IF NOT EXISTS idx_telemetry_station_time ON telemetry_logs (station_id, recorded_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_telemetry_packet_id ON telemetry_logs (packet_id) WHERE packet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON telemetry_logs (device_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_energy_telemetry_station_time ON energy_telemetry (station_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_station_priority ON alerts (station_id, priority, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_deduplication_status ON alerts (deduplication_key, status, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_remote_operations_station_time ON remote_operations (station_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_versions_station_time ON model_versions (station_id, trained_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_station_time ON predictions (station_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_deliveries_scope_time ON report_deliveries (station_scope, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_schedules_due ON report_schedules (enabled, next_dispatch_at);
CREATE INDEX IF NOT EXISTS idx_latency_packet_type ON latency_logs (packet_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles (role, station_id);

-- ==============================================================================
-- Supabase Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable Row Level Security
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE remote_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE latency_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- The browser only reads through authenticated sessions. All mutations flow
-- through the trusted services, whose secret key maps to service_role.
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT ON TABLE
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
TO authenticated;
GRANT ALL PRIVILEGES ON TABLE
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
TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Security-definer role lookup avoids recursively evaluating user_profiles
-- RLS when an India operator needs to view another operator profile.
CREATE OR REPLACE FUNCTION public.current_polaris_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_profiles WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.current_polaris_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_polaris_role() TO authenticated;

-- 1. user_profiles Policies
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "India operators can view all user profiles"
    ON user_profiles FOR SELECT
    USING (public.current_polaris_role() = 'india_operator');

-- 2. stations Policies
CREATE POLICY "India operators can view all stations"
    ON stations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'india_operator'
        )
    );

CREATE POLICY "Station operators can only view their assigned station"
    ON stations FOR SELECT
    USING (
        id = (
            SELECT station_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );

-- 3. telemetry_logs Policies
CREATE POLICY "India operators can view telemetry for all stations"
    ON telemetry_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'india_operator'
        )
    );

CREATE POLICY "Station operators can only view telemetry for their assigned station"
    ON telemetry_logs FOR SELECT
    USING (
        station_id = (
            SELECT station_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "India operators can view all devices"
    ON devices FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'india_operator'
        )
    );

CREATE POLICY "Station operators can view assigned devices"
    ON devices FOR SELECT
    USING (
        station_id = (
            SELECT station_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- 3b. energy_telemetry Policies
CREATE POLICY "India operators can view all energy telemetry"
    ON energy_telemetry FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'india_operator'
        )
    );

CREATE POLICY "Station operators can view assigned energy telemetry"
    ON energy_telemetry FOR SELECT
    USING (
        station_id = CASE (
            SELECT station_id FROM user_profiles WHERE id = auth.uid()
        )
            WHEN 'station-maitri' THEN 1
            WHEN 'station-bharati' THEN 2
            ELSE 0
        END
    );

-- 4. alerts Policies
CREATE POLICY "India operators can view alerts for all stations"
    ON alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'india_operator'
        )
    );

CREATE POLICY "Station operators can only view alerts for their assigned station"
    ON alerts FOR SELECT
    USING (
        station_id = (
            SELECT station_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "India operators can view all remote operations"
    ON remote_operations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'india_operator'
        )
    );

CREATE POLICY "Station operators can view assigned remote operations"
    ON remote_operations FOR SELECT
    USING (
        station_id = (
            SELECT station_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Operators can view authorized model versions"
    ON model_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND (role = 'india_operator' OR station_id = model_versions.station_id)
        )
    );

CREATE POLICY "Operators can view authorized predictions"
    ON predictions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND (role = 'india_operator' OR station_id = predictions.station_id)
        )
    );

CREATE POLICY "Operators can view authorized report documents"
    ON report_documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND (role = 'india_operator' OR station_id = report_documents.station_scope)
        )
    );

CREATE POLICY "Operators can view authorized report schedules"
    ON report_schedules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND (role = 'india_operator' OR station_id = report_schedules.station_scope)
        )
    );

CREATE POLICY "Operators can view authorized report deliveries"
    ON report_deliveries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
              AND (
                role = 'india_operator'
                OR station_id = report_deliveries.station_scope
                OR report_deliveries.station_scope = 'all-stations'
              )
        )
    );

-- 5. latency_logs Policies
CREATE POLICY "India operators can view all latency logs"
    ON latency_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'india_operator'
        )
    );

CREATE POLICY "Station operators can view latency logs for their assigned station"
    ON latency_logs FOR SELECT
    USING (
        station_id = (
            SELECT station_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );
