import express from 'express';
import { monitoring } from '../services/monitoring.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/monitoring/health - Detailed health check
router.get('/health', async (req, res) => {
  const health = await monitoring.getHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// GET /api/monitoring/alerts - Check for wine-related alerts
router.get('/alerts', verifyToken, async (req, res) => {
  const alerts = await monitoring.checkAlerts();
  res.json({ alerts, count: alerts.length });
});

// GET /api/monitoring/metrics - System metrics
router.get('/metrics', verifyToken, requireAdmin, async (req, res) => {
  const health = await monitoring.getHealth();
  res.json(health);
});

export default router;
