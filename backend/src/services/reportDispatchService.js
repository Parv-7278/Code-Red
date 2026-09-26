const sensorService = require('./sensorService');
const reportRepository = require('../repositories/reportRepository');

const STATIONS = {
  'station-maitri': {
    name: 'Maitri Research Station',
    shortName: 'Maitri',
    region: 'Schirmacher Oasis',
  },
  'station-bharati': {
    name: 'Bharati Research Station',
    shortName: 'Bharati',
    region: 'Larsemann Hills',
  },
};

function asFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateStats(records, field) {
  const values = records.map((record) => asFiniteNumber(record[field])).filter((value) => value !== null);
  if (!values.length) return { current: null, mean: null, min: null, max: null, change: null };
  const current = values[0];
  const oldest = values[values.length - 1];
  return {
    current: +current.toFixed(2),
    mean: +(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2),
    min: +Math.min(...values).toFixed(2),
    max: +Math.max(...values).toFixed(2),
    change: +(current - oldest).toFixed(2),
  };
}

async function stationSummary(stationId, periodStart) {
  const profile = STATIONS[stationId];
  const [allHistory, latest] = await Promise.all([
    sensorService.getHistory(stationId, 300),
    sensorService.getLatestData(stationId),
  ]);
  const history = allHistory
    .filter((record) => new Date(record.recorded_at || record.received_at || 0) >= periodStart);
  const records = history.length ? history : latest ? [latest] : [];

  const generator = calculateStats(records, 'generator_temperature');
  const demand = calculateStats(records, 'power_consumption');
  const battery = calculateStats(records, 'battery_level');
  const temperature = calculateStats(records, 'temperature');
  const wind = calculateStats(records, 'wind_speed');

  const warnings = [];
  if (generator.max !== null && generator.max >= 85) warnings.push(`Generator thermal peak ${generator.max}°C`);
  if (battery.min !== null && battery.min < 40) warnings.push(`Battery reserve minimum ${battery.min}%`);
  if (wind.max !== null && wind.max >= 80) warnings.push(`High wind peak ${wind.max} km/h`);
  const riskScore = Math.min(100,
    (generator.max >= 85 ? 34 : generator.max >= 80 ? 18 : 5)
    + (battery.min < 40 ? 34 : battery.min < 60 ? 18 : 4)
    + (wind.max >= 80 ? 24 : wind.max >= 55 ? 12 : 3),
  );

  return {
    station_id: stationId,
    station_name: profile.name,
    region: profile.region,
    samples_analyzed: records.length,
    latest_packet_at: latest?.recorded_at || latest?.received_at || null,
    status: riskScore >= 60 ? 'CRITICAL' : riskScore >= 30 ? 'WATCH' : 'NOMINAL',
    risk_score: riskScore,
    warnings,
    telemetry: { generator_temperature_c: generator, demand_kw: demand, battery_reserve_pct: battery, outside_temperature_c: temperature, wind_speed_kmh: wind },
    summary: `${profile.shortName} processed ${records.length} telemetry sample${records.length === 1 ? '' : 's'} during the available 12-hour window. `
      + `Generator temperature is ${generator.current ?? 'unavailable'}°C, station demand is ${demand.current ?? 'unavailable'} kW, and battery reserve is ${battery.current ?? 'unavailable'}%.`,
  };
}

function allowedStations(stationId) {
  if (stationId === 'all-stations' || stationId === 'all') return Object.keys(STATIONS);
  return STATIONS[stationId] ? [stationId] : ['station-maitri'];
}

async function generate12HourReport(stationId = 'station-maitri', requestedBy = 'station_operator') {
  const now = new Date();
  const periodStart = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const targetStations = allowedStations(stationId);
  const stationReports = await Promise.all(targetStations.map((id) => stationSummary(id, periodStart)));
  const overallRisk = Math.max(...stationReports.map((report) => report.risk_score));
  const reportId = `POL-12H-${now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}-${targetStations.length === 2 ? 'FLEET' : targetStations[0].split('-')[1].toUpperCase()}`;

  const report = {
    success: true,
    report_id: reportId,
    report_type: '12_HOUR_STATION_OPERATIONS_SUMMARY',
    station_id: targetStations.length === 2 ? 'all-stations' : targetStations[0],
    station_name: targetStations.length === 2 ? 'Maitri & Bharati Stations' : STATIONS[targetStations[0]].name,
    generated_at: now.toISOString(),
    reporting_period: { start: periodStart.toISOString(), end: now.toISOString(), hours: 12 },
    requested_by_role: requestedBy,
    recipient: {
      name: 'India Control Centre',
      organisation: 'NCPOR Mission Operations, Goa',
      channel: 'POLARIS secure internal reporting bus',
    },
    executive_summary: {
      overall_status: overallRisk >= 60 ? 'CRITICAL' : overallRisk >= 30 ? 'WATCH' : 'NOMINAL',
      overall_risk_score: overallRisk,
      stations_covered: targetStations.length,
      ai_summary: stationReports.map((report) => report.summary).join(' '),
    },
    station_reports: Object.fromEntries(stationReports.map((report) => [report.station_id, report])),
    delivery: { status: 'READY', delivered_at: null },
    provenance: 'Calculated from committed POLARIS telemetry history with per-record source labels.',
  };
  const stored = await reportRepository.saveReport(report);
  report.persistence = stored.persistence;
  return report;
}

async function transmitToIndiaHQ(report, requestedBy = 'station_operator', trigger = 'MANUAL') {
  const deliveredAt = new Date().toISOString();
  const delivery = {
    delivery_id: `DLV-${Date.now()}`,
    report_id: report.report_id,
    station_id: report.station_id,
    station_name: report.station_name,
    recipient: report.recipient,
    requested_by_role: requestedBy,
    trigger,
    status: 'DELIVERED_INTERNAL',
    delivered_at: deliveredAt,
    checksum: Buffer.from(`${report.report_id}:${deliveredAt}`).toString('base64').slice(0, 18).toUpperCase(),
  };
  return reportRepository.recordDelivery(delivery);
}

function scheduleKey(stationId) {
  return stationId === 'all' ? 'all-stations' : stationId;
}

async function getSchedule(stationId = 'station-maitri') {
  const key = scheduleKey(stationId);
  const stored = await reportRepository.getSchedule(key);
  return stored || {
    station_scope: key,
    enabled: false,
    cadence_hours: 12,
    recipient: 'India Control Centre · NCPOR Goa',
    next_dispatch_at: null,
    last_dispatch_at: null,
    service_scope: 'Runs while the POLARIS backend service is online',
  };
}

async function updateSchedule(stationId, enabled, requestedBy) {
  const key = scheduleKey(stationId);
  const current = await getSchedule(key);
  const schedule = {
    ...current,
    station_scope: key,
    enabled: Boolean(enabled),
    cadence_hours: 12,
    requested_by_role: requestedBy,
    updated_at: new Date().toISOString(),
    next_dispatch_at: enabled ? new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() : null,
  };
  return reportRepository.upsertSchedule(schedule);
}

async function listDeliveries(stationId) {
  return reportRepository.listDeliveries(scheduleKey(stationId || 'all-stations'));
}

const scheduler = setInterval(async () => {
  const now = new Date();
  try {
    const dueSchedules = await reportRepository.listDueSchedules(now.toISOString());
    for (const schedule of dueSchedules) {
      const key = schedule.station_scope;
      try {
        const report = await generate12HourReport(key, schedule.requested_by_role || 'system_scheduler');
        const delivery = await transmitToIndiaHQ(report, schedule.requested_by_role || 'system_scheduler', 'SCHEDULED');
        await reportRepository.upsertSchedule({
          ...schedule,
          last_dispatch_at: delivery.delivered_at,
          next_dispatch_at: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
        });
      } catch (error) {
        console.error(`[Reports] Scheduled 12-hour report failed for ${key}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[Reports] Schedule polling failed:', error.message);
  }
}, 60 * 1000);
scheduler.unref();

module.exports = {
  generate12HourReport,
  transmitToIndiaHQ,
  getSchedule,
  updateSchedule,
  listDeliveries,
};
