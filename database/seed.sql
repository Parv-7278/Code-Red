-- ==============================================================================
-- Seed Data: Indian Antarctic Stations
-- ==============================================================================

INSERT INTO stations (id, name, latitude, longitude, status, timezone, timezone_label)
VALUES 
    ('station-maitri', 'Maitri Research Station (Schirmacher Oasis)', -70.765833, 11.735833, 'ONLINE', 'UTC', 'UTC+0'),
    ('station-bharati', 'Bharati Research Station (Larsemann Hills)', -69.407778, 76.187222, 'ONLINE', 'Antarctica/Mawson', 'UTC+5')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    status = EXCLUDED.status,
    timezone = EXCLUDED.timezone,
    timezone_label = EXCLUDED.timezone_label;

-- Operator profiles are intentionally not seeded with placeholder UUIDs.
-- First create real users in Supabase Authentication, then insert profiles
-- using their actual auth.users UUIDs. See database/OPERATIONAL_SETUP.md.
