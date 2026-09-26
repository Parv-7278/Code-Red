const sensorService = require('../services/sensorService');
const { defaultSatelliteLink } = require('../queue/satelliteLink');

/**
 * POST /api/sensor-data
 * Ingests station sensor data, validates, detects critical anomalies, and queues message.
 */
async function ingestSensorData(req, res) {
  try {
    const result = await sensorService.processSensorData(req.body);
    
    // Status code: 201 Created (or 202 Accepted into priority queue)
    const statusCode = result.duplicate ? 200 : result.criticalConditionDetected ? 201 : 202;
    
    return res.status(statusCode).json({
      success: true,
      message: result.duplicate
        ? 'Duplicate telemetry packet ignored; the original committed record was returned.'
        : result.criticalConditionDetected
        ? 'Sensor data ingested. CRITICAL condition detected and priority alert dispatched!'
        : 'Sensor data ingested and enqueued for satellite transmission.',
      data: result,
    });
  } catch (error) {
    console.error('[SensorController] Error processing sensor data:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: 'Internal server error while processing sensor data.',
      error: error.message,
    });
  }
}

/**
 * GET /api/sensor-data/latest or /api/telemetry/latest
 */
async function getLatest(req, res) {
  try {
    const { stationId, station_id } = req.query;
    const targetStation = stationId || station_id;
    const data = await sensorService.getLatestData(targetStation);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: 'Latest telemetry could not be loaded.',
      error: error.message,
    });
  }
}

async function ingestManualSensorData(req, res) {
  try {
    const operator = req.auth || {};
    const result = await sensorService.processSensorData({
      ...req.body,
      source: 'MANUAL_TEST',
      device_id: req.body.device_id || `${req.body.station_id}-manual-console`,
      submitted_by: {
        user_id: operator.userId || null,
        full_name: operator.fullName || req.headers['x-operator-name'] || 'Demo Operator',
        role: operator.role || req.headers['x-user-role'] || 'unknown',
        reason: req.body.reason || 'Operational test input',
      },
    });
    const statusCode = result.duplicate ? 200 : result.criticalConditionDetected ? 201 : 202;
    return res.status(statusCode).json({
      success: true,
      message: result.duplicate
        ? 'Duplicate manual telemetry packet ignored.'
        : 'Manual operational telemetry validated, committed, and evaluated.',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: 'Manual operational telemetry could not be processed.',
      error: error.message,
    });
  }
}

/**
 * GET /api/sensor-data/history or /api/telemetry/history
 */
async function getHistory(req, res) {
  try {
    const { stationId, station_id, limit } = req.query;
    const targetStation = stationId || station_id;
    const data = await sensorService.getHistory(targetStation, limit ? parseInt(limit, 10) : 50);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: 'Telemetry history could not be loaded.',
      error: error.message,
    });
  }
}

/**
 * GET /api/telemetry/queue-metrics
 */
function getQueueMetrics(req, res) {
  const metrics = defaultSatelliteLink.getMetrics();
  return res.json({ success: true, data: metrics });
}

module.exports = {
  ingestSensorData,
  ingestManualSensorData,
  getLatest,
  getHistory,
  getQueueMetrics,
};
