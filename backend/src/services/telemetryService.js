const { supabase, isConfigured } = require('../config/supabase');
const { defaultSatelliteLink } = require('../queue/satelliteLink');

// In-memory telemetry cache for real-time dashboard state
const latestStationTelemetry = {
  'station-maitri': {
    station_id: 'station-maitri',
    name: 'Maitri Research Station',
    temperature: -18.5,
    battery_level: 94.0,
    power_consumption: 42.5,
    generator_status: 'RUNNING',
    generator_temperature: 72.0,
    wind_speed: 35.0,
    water_level: 88.0,
    comms_status: 'SAT_LINK_NOMINAL',
    recorded_at: new Date().toISOString(),
  },
  'station-bharati': {
    station_id: 'station-bharati',
    name: 'Bharati Research Station',
    temperature: -14.2,
    battery_level: 97.5,
    power_consumption: 55.0,
    generator_status: 'RUNNING',
    generator_temperature: 70.5,
    wind_speed: 28.0,
    water_level: 92.0,
    comms_status: 'SAT_LINK_NOMINAL',
    recorded_at: new Date().toISOString(),
  }
};

const telemetryHistory = [];

/**
 * Handle incoming sensor telemetry from station simulator
 */
async function ingestTelemetry(data) {
  const stationId = data.station_id || 'station-maitri';
  
  const telemetryRecord = {
    station_id: stationId,
    temperature: Number(data.temperature ?? -20),
    battery_level: Number(data.battery_level ?? 90),
    power_consumption: Number(data.power_consumption ?? 40),
    generator_status: data.generator_status || 'RUNNING',
    generator_temperature: Number(data.generator_temperature ?? 70),
    wind_speed: Number(data.wind_speed ?? 30),
    water_level: Number(data.water_level ?? 85),
    comms_status: data.comms_status || 'SAT_LINK_NOMINAL',
    recorded_at: data.recorded_at || new Date().toISOString(),
    packet_type: 'NORMAL_TELEMETRY',
  };

  // Submit to satellite queue with NORMAL priority (Level 3)
  const enqueued = defaultSatelliteLink.submitPacket(telemetryRecord, 3);

  // Update in-memory state
  latestStationTelemetry[stationId] = {
    ...latestStationTelemetry[stationId],
    ...telemetryRecord,
  };
  telemetryHistory.unshift(telemetryRecord);
  if (telemetryHistory.length > 200) telemetryHistory.pop();

  // If Supabase is connected, asynchronously persist
  if (isConfigured()) {
    supabase.from('telemetry_logs').insert([telemetryRecord]).then(({ error }) => {
      if (error) console.error('[Supabase] Error inserting telemetry:', error.message);
    });
  }

  return { status: 'ENQUEUED', queueInfo: enqueued };
}

function getLatestTelemetry(stationId) {
  if (stationId) {
    return latestStationTelemetry[stationId] || null;
  }
  return latestStationTelemetry;
}

function getTelemetryHistory(stationId, limit = 50) {
  let records = telemetryHistory;
  if (stationId) {
    records = records.filter(r => r.station_id === stationId);
  }
  return records.slice(0, limit);
}

module.exports = {
  ingestTelemetry,
  getLatestTelemetry,
  getTelemetryHistory,
};
