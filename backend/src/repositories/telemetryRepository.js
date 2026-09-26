const { supabase, isConfigured } = require('../config/supabase');

const DEFAULT_STATION_TELEMETRY = {
  'station-bharati': {
    station_id: 'station-bharati',
    station_name: 'Bharati Research Station',
    packet_id: 'simulation-bootstrap-bharati',
    device_id: 'simulation-bootstrap',
    source: 'SIMULATION',
    quality_status: 'VALID',
    temperature: -14.0,
    battery: 98.0,
    battery_level: 98.0,
    power_consumption: 52.0,
    generator_status: 'RUNNING',
    generator_temperature: 70.0,
    wind_speed: 25.0,
    water_level: 92.0,
    comms_status: 'SAT_LINK_NOMINAL',
  },
  'station-maitri': {
    station_id: 'station-maitri',
    station_name: 'Maitri Research Station',
    packet_id: 'simulation-bootstrap-maitri',
    device_id: 'simulation-bootstrap',
    source: 'SIMULATION',
    quality_status: 'VALID',
    temperature: -18.0,
    battery: 95.0,
    battery_level: 95.0,
    power_consumption: 45.0,
    generator_status: 'RUNNING',
    generator_temperature: 72.0,
    wind_speed: 32.0,
    water_level: 88.0,
    comms_status: 'SAT_LINK_NOMINAL',
  },
};

const nowIso = new Date().toISOString();
const memoryLatest = Object.fromEntries(
  Object.entries(DEFAULT_STATION_TELEMETRY).map(([stationId, record]) => [
    stationId,
    { ...record, recorded_at: nowIso, received_at: nowIso },
  ]),
);
const memoryHistory = [];
const memoryPackets = new Map();

class TelemetryRepositoryError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'TelemetryRepositoryError';
    this.statusCode = 503;
    this.cause = cause;
  }
}

function normalizeRecord(record) {
  if (!record) return null;
  const batteryLevel = Number(record.battery_level ?? record.battery);
  return {
    ...record,
    battery_level: batteryLevel,
    battery: batteryLevel,
  };
}

function toDatabasePayload(record) {
  return {
    packet_id: record.packet_id,
    station_id: record.station_id,
    device_id: record.device_id,
    source: record.source,
    quality_status: record.quality_status,
    temperature: record.temperature,
    battery_level: record.battery_level,
    power_consumption: record.power_consumption,
    generator_status: record.generator_status,
    generator_temperature: record.generator_temperature,
    wind_speed: record.wind_speed,
    water_level: record.water_level,
    comms_status: record.comms_status,
    recorded_at: record.recorded_at,
    received_at: record.received_at,
    raw_payload: record.raw_payload,
  };
}

async function findByPacketId(packetId) {
  if (!packetId) return null;

  if (!isConfigured()) {
    return memoryPackets.get(packetId) || null;
  }

  const { data, error } = await supabase
    .from('telemetry_logs')
    .select('*')
    .eq('packet_id', packetId)
    .maybeSingle();

  if (error) {
    throw new TelemetryRepositoryError(`Could not check telemetry packet '${packetId}'.`, error);
  }
  return normalizeRecord(data);
}

async function insertTelemetry(record) {
  const existing = await findByPacketId(record.packet_id);
  if (existing) return { record: existing, duplicate: true };

  if (!isConfigured()) {
    const stored = normalizeRecord({ id: `memory-${record.packet_id}`, ...record });
    memoryPackets.set(stored.packet_id, stored);
    memoryLatest[stored.station_id] = stored;
    memoryHistory.unshift(stored);
    if (memoryHistory.length > 300) memoryHistory.pop();
    return { record: stored, duplicate: false };
  }

  const { data, error } = await supabase
    .from('telemetry_logs')
    .insert([toDatabasePayload(record)])
    .select('*')
    .single();

  if (error) {
    // A concurrent retry can pass the pre-check and then hit the unique index.
    if (error.code === '23505') {
      const duplicate = await findByPacketId(record.packet_id);
      if (duplicate) return { record: duplicate, duplicate: true };
    }
    throw new TelemetryRepositoryError('Telemetry could not be committed to Supabase.', error);
  }

  return { record: normalizeRecord(data), duplicate: false };
}

async function getLatestTelemetry(stationId) {
  if (!isConfigured()) {
    return stationId ? memoryLatest[stationId] || null : { ...memoryLatest };
  }

  let query = supabase
    .from('telemetry_logs')
    .select('*')
    .order('recorded_at', { ascending: false });

  if (stationId) {
    const { data, error } = await query.eq('station_id', stationId).limit(1).maybeSingle();
    if (error) throw new TelemetryRepositoryError('Latest telemetry could not be loaded.', error);
    return normalizeRecord(data);
  }

  const { data, error } = await query.limit(500);
  if (error) throw new TelemetryRepositoryError('Latest station telemetry could not be loaded.', error);

  return (data || []).reduce((latestByStation, row) => {
    if (!latestByStation[row.station_id]) latestByStation[row.station_id] = normalizeRecord(row);
    return latestByStation;
  }, {});
}

async function getTelemetryHistory(stationId, limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 300);

  if (!isConfigured()) {
    const records = stationId
      ? memoryHistory.filter((record) => record.station_id === stationId)
      : memoryHistory;
    return records.slice(0, safeLimit);
  }

  let query = supabase
    .from('telemetry_logs')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(safeLimit);

  if (stationId) query = query.eq('station_id', stationId);
  const { data, error } = await query;
  if (error) throw new TelemetryRepositoryError('Telemetry history could not be loaded.', error);
  return (data || []).map(normalizeRecord);
}

function getPersistenceMode() {
  return isConfigured() ? 'SUPABASE' : 'MEMORY_SIMULATION';
}

function resetMemoryStoreForTests() {
  memoryHistory.length = 0;
  memoryPackets.clear();
}

module.exports = {
  insertTelemetry,
  getLatestTelemetry,
  getTelemetryHistory,
  findByPacketId,
  getPersistenceMode,
  resetMemoryStoreForTests,
  TelemetryRepositoryError,
};
