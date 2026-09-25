const express = require('express');
const router = express.Router();
const aiAnalystController = require('../controllers/aiAnalystController');
const { requireAuthenticated, validateStationAccess } = require('../middleware/authRoleMiddleware');

// GET /api/research/ai-analyst/status
router.get('/status', requireAuthenticated, aiAnalystController.getAIAnalystStatus);

// POST /api/research/ai-analyst/report-24h
router.post('/report-24h', validateStationAccess, aiAnalystController.generate24hSummaryReport);

// 12-hour station briefings and India HQ delivery schedule
router.post('/report-12h', validateStationAccess, aiAnalystController.generate12hSummaryReport);
router.get('/report-schedule', validateStationAccess, aiAnalystController.get12hReportSchedule);
router.put('/report-schedule', validateStationAccess, aiAnalystController.update12hReportSchedule);
router.get('/report-deliveries', validateStationAccess, aiAnalystController.get12hReportDeliveries);

// POST /api/research/ai-analyst/analyze
router.post('/analyze', validateStationAccess, aiAnalystController.analyzeResearchData);

// POST /api/research/ai-analyst/ask
router.post('/ask', validateStationAccess, aiAnalystController.askResearchAI);

module.exports = router;

