const assert = require('assert');
const alertService = require('./src/services/alertService');
const alertRepository = require('./src/repositories/alertRepository');

async function run() {
  alertRepository.resetMemoryStoreForTests();
  const condition = {
    id: 'operational-alert-001',
    station_id: 'station-maitri',
    priority: 'CRITICAL',
    category: 'GENERATOR',
    sensor_key: 'generator_temperature',
    sensor_value: 94.2,
    threshold_value: 90,
    message: 'Generator temperature exceeded the critical threshold.',
  };

  const first = await alertService.triggerAlert(condition);
  assert.equal(first.duplicate, false);
  const repeated = await alertService.triggerAlert({ ...condition, id: 'operational-alert-002', sensor_value: 95.1 });
  assert.equal(repeated.duplicate, true);

  const active = await alertService.getAlerts({ station_id: 'station-maitri', status: 'ACTIVE' });
  assert.equal(active.length, 1);
  assert.equal(active[0].occurrence_count, 2);

  await assert.rejects(
    alertService.acknowledgeAlert(active[0].id, { role: 'station_operator', stationId: 'station-bharati' }),
    (error) => error.statusCode === 403,
  );

  const acknowledged = await alertService.acknowledgeAlert(active[0].id, {
    role: 'station_operator',
    stationId: 'station-maitri',
    fullName: 'Maitri Test Operator',
  });
  assert.equal(acknowledged.status, 'ACKNOWLEDGED');
  assert.equal(acknowledged.acknowledged_by_name, 'Maitri Test Operator');

  console.log('PASS: alerts are deduplicated, station-isolated, and acknowledged with operator attribution.');
  process.exit(0);
}

run().catch((error) => {
  console.error('Operational alert verification failed:', error);
  process.exit(1);
});
