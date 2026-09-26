const { supabase, isConfigured } = require('../config/supabase');

const memorySchedules = new Map();
const memoryDocuments = new Map();
const memoryDeliveries = [];

class ReportRepositoryError extends Error {
  constructor(message, cause = null) {
    super(message);
    this.name = 'ReportRepositoryError';
    this.statusCode = 503;
    this.cause = cause;
  }
}

async function saveReport(report) {
  if (!isConfigured()) {
    memoryDocuments.set(report.report_id, report);
    return { report_id: report.report_id, persistence: 'MEMORY_SIMULATION' };
  }
  const payload = {
    report_id: report.report_id,
    report_type: report.report_type,
    station_scope: report.station_id,
    period_start: report.reporting_period.start,
    period_end: report.reporting_period.end,
    generated_at: report.generated_at,
    payload: report,
  };
  const { data, error } = await supabase.from('report_documents').upsert(payload).select('*').single();
  if (error) throw new ReportRepositoryError('Generated report could not be saved.', error);
  return { report_id: data.report_id, persistence: 'SUPABASE' };
}

async function recordDelivery(delivery) {
  if (!isConfigured()) {
    memoryDeliveries.unshift(delivery);
    if (memoryDeliveries.length > 100) memoryDeliveries.pop();
    return { ...delivery, persistence: 'MEMORY_SIMULATION' };
  }
  const payload = {
    delivery_id: delivery.delivery_id,
    report_id: delivery.report_id,
    station_scope: delivery.station_id,
    destination: delivery.recipient,
    trigger: delivery.trigger,
    status: delivery.status,
    requested_by_role: delivery.requested_by_role,
    delivered_at: delivery.delivered_at,
    checksum: delivery.checksum,
  };
  const { data, error } = await supabase.from('report_deliveries').insert(payload).select('*').single();
  if (error) throw new ReportRepositoryError('Report delivery could not be recorded.', error);
  return {
    ...delivery,
    ...data,
    station_id: data.station_scope,
    recipient: data.destination,
    persistence: 'SUPABASE',
  };
}

async function getSchedule(stationScope) {
  if (!isConfigured()) return memorySchedules.get(stationScope) || null;
  const { data, error } = await supabase
    .from('report_schedules')
    .select('*')
    .eq('station_scope', stationScope)
    .maybeSingle();
  if (error) throw new ReportRepositoryError('Report schedule could not be loaded.', error);
  return data;
}

async function upsertSchedule(schedule) {
  const payload = {
    station_scope: schedule.station_scope,
    enabled: Boolean(schedule.enabled),
    cadence_hours: schedule.cadence_hours || 12,
    recipient: schedule.recipient || 'India Control Centre · NCPOR Goa',
    requested_by_role: schedule.requested_by_role || null,
    next_dispatch_at: schedule.next_dispatch_at || null,
    last_dispatch_at: schedule.last_dispatch_at || null,
    service_scope: schedule.service_scope || 'POLARIS durable report scheduler',
    updated_at: schedule.updated_at || new Date().toISOString(),
  };
  if (!isConfigured()) {
    memorySchedules.set(payload.station_scope, payload);
    return { ...payload, persistence: 'MEMORY_SIMULATION' };
  }
  const { data, error } = await supabase
    .from('report_schedules')
    .upsert(payload, { onConflict: 'station_scope' })
    .select('*')
    .single();
  if (error) throw new ReportRepositoryError('Report schedule could not be saved.', error);
  return { ...data, persistence: 'SUPABASE' };
}

async function listDueSchedules(nowIso) {
  if (!isConfigured()) {
    return Array.from(memorySchedules.values()).filter(
      (schedule) => schedule.enabled && schedule.next_dispatch_at && schedule.next_dispatch_at <= nowIso,
    );
  }
  const { data, error } = await supabase
    .from('report_schedules')
    .select('*')
    .eq('enabled', true)
    .lte('next_dispatch_at', nowIso);
  if (error) throw new ReportRepositoryError('Due report schedules could not be loaded.', error);
  return data || [];
}

async function listDeliveries(stationScope) {
  if (!isConfigured()) {
    const deliveries = !stationScope || stationScope === 'all-stations'
      ? memoryDeliveries
      : memoryDeliveries.filter((item) => item.station_id === stationScope || item.station_id === 'all-stations');
    return deliveries.slice(0, 12);
  }
  let query = supabase.from('report_deliveries').select('*').order('delivered_at', { ascending: false }).limit(12);
  if (stationScope && stationScope !== 'all-stations') {
    query = query.in('station_scope', [stationScope, 'all-stations']);
  }
  const { data, error } = await query;
  if (error) throw new ReportRepositoryError('Report delivery history could not be loaded.', error);
  return (data || []).map((row) => ({
    ...row,
    station_id: row.station_scope,
    recipient: row.destination,
  }));
}

module.exports = {
  saveReport,
  recordDelivery,
  getSchedule,
  upsertSchedule,
  listDueSchedules,
  listDeliveries,
  ReportRepositoryError,
};
