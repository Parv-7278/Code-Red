/**
 * Node.js / Express Proxy Route for ML Predictions.
 * Forwards /api/predictions requests to FastAPI backend on port 8000.
 */

const express = require('express');
const router = express.Router();
const { requireAuthenticated, validateStationAccess } = require('../middleware/authRoleMiddleware');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';

router.post('/what-if', validateStationAccess, async (req, res) => {
  try {
    const response = await fetch(`${FASTAPI_URL}/api/predictions/what-if`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': req.headers['x-user-role'] || 'india_operator',
        'x-station-id': req.headers['x-station-id'] || '',
        'Authorization': req.headers.authorization || '',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        success: false,
        message: errData.detail || 'Error from FastAPI ML Prediction Engine',
        error: errData
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.warn('[Express Proxy] FastAPI not directly reachable on :8000:', err.message);
    // Return graceful notice
    return res.status(503).json({
      success: false,
      message: 'FastAPI ML prediction service offline. Please ensure fastapi_backend is running on port 8000.',
      error: err.message
    });
  }
});

router.get('/status', requireAuthenticated, async (req, res) => {
  try {
    const response = await fetch(`${FASTAPI_URL}/api/predictions/status`);
    if (response.ok) {
      const data = await response.json();
      return res.json(data);
    }
  } catch (e) {
    // ignore
  }
  return res.json({
    status: 'PROXY_MODE',
    engine: 'POLARIS ML Prediction Engine (Port 8000)'
  });
});

module.exports = router;
