const { defaultSatelliteLink } = require('../queue/satelliteLink');
const alertRepository = require('../repositories/alertRepository');

/**
 * Handle high-priority emergency alerts
 */
async function triggerAlert(data) {
  const stationId = data.station_id || 'station-bharati';
  const priority = (data.priority || 'CRITICAL').toUpperCase();
  const nowIso = new Date().toISOString();
  
  // Map textual priority to numeric level (1 is highest, 4 is lowest)
  const priorityLevel = priority === 'CRITICAL' ? 1 : priority === 'HIGH' ? 2 : priority === 'MEDIUM' ? 3 : 4;

  const alertRecord = {
    id: data.id || `alt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    station_id: stationId,
    priority: priority,
    category: data.category || 'GENERATOR',
    message: data.message || 'Critical threshold breached',
    sensor_key: data.sensor_key || 'generator_temperature',
    sensor_value: Number(data.sensor_value ?? 95.0),
    threshold_value: Number(data.threshold_value ?? 90.0),
    status: data.status || 'ACTIVE',
    triggered_at: data.triggered_at || data.timestamp || nowIso,
    created_at: nowIso,
    deduplication_key: data.deduplication_key
      || `${stationId}:${data.category || 'GENERATOR'}:${data.sensor_key || 'generator_temperature'}:${priority}`,
    occurrence_count: 1,
    last_observed_at: data.triggered_at || data.timestamp || nowIso,
    packet_type: 'EMERGENCY_ALERT',
  };

  const persisted = await alertRepository.createOrRefreshAlert(alertRecord);
  const enqueued = persisted.duplicate ? null : defaultSatelliteLink.submitPacket(persisted.alert, priorityLevel);

  return { 
    status: persisted.duplicate ? 'ACTIVE_ALERT_REFRESHED' : 'DISPATCHED_PRIORITY',
    duplicate: persisted.duplicate,
    alert: persisted.alert,
    queueInfo: enqueued ? {
      priority: enqueued.priority,
      queued_at: enqueued.queued_at,
    } : null,
  };
}

async function getAlerts(filter = {}) {
  return alertRepository.listAlerts(filter);
}

async function acknowledgeAlert(alertId, actor = {}) {
  const alert = await alertRepository.getAlertByEventId(alertId);
  if (!alert) return null;
  if (actor.role === 'station_operator' && actor.stationId !== alert.station_id) {
    const error = new Error(`Station operator assigned to '${actor.stationId}' cannot acknowledge '${alert.station_id}' alerts.`);
    error.statusCode = 403;
    throw error;
  }
  return alertRepository.acknowledgeAlert(alertId, actor);
}

async function clearAlerts(filter = {}, actor = {}, resolutionNote) {
  return alertRepository.resolveAlerts(filter, actor, resolutionNote);
}

module.exports = {
  triggerAlert,
  getAlerts,
  acknowledgeAlert,
  clearAlerts,
};
