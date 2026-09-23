const express = require('express');
const router = express.Router();
const stationController = require('../controllers/stationController');
const { requireAuthenticated, validateStationAccess } = require('../middleware/authRoleMiddleware');

// GET /api/stations - List all stations
router.get('/', requireAuthenticated, stationController.listStations);

// GET /api/stations/:stationId/status - Get health & status
router.get('/:stationId/status', validateStationAccess, stationController.getStationStatus);
router.get('/:stationId/health', validateStationAccess, stationController.getStationStatus);

// GET /api/stations/:stationId/research - Dedicated scientific research telemetry
router.get('/:stationId/research', validateStationAccess, stationController.getStationResearch);

// Remote operations endpoints
router.get('/:stationId/remote-operations', validateStationAccess, stationController.getRemoteOperations);
router.post('/:stationId/remote-operations', validateStationAccess, stationController.postRemoteOperation);

module.exports = router;
