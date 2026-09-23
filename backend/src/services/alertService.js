const { supabase, isConfigured } = require('../config/supabase');
const { defaultSatelliteLink } = require('../queue/satelliteLink');

const activeAlerts = [];
const alertHistory = [];

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
    packet_type: 'EMERGENCY_ALERT',
  };

  // Submit directly to Satellite Link with top Priority Level
  const enqueued = defaultSatelliteLink.submitPacket(alertRecord, priorityLevel);

  // Store in memory (deduplicating recent same alert if duplicate)
  const existingIndex = activeAlerts.findIndex(
    a => a.station_id === stationId && a.category === alertRecord.category && a.status === 'ACTIVE'
  );
  if (existingIndex >= 0) {
    activeAlerts.splice(existingIndex, 1);
  }
  activeAlerts.unshift(alertRecord);
  alertHistory.unshift(alertRecord);
  if (alertHistory.length > 200) alertHistory.pop();

  // Asynchronously persist to Supabase if credentials are provided
  if (isConfigured()) {
    const supabasePayload = {
      event_id: alertRecord.id,
      station_id: alertRecord.station_id,
      priority: alertRecord.priority,
      category: alertRecord.category,
      message: alertRecord.message,
      sensor_key: alertRecord.sensor_key,
      sensor_value: alertRecord.sensor_value,
      threshold_value: alertRecord.threshold_value,
      status: alertRecord.status,
      triggered_at: alertRecord.triggered_at,
    };

    supabase.from('alerts').insert([supabasePayload]).then(({ error }) => {
      if (error) console.error('[Supabase] Error saving alerts:', error.message);
    });
  }

  return { 
    status: 'DISPATCHED_PRIORITY', 
    alert: alertRecord, 
    queueInfo: {
      priority: enqueued.priority,
      queued_at: enqueued.queued_at,
    }
  };
}

function getAlerts(filter = {}) {
  let list = activeAlerts;

  if (filter.station_id || filter.stationId) {
    const sId = filter.station_id || filter.stationId;
    list = list.filter(a => a.station_id === sId);
  }

  if (filter.priority) {
    list = list.filter(a => a.priority.toUpperCase() === filter.priority.toUpperCase());
  }

  if (filter.status) {
    list = list.filter(a => a.status.toUpperCase() === filter.status.toUpperCase());
  }

  return list;
}

function acknowledgeAlert(alertId) {
  const alert = activeAlerts.find(a => a.id === alertId);
  if (alert) {
    alert.status = 'ACKNOWLEDGED';
    if (isConfigured()) {
      supabase.from('alerts').update({ status: 'ACKNOWLEDGED' }).eq('event_id', alertId).then(({ error }) => {
        if (error) console.error('[Supabase] Error acknowledging alert:', error.message);
      });
    }
    return alert;
  }
  return null;
}

function clearAlerts() {
  activeAlerts.length = 0;
  return { status: 'CLEARED' };
}

module.exports = {
  triggerAlert,
  getAlerts,
  acknowledgeAlert,
  clearAlerts,
};
