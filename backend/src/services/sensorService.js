const { supabase, isConfigured } = require('../config/supabase');
const { defaultSatelliteLink } = require('../queue/satelliteLink');
const { checkAnomalies } = require('./anomalyDetector');
const alertService = require('./alertService');

// In-memory cache for latest station telemetry
const latestStationData = {
  'station-bharati': {
    station_id: 'station-bharati',
    station_name: 'Bharati Research Station',
    temperature: -14.0,
    battery: 98.0,
    battery_level: 98.0,
    power_consumption: 52.0,
    generator_status: 'RUNNING',
    generator_temperature: 70.0,
    wind_speed: 25.0,
    water_level: 92.0,
    comms_status: 'SAT_LINK_NOMINAL',
    recorded_at: new Date().toISOString(),
    received_at: new Date().toISOString(),
  },
  'station-maitri': {
    station_id: 'station-maitri',
    station_name: 'Maitri Research Station',
    temperature: -18.0,
    battery: 95.0,
    battery_level: 95.0,
    power_consumption: 45.0,
    generator_status: 'RUNNING',
    generator_temperature: 72.0,
    wind_speed: 32.0,
    water_level: 88.0,
    comms_status: 'SAT_LINK_NOMINAL',
    recorded_at: new Date().toISOString(),
    received_at: new Date().toISOString(),
  }
};

const sensorDataHistory = [];

/**
 * Ingest sensor data, detect critical conditions, and enqueue for priority satellite dispatch.
 */
async function processSensorData(data) {
  const stationId = data.station_id || 'station-bharati';
  const nowIso = new Date().toISOString();
  const batt = Number(data.battery !== undefined ? data.battery : data.battery_level ?? 95);

  const formattedRecord = {
    station_id: stationId,
    temperature: Number(data.temperature),
    battery_level: batt,
    battery: batt,
    power_consumption: Number(data.power_consumption),
    generator_status: data.generator_status || 'RUNNING',
    generator_temperature: Number(data.generator_temperature),
    wind_speed: Number(data.wind_speed),
    water_level: Number(data.water_level),
    comms_status: data.comms_status || 'SAT_LINK_NOMINAL',
    recorded_at: data.recorded_at || data.timestamp || nowIso,
    received_at: nowIso,
    packet_type: 'NORMAL_TELEMETRY',
  };

  // 1. Submit normal telemetry packet to Priority Queue (Priority Level 3 = Normal)
  const enqueuedPacket = defaultSatelliteLink.submitPacket(formattedRecord, 3);

  // 2. Update in-memory state
  latestStationData[stationId] = {
    ...latestStationData[stationId],
    ...formattedRecord,
  };
  sensorDataHistory.unshift(formattedRecord);
  if (sensorDataHistory.length > 300) sensorDataHistory.pop();

  // 3. Automated Anomaly Detection for CRITICAL conditions
  const detectedAnomalies = checkAnomalies(formattedRecord);
  const triggeredAlerts = [];

  for (const anomaly of detectedAnomalies) {
    const alertResult = await alertService.triggerAlert(anomaly);
    triggeredAlerts.push(alertResult);
  }

  // 4. Asynchronously persist to Supabase if configured
  if (isConfigured()) {
    const supabasePayload = {
      station_id: formattedRecord.station_id,
      temperature: formattedRecord.temperature,
      battery_level: formattedRecord.battery_level,
      power_consumption: formattedRecord.power_consumption,
      generator_status: formattedRecord.generator_status,
      generator_temperature: formattedRecord.generator_temperature,
      wind_speed: formattedRecord.wind_speed,
      water_level: formattedRecord.water_level,
      comms_status: formattedRecord.comms_status,
      recorded_at: formattedRecord.recorded_at,
    };

    supabase.from('telemetry_logs').insert([supabasePayload]).then(({ error }) => {
      if (error) console.error('[Supabase] Error saving telemetry_logs:', error.message);
    });
  }

  return {
    status: 'INGESTED_AND_QUEUED',
    station_id: stationId,
    timestamp: nowIso,
    data: formattedRecord,
    criticalConditionDetected: triggeredAlerts.some(a => a.alert?.priority === 'CRITICAL'),
    triggeredAlerts,
    queueInfo: {
      priority: enqueuedPacket.priority,
      queued_at: enqueuedPacket.queued_at,
    }
  };
}

function getLatestData(stationId) {
  if (stationId) {
    return latestStationData[stationId] || null;
  }
  return latestStationData;
}

function getHistory(stationId, limit = 50) {
  let records = sensorDataHistory;
  if (stationId) {
    records = records.filter(r => r.station_id === stationId);
  }
  return records.slice(0, limit);
}

module.exports = {
  processSensorData,
  getLatestData,
  getHistory,
};
