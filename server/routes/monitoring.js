/**
 * Barbote Monitoring Routes
 *
 * GET /api/monitoring/health   — Public health check (used by load balancers)
 * GET /api/monitoring/alerts   — Wine-specific alerts (SO₂, AV, maintenance)
 * GET /api/monitoring/metrics  — Detailed metrics (admin only)
 * GET /api/monitoring/status   — Operational dashboard (admin only)
 */

import express from 'express';
import os from 'os';
import process from 'process';
import { monitoring } from '../services/monitoring.js';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { query } from '../db/index.js';

const router = express.Router();

// GET /api/monitoring/health — Public health check (no auth required)
router.get('/health', async (req, res) => {
  const health = await monitoring.getHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json({
    ...health,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// GET /api/monitoring/alerts — Wine alerts (all authenticated users)
router.get('/alerts', verifyToken, async (req, res) => {
  try {
    const alerts = await monitoring.checkAlerts();
    res.json({ alerts, count: alerts.length, checked_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/monitoring/metrics — System + API metrics (admin only)
router.get('/metrics', verifyToken, requirePermission('monitoring.read'), async (req, res) => {
  try {
    const health = await monitoring.getHealth();

    // Process metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // DB metrics
    let dbMetrics = null;
    try {
      const dbResult = await query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active') as active_lots,
          COUNT(*) as total_lots
        FROM barbote_lots
      `);
      const aiMetrics = await query(`
        SELECT
          COUNT(*) as total_calls,
          COUNT(*) FILTER (WHERE success = true) as successful_calls,
          ROUND(AVG(latency_ms)::numeric, 1) as avg_latency_ms,
          COUNT(*) FILTER (WHERE used_fallback = true) as fallback_count
        FROM barbote_ai_metrics
        WHERE called_at > NOW() - INTERVAL '24 hours'
      `);
      dbMetrics = {
        lots: dbResult.rows[0],
        ai_24h: aiMetrics.rows[0],
      };
    } catch { /* ignore if table doesn't exist yet */ }

    res.json({
      ...health,
      process: {
        pid: process.pid,
        uptime_s: process.uptime(),
        memory: {
          rss_mb: Math.round(memUsage.rss / 1024 / 1024),
          heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
        },
        cpu_user_ms: Math.round(cpuUsage.user / 1000),
        node_version: process.version,
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        load_avg: os.loadavg(),
        free_memory_mb: Math.round(os.freemem() / 1024 / 1024),
        total_memory_mb: Math.round(os.totalmem() / 1024 / 1024),
        cpu_count: os.cpus().length,
      },
      db_stats: dbMetrics,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/monitoring/status — Compact operational status (admin only)
router.get('/status', verifyToken, requirePermission('monitoring.read'), async (req, res) => {
  try {
    const [health, alerts] = await Promise.all([
      monitoring.getHealth(),
      monitoring.checkAlerts(),
    ]);

    const criticalAlerts = alerts.filter(a => a.type === 'critical');
    const warningAlerts = alerts.filter(a => a.type === 'warning');

    const overallStatus =
      health.status !== 'healthy' ? 'degraded' :
      criticalAlerts.length > 0 ? 'critical' :
      warningAlerts.length > 0 ? 'warning' :
      'ok';

    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      health: health.status,
      alerts: {
        critical: criticalAlerts.length,
        warning: warningAlerts.length,
        info: alerts.filter(a => a.type === 'info').length,
      },
      performance: {
        avg_response_ms: health.metrics?.avg_response_ms,
        p95_response_ms: health.metrics?.p95_response_ms,
        error_rate: health.metrics?.error_rate,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
