const crypto = require('crypto');
const { defaultSatelliteLink } = require('../queue/satelliteLink');
const { checkAnomalies } = require('./anomalyDetector');
const alertService = require('./alertService');
const telemetryRepository = require('../repositories/telemetryRepository');

/**
 * Ingest sensor data, detect critical conditions, and enqueue for priority satellite dispatch.
 */
async function processSensorData(data) {
  const stationId = data.station_id;
  const nowIso = new Date().toISOString();
  // `battery_level` is the canonical live sensor field. Older simulator
  // payloads may also include a legacy `battery` alias that can lag behind;
  // prefer the canonical field so state-of-charge updates never appear frozen.
  const batt = Number(data.battery_level !== undefined ? data.battery_level : data.battery ?? 95);

  const formattedRecord = {
    packet_id: data.packet_id || crypto.randomUUID(),
    station_id: stationId,
    device_id: data.device_id || `${stationId}-station-gateway`,
    source: String(data.source || 'SENSOR').toUpperCase(),
    quality_status: String(data.quality_status || 'VALID').toUpperCase(),
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
    raw_payload: data,
    packet_type: 'NORMAL_TELEMETRY',
  };

  // Commit first. Connected deployments must never claim that a packet was
  // accepted when its durable database write failed.
  const persistenceResult = await telemetryRepository.insertTelemetry(formattedRecord);
  if (persistenceResult.duplicate) {
    return {
      status: 'DUPLICATE_IGNORED',
      duplicate: true,
      station_id: stationId,
      timestamp: nowIso,
      data: persistenceResult.record,
      criticalConditionDetected: false,
      triggeredAlerts: [],
      persistence: telemetryRepository.getPersistenceMode(),
      queueInfo: null,
    };
  }

  const committedRecord = { ...formattedRecord, ...persistenceResult.record };

  // Queue and broadcast only after the record has been committed.
  const enqueuedPacket = defaultSatelliteLink.submitPacket(committedRecord, 3);

  // Automated anomaly detection runs against the exact committed values.
  const detectedAnomalies = checkAnomalies(committedRecord);
  const triggeredAlerts = [];

  for (const anomaly of detectedAnomalies) {
    const alertResult = await alertService.triggerAlert(anomaly);
    triggeredAlerts.push(alertResult);
  }

  return {
    status: 'INGESTED_AND_QUEUED',
    duplicate: false,
    station_id: stationId,
    timestamp: nowIso,
    data: committedRecord,
    criticalConditionDetected: triggeredAlerts.some(a => a.alert?.priority === 'CRITICAL'),
    triggeredAlerts,
    persistence: telemetryRepository.getPersistenceMode(),
    queueInfo: {
      priority: enqueuedPacket.priority,
      queued_at: enqueuedPacket.queued_at,
    }
  };
}

async function getLatestData(stationId) {
  return telemetryRepository.getLatestTelemetry(stationId);
}

async function getHistory(stationId, limit = 50) {
  return telemetryRepository.getTelemetryHistory(stationId, limit);
}

module.exports = {
  processSensorData,
  getLatestData,
  getHistory,
};
