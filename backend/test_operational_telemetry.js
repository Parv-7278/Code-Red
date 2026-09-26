const assert = require('assert');
const sensorService = require('./src/services/sensorService');
const telemetryRepository = require('./src/repositories/telemetryRepository');

async function run() {
  telemetryRepository.resetMemoryStoreForTests();

  const payload = {
    packet_id: 'operational-test-packet-001',
    station_id: 'station-maitri',
    device_id: 'maitri-station-gateway',
    source: 'SENSOR',
    temperature: -22.4,
    battery_level: 72,
    power_consumption: 68.2,
    generator_status: 'RUNNING',
    generator_temperature: 78.2,
    wind_speed: 41,
    water_level: 81,
    recorded_at: new Date().toISOString(),
  };

  const first = await sensorService.processSensorData(payload);
  assert.equal(first.status, 'INGESTED_AND_QUEUED');
  assert.equal(first.duplicate, false);
  assert.equal(first.data.source, 'SENSOR');
  assert.equal(first.data.device_id, 'maitri-station-gateway');

  const retry = await sensorService.processSensorData(payload);
  assert.equal(retry.status, 'DUPLICATE_IGNORED');
  assert.equal(retry.duplicate, true);

  const history = await sensorService.getHistory('station-maitri', 50);
  assert.equal(history.filter((row) => row.packet_id === payload.packet_id).length, 1);

  const latest = await sensorService.getLatestData('station-maitri');
  assert.equal(latest.packet_id, payload.packet_id);
  assert.equal(latest.battery_level, 72);

  console.log('PASS: operational telemetry commits before queueing and ignores duplicate packet retries.');
  process.exit(0);
}

run().catch((error) => {
  console.error('Operational telemetry verification failed:', error);
  process.exit(1);
});
