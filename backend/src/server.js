const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');
const { Server } = require('socket.io');

const sensorRoutes = require('./routes/sensorRoutes');
const alertRoutes = require('./routes/alertRoutes');
const stationRoutes = require('./routes/stationRoutes');
const telemetryRoutes = require('./routes/telemetryRoutes');
const simulatorRoutes = require('./routes/simulatorRoutes');
const aiAnalystRoutes = require('./routes/aiAnalystRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const { defaultSatelliteLink } = require('./queue/satelliteLink');
const { isDemoMode, resolveSupabaseToken } = require('./middleware/authRoleMiddleware');

dotenv.config();

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigin = (origin, callback) => {
  // Requests without an Origin header include local tools, health checks and
  // same-origin server calls. Browser origins must be explicitly allow-listed.
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error(`CORS origin not allowed: ${origin}`));
};
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

io.use(async (socket, next) => {
  try {
    if (isDemoMode()) {
      const role = socket.handshake.auth?.role || 'india_operator';
      const stationId = socket.handshake.auth?.stationId || null;
      socket.data.auth = { role, stationId, mode: 'DEMO' };
      return next();
    }

    const token = socket.handshake.auth?.token;
    const auth = await resolveSupabaseToken(token);
    if (!auth) return next(new Error('UNAUTHORIZED_SOCKET'));
    socket.data.auth = auth;
    return next();
  } catch (error) {
    console.error('[Socket] Authentication failed:', error.message);
    return next(new Error('SOCKET_AUTHENTICATION_UNAVAILABLE'));
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(JSON.stringify({
      level: 'info',
      event: 'api_request',
      request_id: req.requestId,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
    }));
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Antarctic Station Remote Management Backend',
    data_mode: process.env.DEMO_MODE === 'false' ? 'CONFIGURED_DEPLOYMENT' : 'SIMULATION',
    timestamp: new Date().toISOString(),
  });
});

// Phase 2 Required Core API Routes
app.get('/api/health/live', (req, res) => {
  res.json({ status: 'LIVE', service: 'polaris-node-api', timestamp: new Date().toISOString() });
});

app.get('/api/health/ready', async (req, res) => {
  const { supabase, isConfigured } = require('./config/supabase');
  const checks = { database: 'NOT_CONFIGURED', ml_service: 'UNAVAILABLE' };
  if (isConfigured()) {
    try {
      const { error } = await supabase.from('stations').select('id').limit(1);
      checks.database = error ? `ERROR: ${error.message}` : 'READY';
    } catch (error) {
      checks.database = `ERROR: ${error.message}`;
    }
  }
  try {
    const response = await fetch(`${process.env.FASTAPI_URL || 'http://127.0.0.1:8000'}/api/health/live`, {
      signal: AbortSignal.timeout(3000),
    });
    checks.ml_service = response.ok ? 'READY' : `HTTP_${response.status}`;
  } catch (error) {
    checks.ml_service = `ERROR: ${error.message}`;
  }
  const databaseRequired = !isDemoMode();
  const ready = (!databaseRequired || checks.database === 'READY') && checks.ml_service === 'READY';
  return res.status(ready ? 200 : 503).json({
    status: ready ? 'READY' : 'NOT_READY',
    mode: isDemoMode() ? 'DEMO' : 'CONNECTED',
    checks,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/sensor-data', sensorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/stations', stationRoutes);

// Additional helper routes (Telemetry alias, Simulator scenarios, AI Analyst)
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/simulator', simulatorRoutes);
app.use('/api/research/ai-analyst', aiAnalystRoutes);
app.use('/api/predictions', predictionRoutes);

// 404 Catch-All Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route '${req.method} ${req.originalUrl}' not found on Antarctic backend.`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    success: false,
    request_id: req.requestId,
    message: 'An unexpected internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Socket.IO Real-time Broadcaster
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  const auth = socket.data.auth || {};
  if (auth.role === 'india_operator') socket.join('role:india_operator');
  if (auth.stationId) socket.join(`station:${auth.stationId}`);
  socket.emit('queue_metrics', defaultSatelliteLink.getMetrics());

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Forward satellite link events to real-time clients
defaultSatelliteLink.onPacketProcessed((packetMetric) => {
  const stationRoom = `station:${packetMetric.station_id}`;
  const authorizedAudience = io.to(stationRoom).to('role:india_operator');
  const packetType = packetMetric.message_type || packetMetric.data?.packet_type;
  authorizedAudience.emit('packet_processed', packetMetric);
  io.emit('queue_metrics', defaultSatelliteLink.getMetrics());

  if (packetType === 'EMERGENCY_ALERT') {
    authorizedAudience.emit('emergency_alert', packetMetric);
  } else {
    authorizedAudience.emit('telemetry_update', packetMetric);
  }
});

// Start Express Server
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`📡 Antarctic Mission Control Backend Running on Port ${PORT}`);
    console.log(`🛰️  Satellite Link & Priority Queue Simulator Active`);
    console.log(`========================================================`);
  });
}

module.exports = { app, server };
