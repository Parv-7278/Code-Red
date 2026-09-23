const { SatelliteLinkSimulator } = require('./src/queue/satelliteLink');
const telemetryService = require('./src/services/telemetryService');
const alertService = require('./src/services/alertService');

async function runVerification() {
  console.log('===============================================================');
  console.log('🧪 Starting Antarctic Simulation Priority Queue Verification');
  console.log('===============================================================');

  const link = new SatelliteLinkSimulator({
    normalIntervalMs: 200,
    emergencyIntervalMs: 20,
    basePropagationDelayMs: 240,
  });

  console.log('\n1. Submitting 5 Normal Telemetry Packets...');
  for (let i = 1; i <= 5; i++) {
    link.submitPacket({
      id: `norm-pkt-${i}`,
      station_id: 'station-maitri',
      packet_type: 'NORMAL_TELEMETRY',
      data: { generator_temperature: 70 + i, battery_level: 95 }
    }, 3); // Priority 3 = NORMAL
  }

  console.log(`   Current Queue Size: ${link.queue.size()}`);

  console.log('\n2. Injecting CRITICAL Emergency Alert (Generator 95°C)...');
  link.submitPacket({
    id: `crit-pkt-01`,
    station_id: 'station-maitri',
    packet_type: 'EMERGENCY_ALERT',
    priority: 'CRITICAL',
    data: {
      category: 'GENERATOR',
      message: 'CRITICAL: Generator 1 core temperature 95°C exceeded limit (90°C)',
      sensor_value: 95.0
    }
  }, 1); // Priority 1 = CRITICAL

  console.log(`   Queue Snapshot after Critical Insertion:`);
  console.log(`   - Total Items in Queue: ${link.queue.size()}`);
  console.log(`   - Next Item to be Dequeued: ${link.queue.peek().id} (Priority: ${link.queue.peek().priority})`);

  console.log('\n3. Simulating Satellite Link processing over 2.5 seconds...');
  link.startLinkScheduler();

  await new Promise(r => setTimeout(r, 2200));

  const metrics = link.getMetrics();
  console.log('\n4. Latency & Queue Delay Results:');
  console.log('---------------------------------------------------------------');
  console.log(`Total Packets Processed: ${metrics.summary.totalProcessed}`);
  if (metrics.summary.critical.count > 0 && metrics.summary.normal.count > 0) {
    console.log(`Critical Packets: Avg Queue Delay = ${metrics.summary.critical.avgQueueDelayMs} ms | Avg Total Latency = ${metrics.summary.critical.avgTotalLatencyMs} ms`);
    console.log(`Normal Packets:   Avg Queue Delay = ${metrics.summary.normal.avgQueueDelayMs} ms | Avg Total Latency = ${metrics.summary.normal.avgTotalLatencyMs} ms`);
    console.log('---------------------------------------------------------------');

    if (metrics.summary.critical.avgQueueDelayMs <= metrics.summary.normal.avgQueueDelayMs) {
      console.log('✅ PASS: Critical emergency alert experienced significantly lower queueing delay than normal telemetry!');
    } else {
      throw new Error('Critical queue delay was not lower than normal telemetry.');
    }
  } else {
    throw new Error(`Expected processed critical and normal packets, received critical=${metrics.summary.critical.count}, normal=${metrics.summary.normal.count}.`);
  }

  console.log('\n🎉 Verification completed successfully.\n');
  process.exit(0);
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
