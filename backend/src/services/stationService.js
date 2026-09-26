const sensorService = require('./sensorService');
const alertService = require('./alertService');
const { supabase, isConfigured } = require('../config/supabase');

const STATION_METADATA = {
  'station-maitri': {
    id: 'station-maitri',
    name: 'Maitri Research Station',
    shortName: 'MAITRI',
    region: 'Schirmacher Oasis, Queen Maud Land',
    coordinates: {
      latitude: -70.765833,
      longitude: 11.735833,
      formatted: '70°45′57″S, 11°44′09″E',
    },
    commissioned_year: 1989,
    altitude: '117 m above sea level',
    environmentType: 'Inland Rocky Moraine (Lake Priyadarshini Oasis)',
    timezone: 'UTC',
    timezone_label: 'UTC+0',
    nominal_operating_limits: {
      generator_max_temp_c: 85.0,
      critical_temp_c: 90.0,
      battery_min_percent: 25.0,
      wind_max_kmh: 90.0,
    }
  },
  'station-bharati': {
    id: 'station-bharati',
    name: 'Bharati Research Station',
    shortName: 'BHARATI',
    region: 'Larsemann Hills, East Antarctica',
    coordinates: {
      latitude: -69.407778,
      longitude: 76.187222,
      formatted: '69°24′28″S, 76°11′14″E',
    },
    commissioned_year: 2012,
    altitude: '35 m above sea level',
    environmentType: 'Coastal Antarctic Promontory (Prydz Bay Maritime)',
    timezone: 'Antarctica/Mawson',
    timezone_label: 'UTC+5',
    nominal_operating_limits: {
      generator_max_temp_c: 85.0,
      critical_temp_c: 90.0,
      battery_min_percent: 25.0,
      wind_max_kmh: 90.0,
    }
  }
};

// Remote operations audit log
const remoteOperationsLog = [
  {
    id: 'cmd-init-01',
    command: 'INITIALIZE SATELLITE TELEMETRY UPLINK',
    stationId: 'station-maitri',
    operator: 'Dr. Rajesh Sharma (India HQ)',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    mode: 'SIMULATION',
    status: 'COMPLETED_SIMULATION',
    result: 'Simulated telemetry link established with NCPOR Goa.'
  },
  {
    id: 'cmd-init-02',
    command: 'ENGAGE SEAWATER DESALINIZATION TRACE HEATING',
    stationId: 'station-bharati',
    operator: 'Dr. Sunita Deshmukh (Bharati Lead)',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    mode: 'SIMULATION',
    status: 'COMPLETED_SIMULATION',
    result: 'Simulated Prydz Bay subsea intake heating set to 45% power.'
  }
];

function normalizeStationId(s) {
  if (!s) return 'station-maitri';
  const l = s.toLowerCase();
  if (l.includes('maitri')) return 'station-maitri';
  if (l.includes('bharati')) return 'station-bharati';
  return 'station-maitri';
}

async function getStationStatus(stationId) {
  const normId = normalizeStationId(stationId);
  const meta = STATION_METADATA[normId];
  if (!meta) return null;

  const latestTelemetry = await sensorService.getLatestData(normId);
  const stationAlerts = await alertService.getAlerts({ station_id: normId, status: 'ACTIVE' });

  let overallHealth = 'NOMINAL';
  const hasCritical = stationAlerts.some(a => a.priority === 'CRITICAL') || (latestTelemetry?.generator_temperature > 90);
  const hasWarning = stationAlerts.some(a => a.priority === 'HIGH' || a.priority === 'MEDIUM') || (latestTelemetry?.generator_temperature >= 85);

  if (hasCritical) {
    overallHealth = 'CRITICAL';
  } else if (hasWarning) {
    overallHealth = 'WARNING';
  }

  return {
    station_id: normId,
    metadata: meta,
    overall_health: overallHealth,
    health_index: normId === 'station-maitri' ? 87 : 93,
    active_alert_count: stationAlerts.length,
    active_alerts: stationAlerts,
    latest_sensors: latestTelemetry,
    comms_link: {
      status: latestTelemetry?.comms_status || 'SAT_LINK_NOMINAL',
      protocol: 'SIMULATED_PRIORITY_SATELLITE_UPLINK',
      timestamp: new Date().toISOString(),
    }
  };
}

function getStationResearch(stationId) {
  const normId = normalizeStationId(stationId);
  const isMaitri = normId === 'station-maitri';
  const t = Date.now() / 1000;

  return {
    station_id: normId,
    station_name: isMaitri ? 'MAITRI' : 'BHARATI',
    observatory_name: isMaitri 
      ? 'Maitri Solid Earth Geomagnetic & Seismic Observatory' 
      : 'Bharati Polar Earth & Remote Sensing Marine Observatory',
    timestamp: new Date().toISOString(),
    seismic: {
      dominant_frequency_hz: isMaitri 
        ? +(1.85 + 0.3 * Math.sin(t / 8)).toFixed(3)
        : +(3.65 + 0.8 * Math.sin(t / 6)).toFixed(3),
      peak_frequency_hz: isMaitri ? 2.45 : 4.85,
      avg_frequency_hz: isMaitri ? 1.76 : 3.52,
      trend: isMaitri ? '↑ 3.8%' : '↑ 5.4%',
      peak_ground_acceleration_g: isMaitri ? 0.00185 : 0.00420,
      tremor_amplitude_um: isMaitri ? +(3.2 + 0.5 * Math.sin(t / 4)).toFixed(2) : +(6.4 + 1.1 * Math.cos(t / 5)).toFixed(2),
      status: isMaitri ? 'NOMINAL' : 'ELEVATED',
      raw_status: isMaitri ? 'NOMINAL_MICROSEISMIC' : 'ELEVATED_COASTAL_MICRO_SURGE',
      event_classification: isMaitri ? 'TECTONIC_BASEMENT_MICRO_FRACTURE' : 'PRYDZ_BAY_ICE_SHELF_TIDAL_FLEXURE',
      borehole_depth_meters: isMaitri ? 45.0 : 65.0,
      sensor_model: 'Nanometrics Trillium 120QA Borehole Seismometer',
    },
    snow_accumulation: {
      snowpack_total_depth_cm: isMaitri ? 142.5 : 215.8,
      snow_accumulation_24h_cm: isMaitri ? 12.4 : 24.2,
      rate_cm_day: isMaitri ? 2.1 : 4.8,
      snow_accumulation_7d_cm: isMaitri ? 58.2 : 94.6,
      trend: 'INCREASING',
      drift_accumulation_rate_cm_per_hr: isMaitri ? 0.85 : 1.75,
      snow_density_kg_per_m3: isMaitri ? 345.0 : 390.0,
      subsurface_firn_temperature_c: isMaitri ? -16.4 : -12.8,
      status: isMaitri ? 'NORMAL' : 'WARNING',
      sensor_model: 'Campbell Scientific SR50A Acoustic Ultrasonic Depth Sensor',
    },
    geomagnetic_kp: {
      kp_index_current: isMaitri ? +(2.33 + 0.4 * Math.sin(t / 20)).toFixed(2) : +(2.85 + 0.5 * Math.sin(t / 18)).toFixed(2),
      status: isMaitri ? 'QUIET' : 'ACTIVE',
      storm_classification: 'G1_MINOR_UNSETTLED',
      trend: '↑ INCREASING',
      total_magnetic_field_intensity_nt: isMaitri ? 42875.2 : 44120.8,
      horizontal_component_h_nt: isMaitri ? 18632.4 : 19410.5,
      magnetic_declination_deg: isMaitri ? -21.4 : 64.8,
      auroral_electrojet_activity: isMaitri ? 'Active Auroral Bands Visible' : 'Dynamic Corona Visible',
      ionospheric_scintillation_s4: isMaitri ? 0.165 : 0.185,
      sensor_model: 'Fluxgate Tri-Axial Magnetometer (dIdD)',
    },
    crew_biotelemetry: {
      active_overwintering_personnel: isMaitri ? 24 : 42,
      count: isMaitri ? 24 : 42,
      average_heart_rate_bpm: isMaitri ? 73.0 : 76.0,
      average_spo2_percent: isMaitri ? 98.4 : 97.2,
      average_stress_index: isMaitri ? 24.0 : 28.0,
      average_activity: 'NORMAL',
      status: 'HEALTHY',
      aggregation: 'SIMULATED / AGGREGATED',
      hypothermia_alert_count: 0,
      crew_summary: isMaitri 
        ? 'All 24 overwintering researchers report nominal biometric vitals and healthy sleep cycles.' 
        : 'All 42 overwintering researchers and satellite engineers report optimal telemetry parameters.'
    },
    systems_status: {
      seismic: 'ONLINE',
      snow: 'ONLINE',
      geomagnetic: 'ONLINE',
      telemetry_link: 'LIVE',
      data_sync: 'CONNECTED',
    }
  };
}

async function getRemoteOperations(stationId) {
  const normId = normalizeStationId(stationId);
  let list = remoteOperationsLog.filter(c => c.stationId === normId || c.stationId === 'all');

  if (isConfigured()) {
    try {
      const { data, error } = await supabase
        .from('remote_operations')
        .select('*')
        .eq('station_id', normId)
        .order('requested_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      if (data?.length) {
        list = data.map((row) => ({
          id: row.id,
          command: row.command,
          commandCode: row.command_code,
          stationId: row.station_id,
          operator: row.operator_name,
          timestamp: row.requested_at,
          requested_at: row.requested_at,
          completed_at: row.completed_at,
          mode: row.mode,
          status: row.status,
          result: row.result,
        }));
      }
    } catch (error) {
      console.error('[Supabase] Error loading remote operations:', error.message);
    }
  }
  return {
    station_id: normId,
    available_commands: [
      { id: 'SWITCH_BACKUP_GEN', label: 'Switch to Backup Generator (G-02 → G-01)', priority: 'HIGH', category: 'POWER' },
      { id: 'EMERGENCY_LOAD_SHED', label: 'Initiate Non-Critical Load Shedding', priority: 'MEDIUM', category: 'POWER' },
      { id: 'BOOST_TRACE_HEATING', label: 'Boost Pipeline Anti-Freeze Trace Heating', priority: 'MEDIUM', category: 'THERMAL' },
      { id: 'RESET_COMMS_MAST', label: 'Recalibrate X-Band Satcom Uplink Dish', priority: 'LOW', category: 'COMMUNICATION' },
      { id: 'ISOLATE_BESS', label: 'Isolate Battery Bank Cell String #3', priority: 'HIGH', category: 'STORAGE' }
    ],
    execution_history: list
  };
}

function executeRemoteOperation(stationId, commandData, operatorName = 'Mission Controller') {
  const normId = normalizeStationId(stationId);
  const cmdId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  
  const record = {
    id: cmdId,
    command: commandData.command || commandData.label || 'MANUAL REMOTE OVERRIDE',
    commandCode: commandData.commandCode || 'CUSTOM_COMMAND',
    stationId: normId,
    operator: operatorName,
    timestamp: new Date().toISOString(),
    requested_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    mode: 'SIMULATION',
    status: 'COMPLETED_SIMULATION',
    result: `Command accepted and completed by the ${STATION_METADATA[normId].name} digital-twin simulator.`
  };

  remoteOperationsLog.unshift(record);
  if (remoteOperationsLog.length > 50) remoteOperationsLog.pop();

  if (isConfigured()) {
    const databaseRecord = {
      id: record.id,
      station_id: record.stationId,
      command: record.command,
      command_code: record.commandCode,
      operator_name: record.operator,
      mode: record.mode,
      status: record.status,
      result: record.result,
      requested_at: record.requested_at,
      completed_at: record.completed_at,
    };
    supabase.from('remote_operations').insert([databaseRecord]).then(({ error }) => {
      if (error) console.error('[Supabase] Error saving remote operation:', error.message);
    });
  }

  // If command is generator switch, resolve any high generator temp in memory!
  if (record.command.includes('BACKUP') || record.command.includes('GEN')) {
    sensorService.processSensorData({
      station_id: normId,
      temperature: normId === 'station-maitri' ? -18.7 : -14.2,
      battery_level: normId === 'station-maitri' ? 74.0 : 91.0,
      power_consumption: normId === 'station-maitri' ? 105.0 : 148.0,
      generator_status: 'RUNNING',
      generator_temperature: 70.0, // Back to safe nominal!
      wind_speed: normId === 'station-maitri' ? 28.0 : 44.0,
      water_level: 90.0,
      comms_status: 'SAT_LINK_NOMINAL'
    });
  }

  return record;
}

module.exports = {
  getStationStatus,
  getStationResearch,
  getRemoteOperations,
  executeRemoteOperation,
  STATION_METADATA,
  normalizeStationId,
};
