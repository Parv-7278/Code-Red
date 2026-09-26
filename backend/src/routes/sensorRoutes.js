const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const { validateSensorData } = require('../middleware/validator');
const { requireDeviceIngestAccess, validateStationAccess } = require('../middleware/authRoleMiddleware');

// POST /api/sensor-data - Ingest station sensor reading
router.post('/', requireDeviceIngestAccess, validateSensorData, sensorController.ingestSensorData);

// Human-entered operational test data uses a verified operator session, not a device key.
router.post('/manual', validateStationAccess, validateSensorData, sensorController.ingestManualSensorData);

// GET /api/sensor-data/latest - Latest station telemetry
router.get('/latest', validateStationAccess, sensorController.getLatest);

// GET /api/sensor-data/history - Telemetry history
router.get('/history', validateStationAccess, sensorController.getHistory);

module.exports = router;
