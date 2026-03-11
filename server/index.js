import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import jwt from 'jsonwebtoken';

import authRouter from './routes/auth.js';
import containersRouter from './routes/containers.js';
import lotsRouter from './routes/lots.js';
import movementsRouter from './routes/movements.js';
import analysesRouter from './routes/analyses.js';
import aiRouter from './routes/ai.js';
import operationsRouter from './routes/operations.js';
import maintenanceRouter from './routes/maintenance.js';
import dashboardRouter from './routes/dashboard.js';
import monitoringRouter from './routes/monitoring.js';
import importsRouter from './routes/imports.js';
import { monitoring } from './services/monitoring.js';
import { query } from './db/index.js';
import { requestLogger, log } from './middleware/logger.js';
import { globalErrorHandler, notFound } from './middleware/error-handler.js';
import { globalLimiter, authLimiter } from './middleware/rate-limit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.BARBOTE_PORT || 3006;
const JWT_SECRET = process.env.JWT_SECRET || 'barbote-secret-key';

const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Structured request logging (replaces morgan)
app.use(requestLogger());

// Serve static files — support both Railway (server/dist) and local (frontend/dist)
const distPath = path.join(__dirname, '../frontend/dist');
const distPathAlt = path.join(__dirname, 'dist');
const actualDistPath = existsSync(path.join(distPathAlt, 'index.html')) ? distPathAlt : distPath;
app.use(express.static(actualDistPath));

// Monitoring middleware
app.use(monitoring.middleware());

// Global rate limiter
app.use('/api/', globalLimiter);

// API Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/containers', containersRouter);
app.use('/api/monitoring', monitoringRouter);
app.use('/api/lots', lotsRouter);
app.use('/api/movements', movementsRouter);
app.use('/api/analyses', analysesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/operations', operationsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/imports', importsRouter);

// Health check — detailed version using monitoring service
app.get('/api/health', async (req, res) => {
  try {
    const health = await monitoring.getHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json({
      ...health,
      version: process.env.npm_package_version || '1.0.0',
      node_version: process.version,
    });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// Socket.IO for real-time updates
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Auth required'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.userId);
  socket.join(`user:${socket.userId}`);

  socket.on('join-lot', (lotId) => {
    socket.join(`lot:${lotId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.userId);
  });
});

// Export io for use in routes
app.set('io', io);

// 404 for unmatched API routes
app.use('/api/', notFound);

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(actualDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(200).send('Barbote - Wine Traceability Platform');
  });
});

// Global error handler — must be last
app.use(globalErrorHandler);

// Start server
httpServer.listen(PORT, '0.0.0.0', async () => {
  log('info', { event: 'server_start', port: PORT, env: process.env.NODE_ENV || 'development' });
  console.log(`\n🍷 Barbote API running on port ${PORT}`);
  console.log(`   Network: http://alfredhub.io:${PORT}`);
  console.log(`   Health: http://alfredhub.io:${PORT}/api/health\n`);

  // Run migrations on startup
  try {
    const { readFileSync } = await import('fs');
    const schema = readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
    await query(schema);
    log('info', { event: 'db_schema_ensured' });
    console.log('✅ Database schema ensured');
  } catch (err) {
    log('warn', { event: 'db_schema_warning', message: err.message });
    console.error('Migration warning:', err.message);
  }
});

export { io };
