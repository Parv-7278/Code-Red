/**
 * POLARIS Antarctic Station Sensor Simulator.
 * Provides continuous telemetry drift & emergency scenario simulations for Maitri and Bharati.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const TELEMETRY_ENDPOINT = `${BACKEND_URL}/api/telemetry`;
const ALERT_ENDPOINT = `${BACKEND_URL}/api/alerts`;
const DEVICE_INGEST_API_KEY = process.env.DEVICE_INGEST_API_KEY || '';

const STATIONS = {
  'station-maitri': {
    name: 'Maitri Research Station',
    state: {
      temperature: -18.7,
      battery: 74.0,
      battery_level: 74.0,
      power_consumption: 105.0,
      generator_status: 'RUNNING',
      generator_temperature: 78.4,
      wind_speed: 28.0,
      water_level: 88.0,
      comms_status: 'SAT_LINK_NOMINAL',
    }
  },
  'station-bharati': {
    name: 'Bharati Research Station',
    state: {
      temperature: -14.2,
      battery: 91.0,
      battery_level: 91.0,
      power_consumption: 148.0,
      generator_status: 'RUNNING',
      generator_temperature: 74.1,
      wind_speed: 44.0,
      water_level: 94.0,
      comms_status: 'SAT_LINK_NOMINAL',
    }
  }
};

async function postJson(url, data) {
  const targets = [url];
  if (url.includes('5000')) targets.push(url.replace('5000', '8000'));
  else if (url.includes('8000')) targets.push(url.replace('8000', '5000'));

  if (url.includes('/api/telemetry')) targets.push(url.replace('/api/telemetry', '/api/sensor-data'));

  for (const target of targets) {
    try {
      const res = await fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(DEVICE_INGEST_API_KEY ? { 'x-device-api-key': DEVICE_INGEST_API_KEY } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // try next target
    }
  }
  console.error(`[SIMULATOR ERROR] Connection refused for: ${url}`);
  return null;
}

async function runGeneratorThermalRunaway(stationId = 'station-maitri') {
  const stn = STATIONS[stationId];
  const stName = stationId.includes('maitri') ? 'MAITRI' : 'BHARATI';
  console.log(`\n🔥 [SIMULATOR] Initiating Generator Thermal Runaway Scenario for ${stName}...`);
  const steps = [70.0, 78.0, 85.0, 92.0, 95.0];

  for (let i = 0; i < steps.length; i++) {
    const temp = steps[i];
    stn.state.generator_temperature = temp;
    stn.state.generator_status = temp >= 95 ? 'CRITICAL' : temp >= 85 ? 'WARNING' : 'RUNNING';

    const payload = {
      station_id: stationId,
      station_name: stn.name,
      ...stn.state,
      recorded_at: new Date().toISOString(),
    };

    console.log(`[SIMULATOR] Station: ${stName} | Step ${i + 1}/5 | Sending telemetry... | Temp: ${payload.temperature}°C | Gen: ${temp}°C | Status: ${stn.state.generator_status}`);
    await postJson(TELEMETRY_ENDPOINT, payload);

    if (temp >= 95.0) {
      console.log(`[SIMULATOR ALERT] 🚨 ${stName} CRITICAL ALERT: Generator failure risk at 95°C!`);
      const alertPayload = {
        station_id: stationId,
        priority: 'CRITICAL',
        category: 'GENERATOR',
        message: `🚨 ${stName} GENERATOR FAILURE RISK: Core temperature breached 95°C! Immediate shutdown required.`,
        sensor_key: 'generator_temperature',
        sensor_value: temp,
        threshold_value: 90.0,
        action_required: 'Switch to Generator 2 and initiate non-critical load shedding.',
        triggered_at: new Date().toISOString(),
      };
      await postJson(ALERT_ENDPOINT, alertPayload);
    }

    await new Promise((r) => setTimeout(r, 1400));
  }

  console.log(`✅ [SIMULATOR] Generator Thermal Runaway completed.\n`);
}

function driftSensors(stationId) {
  const stn = STATIONS[stationId];
  const s = stn.state;

  s.temperature = +(s.temperature + (Math.random() * 0.4 - 0.2)).toFixed(2);
  s.battery_level = +(Math.max(60, Math.min(100, s.battery_level + (Math.random() * 0.2 - 0.1)))).toFixed(2);
  s.power_consumption = +(Math.max(50, Math.min(180, s.power_consumption + (Math.random() * 1.2 - 0.6)))).toFixed(2);
  s.generator_temperature = +(Math.max(68, Math.min(82, s.generator_temperature + (Math.random() * 0.6 - 0.3)))).toFixed(2);
  s.wind_speed = +(Math.max(10, Math.min(85, s.wind_speed + (Math.random() * 2.0 - 1.0)))).toFixed(2);
  s.water_level = +(Math.max(50, Math.min(100, s.water_level + (Math.random() * 0.1 - 0.05)))).toFixed(2);

  return {
    station_id: stationId,
    station_name: stn.name,
    ...s,
    recorded_at: new Date().toISOString(),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const isScenario = args.includes('--scenario') || args.includes('-s') || args.includes('generator_overheat');

  console.log('==================================================================');
  console.log('🏔️  [SIMULATOR] Starting POLARIS Station Telemetry Simulator');
  console.log(`📡 Telemetry Target: ${TELEMETRY_ENDPOINT}`);
  console.log(`🚨 Alert Target:     ${ALERT_ENDPOINT}`);
  console.log('==================================================================');

  if (isScenario) {
    await runGeneratorThermalRunaway('station-maitri');
    return;
  }

  console.log('▶️  [SIMULATOR] Starting normal multi-station telemetry stream (Press Ctrl+C to stop)...\n');
  
  const tick = async () => {
    for (const stnId of Object.keys(STATIONS)) {
      const payload = driftSensors(stnId);
      const stName = stnId.includes('maitri') ? 'MAITRI' : 'BHARATI';
      const res = await postJson(TELEMETRY_ENDPOINT, payload);
      if (res) {
        console.log(`[SIMULATOR] Station: ${stName} | Sending telemetry... | Temp: ${payload.temperature}°C | Gen: ${payload.generator_temperature}°C | Battery: ${payload.battery_level}% | Response: 200 OK`);
      }
    }
  };

  await tick();
  setInterval(tick, 3000);
}

main();
