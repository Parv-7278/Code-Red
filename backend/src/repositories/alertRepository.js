const { supabase, isConfigured } = require('../config/supabase');

const memoryAlerts = new Map();

class AlertRepositoryError extends Error {
  constructor(message, statusCode = 503, cause = null) {
    super(message);
    this.name = 'AlertRepositoryError';
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

function normalizeAlert(row) {
  if (!row) return null;
  return {
    ...row,
    id: row.event_id || String(row.id),
  };
}

async function getAlertByEventId(eventId) {
  if (!isConfigured()) return memoryAlerts.get(eventId) || null;

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle();
  if (error) throw new AlertRepositoryError(`Alert '${eventId}' could not be loaded.`, 503, error);
  return normalizeAlert(data);
}

async function findActiveByDeduplicationKey(deduplicationKey) {
  if (!isConfigured()) {
    return Array.from(memoryAlerts.values()).find(
      (alert) => alert.deduplication_key === deduplicationKey && alert.status === 'ACTIVE',
    ) || null;
  }

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('deduplication_key', deduplicationKey)
    .eq('status', 'ACTIVE')
    .order('triggered_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new AlertRepositoryError('Active alert deduplication check failed.', 503, error);
  return normalizeAlert(data);
}

async function createOrRefreshAlert(alert) {
  const existing = await findActiveByDeduplicationKey(alert.deduplication_key);
  if (existing) {
    const refreshed = {
      ...existing,
      message: alert.message,
      sensor_value: alert.sensor_value,
      threshold_value: alert.threshold_value,
      triggered_at: alert.triggered_at,
      occurrence_count: Number(existing.occurrence_count || 1) + 1,
      last_observed_at: alert.triggered_at,
    };

    if (!isConfigured()) {
      memoryAlerts.set(existing.id, refreshed);
      return { alert: refreshed, duplicate: true };
    }

    const { data, error } = await supabase
      .from('alerts')
      .update({
        message: refreshed.message,
        sensor_value: refreshed.sensor_value,
        threshold_value: refreshed.threshold_value,
        triggered_at: refreshed.triggered_at,
        occurrence_count: refreshed.occurrence_count,
        last_observed_at: refreshed.last_observed_at,
      })
      .eq('event_id', existing.id)
      .select('*')
      .single();
    if (error) throw new AlertRepositoryError('Active alert could not be refreshed.', 503, error);
    return { alert: normalizeAlert(data), duplicate: true };
  }

  if (!isConfigured()) {
    memoryAlerts.set(alert.id, alert);
    return { alert, duplicate: false };
  }

  const payload = {
    event_id: alert.id,
    station_id: alert.station_id,
    priority: alert.priority,
    category: alert.category,
    message: alert.message,
    sensor_key: alert.sensor_key,
    sensor_value: alert.sensor_value,
    threshold_value: alert.threshold_value,
    status: alert.status,
    triggered_at: alert.triggered_at,
    deduplication_key: alert.deduplication_key,
    occurrence_count: alert.occurrence_count,
    last_observed_at: alert.last_observed_at,
  };
  const { data, error } = await supabase.from('alerts').insert([payload]).select('*').single();
  if (error) throw new AlertRepositoryError('Alert could not be committed to Supabase.', 503, error);
  return { alert: normalizeAlert(data), duplicate: false };
}

async function listAlerts(filter = {}) {
  if (!isConfigured()) {
    let alerts = Array.from(memoryAlerts.values());
    if (filter.station_id || filter.stationId) {
      const stationId = filter.station_id || filter.stationId;
      alerts = alerts.filter((alert) => alert.station_id === stationId);
    }
    if (filter.priority) alerts = alerts.filter((alert) => alert.priority === String(filter.priority).toUpperCase());
    if (filter.status) alerts = alerts.filter((alert) => alert.status === String(filter.status).toUpperCase());
    return alerts.sort((a, b) => new Date(b.triggered_at) - new Date(a.triggered_at));
  }

  let query = supabase.from('alerts').select('*').order('triggered_at', { ascending: false }).limit(300);
  if (filter.station_id || filter.stationId) query = query.eq('station_id', filter.station_id || filter.stationId);
  if (filter.priority) query = query.eq('priority', String(filter.priority).toUpperCase());
  if (filter.status) query = query.eq('status', String(filter.status).toUpperCase());
  const { data, error } = await query;
  if (error) throw new AlertRepositoryError('Alerts could not be loaded.', 503, error);
  return (data || []).map(normalizeAlert);
}

async function acknowledgeAlert(eventId, actor = {}) {
  const existing = await getAlertByEventId(eventId);
  if (!existing) return null;
  const acknowledgedAt = new Date().toISOString();
  const updated = {
    ...existing,
    status: 'ACKNOWLEDGED',
    acknowledged_by: actor.userId || null,
    acknowledged_by_name: actor.fullName || actor.role || 'authenticated_operator',
    acknowledged_at: acknowledgedAt,
  };

  if (!isConfigured()) {
    memoryAlerts.set(eventId, updated);
    return updated;
  }

  const { data, error } = await supabase
    .from('alerts')
    .update({
      status: updated.status,
      acknowledged_by: updated.acknowledged_by,
      acknowledged_by_name: updated.acknowledged_by_name,
      acknowledged_at: updated.acknowledged_at,
    })
    .eq('event_id', eventId)
    .select('*')
    .single();
  if (error) throw new AlertRepositoryError(`Alert '${eventId}' could not be acknowledged.`, 503, error);
  return normalizeAlert(data);
}

async function resolveAlerts(filter = {}, actor = {}, resolutionNote = 'Resolved through POLARIS operations console.') {
  const active = await listAlerts({ ...filter, status: 'ACTIVE' });
  if (!active.length) return { resolved_count: 0 };
  const resolvedAt = new Date().toISOString();
  const eventIds = active.map((alert) => alert.id);

  if (!isConfigured()) {
    for (const alert of active) {
      memoryAlerts.set(alert.id, {
        ...alert,
        status: 'RESOLVED',
        resolved_by: actor.userId || null,
        resolved_by_name: actor.fullName || actor.role || 'authenticated_operator',
        resolved_at: resolvedAt,
        resolution_note: resolutionNote,
      });
    }
    return { resolved_count: active.length };
  }

  const { error } = await supabase
    .from('alerts')
    .update({
      status: 'RESOLVED',
      resolved_by: actor.userId || null,
      resolved_by_name: actor.fullName || actor.role || 'authenticated_operator',
      resolved_at: resolvedAt,
      resolution_note: resolutionNote,
    })
    .in('event_id', eventIds);
  if (error) throw new AlertRepositoryError('Alerts could not be resolved.', 503, error);
  return { resolved_count: active.length };
}

function resetMemoryStoreForTests() {
  memoryAlerts.clear();
}

module.exports = {
  createOrRefreshAlert,
  listAlerts,
  getAlertByEventId,
  acknowledgeAlert,
  resolveAlerts,
  resetMemoryStoreForTests,
  AlertRepositoryError,
};
