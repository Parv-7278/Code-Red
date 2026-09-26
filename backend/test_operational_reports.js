const assert = require('assert');
const reportService = require('./src/services/reportDispatchService');

async function run() {
  const report = await reportService.generate12HourReport('station-maitri', 'station_operator');
  assert.ok(report.report_id.startsWith('POL-12H-'));
  assert.equal(report.persistence, 'MEMORY_SIMULATION');
  assert.ok(report.station_reports['station-maitri']);

  const delivery = await reportService.transmitToIndiaHQ(report, 'station_operator', 'MANUAL');
  assert.equal(delivery.status, 'DELIVERED_INTERNAL');
  assert.equal(delivery.report_id, report.report_id);

  const schedule = await reportService.updateSchedule('station-maitri', true, 'station_operator');
  assert.equal(schedule.enabled, true);
  assert.equal(schedule.station_scope, 'station-maitri');

  const loadedSchedule = await reportService.getSchedule('station-maitri');
  assert.equal(loadedSchedule.enabled, true);

  const deliveries = await reportService.listDeliveries('station-maitri');
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].delivery_id, delivery.delivery_id);

  console.log('PASS: 12-hour reports, schedules, and internal HQ deliveries use the repository layer.');
  process.exit(0);
}

run().catch((error) => {
  console.error('Operational report verification failed:', error);
  process.exit(1);
});
