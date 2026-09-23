const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const sensorRoutes = require('./routes/sensorRoutes');
const alertRoutes = require('./routes/alertRoutes');
const stationRoutes = require('./routes/stationRoutes');
const telemetryRoutes = require('./routes/telemetryRoutes');
const simulatorRoutes = require('./routes/simulatorRoutes');
const aiAnalystRoutes = require('./routes/aiAnalystRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const { defaultSatelliteLink } = require('./queue/satelliteLink');

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

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${new Date().toLocaleTimeString()} ${req.method} ${req.path}`);
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
    message: 'An unexpected internal server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Socket.IO Real-time Broadcaster
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.emit('queue_metrics', defaultSatelliteLink.getMetrics());

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Forward satellite link events to real-time clients
defaultSatelliteLink.onPacketProcessed((packetMetric) => {
  io.emit('packet_processed', packetMetric);
  io.emit('queue_metrics', defaultSatelliteLink.getMetrics());

  if (packetMetric.packet_type === 'EMERGENCY_ALERT') {
    io.emit('emergency_alert', packetMetric);
  } else {
    io.emit('telemetry_update', packetMetric);
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
