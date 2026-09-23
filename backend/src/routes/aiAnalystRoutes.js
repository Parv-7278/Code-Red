const express = require('express');
const router = express.Router();
const aiAnalystController = require('../controllers/aiAnalystController');
const { requireAuthenticated, validateStationAccess } = require('../middleware/authRoleMiddleware');

// GET /api/research/ai-analyst/status
router.get('/status', requireAuthenticated, aiAnalystController.getAIAnalystStatus);

// POST /api/research/ai-analyst/report-24h
router.post('/report-24h', validateStationAccess, aiAnalystController.generate24hSummaryReport);

// POST /api/research/ai-analyst/analyze
router.post('/analyze', validateStationAccess, aiAnalystController.analyzeResearchData);

// POST /api/research/ai-analyst/ask
router.post('/ask', validateStationAccess, aiAnalystController.askResearchAI);

module.exports = router;

