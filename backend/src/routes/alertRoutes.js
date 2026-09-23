const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { validateAlert } = require('../middleware/validator');
const { requireAuthenticated, requireDeviceIngestAccess, validateStationAccess } = require('../middleware/authRoleMiddleware');

// POST /api/alerts - Ingest emergency alert
router.post('/', requireDeviceIngestAccess, validateAlert, alertController.postAlert);

// GET /api/alerts - Fetch active / filtered alerts
router.get('/', validateStationAccess, alertController.getAlerts);

// PATCH /api/alerts/:alertId/ack - Acknowledge alert
router.patch('/:alertId/ack', requireAuthenticated, alertController.acknowledge);

// DELETE /api/alerts/clear - Clear alerts
router.delete('/clear', validateStationAccess, alertController.clearAll);

module.exports = router;
