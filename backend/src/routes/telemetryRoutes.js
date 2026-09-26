const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const { validateSensorData } = require('../middleware/validator');
const { requireDeviceIngestAccess, validateStationAccess } = require('../middleware/authRoleMiddleware');

// POST /api/telemetry (Alias for /api/sensor-data)
router.post('/', requireDeviceIngestAccess, validateSensorData, sensorController.ingestSensorData);

// Human-entered operational test data uses a verified operator session, not a device key.
router.post('/manual', validateStationAccess, validateSensorData, sensorController.ingestManualSensorData);

// GET /api/telemetry/latest
router.get('/latest', validateStationAccess, sensorController.getLatest);

// GET /api/telemetry/history
router.get('/history', validateStationAccess, sensorController.getHistory);

// GET /api/telemetry/queue-metrics (Satellite link & Priority Queue stats)
router.get('/queue-metrics', sensorController.getQueueMetrics);

module.exports = router;
