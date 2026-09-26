const alertService = require('../services/alertService');

/**
 * POST /api/alerts
 * Ingest high-priority emergency alerts and enqueue at Priority Level 1 or 2.
 */
async function postAlert(req, res) {
  try {
    const result = await alertService.triggerAlert(req.body);
    return res.status(201).json({
      success: true,
      message: 'Emergency alert received and fast-tracked through Priority Queue.',
      data: result,
    });
  } catch (error) {
    console.error('[AlertController] Error creating alert:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing alert.',
      error: error.message,
    });
  }
}

/**
 * GET /api/alerts
 * Fetch active and recent alerts with optional filters.
 */
async function getAlerts(req, res) {
  try {
    const { stationId, station_id, priority, status } = req.query;
    const targetStation = stationId || station_id;
    const alerts = await alertService.getAlerts({ stationId: targetStation, priority, status });
    return res.json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: 'Alerts could not be loaded.', error: error.message });
  }
}

/**
 * PATCH /api/alerts/:alertId/ack
 * Acknowledge an alert.
 */
async function acknowledge(req, res) {
  try {
    const { alertId } = req.params;
    const updated = await alertService.acknowledgeAlert(alertId, req.auth || {});
    if (!updated) {
      return res.status(404).json({ success: false, message: `Alert '${alertId}' not found.` });
    }
    return res.json({ success: true, message: 'Alert acknowledged successfully.', data: updated });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: 'Alert could not be acknowledged.', error: error.message });
  }
}

/**
 * DELETE /api/alerts/clear
 */
async function clearAll(req, res) {
  try {
    const stationId = req.query.stationId || req.query.station_id || null;
    const result = await alertService.clearAlerts(
      stationId ? { stationId } : {},
      req.auth || {},
      req.body?.resolution_note || 'Bulk resolved through POLARIS operations console.',
    );
    return res.json({ success: true, message: 'Active alerts resolved with an audit record.', data: result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: 'Alerts could not be resolved.', error: error.message });
  }
}

module.exports = {
  postAlert,
  getAlerts,
  acknowledge,
  clearAll,
};
