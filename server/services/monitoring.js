// Barbote - Monitoring & Observability Service
import { query } from '../db/index.js';

export class MonitoringService {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      avgResponseTime: 0,
      responseTimes: [],
      startTime: Date.now()
    };
  }

  // Middleware to track requests
  middleware() {
    return (req, res, next) => {
      const start = Date.now();
      this.metrics.requests++;

      const originalJson = res.json.bind(res);
      res.json = (data) => {
        const duration = Date.now() - start;
        this.metrics.responseTimes.push(duration);
        if (this.metrics.responseTimes.length > 100) {
          this.metrics.responseTimes.shift();
        }
        this.metrics.avgResponseTime = this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;

        if (res.statusCode >= 500) this.metrics.errors++;
        return originalJson(data);
      };
      next();
    };
  }

  // Health check with detailed info
  async getHealth() {
    const uptime = Date.now() - this.metrics.startTime;
    let dbStatus = 'ok';
    try {
      await query('SELECT 1');
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_ms: uptime,
      uptime_human: this.formatUptime(uptime),
      database: dbStatus,
      metrics: {
        total_requests: this.metrics.requests,
        error_count: this.metrics.errors,
        error_rate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) + '%' : '0%',
        avg_response_ms: Math.round(this.metrics.avgResponseTime),
        p95_response_ms: this.getPercentile(95)
      }
    };
  }

  getPercentile(p) {
    if (this.metrics.responseTimes.length === 0) return 0;
    const sorted = [...this.metrics.responseTimes].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Alert checking (run periodically)
  async checkAlerts() {
    const alerts = [];
    try {
      // Check lots with low SO2
      const lowSo2 = await query(`
        SELECT l.lot_number, l.name, a.free_so2_mgl
        FROM barbote_lots l
        JOIN barbote_analyses a ON a.lot_id = l.id
        WHERE l.status = 'active' AND a.free_so2_mgl < 20
        AND a.analysis_date = (SELECT MAX(a2.analysis_date) FROM barbote_analyses a2 WHERE a2.lot_id = l.id)
      `);
      if (lowSo2.rows.length > 0) {
        alerts.push({
          type: 'warning',
          message: `${lowSo2.rows.length} lot(s) avec SO₂ libre < 20 mg/L`,
          lots: lowSo2.rows
        });
      }

      // Check lots with high volatile acidity
      const highAv = await query(`
        SELECT l.lot_number, l.name, a.volatile_acidity_gl
        FROM barbote_lots l
        JOIN barbote_analyses a ON a.lot_id = l.id
        WHERE l.status = 'active' AND a.volatile_acidity_gl > 0.6
        AND a.analysis_date = (SELECT MAX(a2.analysis_date) FROM barbote_analyses a2 WHERE a2.lot_id = l.id)
      `);
      if (highAv.rows.length > 0) {
        alerts.push({
          type: 'critical',
          message: `${highAv.rows.length} lot(s) avec AV > 0.6 g/L`,
          lots: highAv.rows
        });
      }

      // Check maintenance due
      const maintenanceDue = await query(`
        SELECT c.code, c.name, m.scheduled_date, m.maintenance_type
        FROM barbote_maintenance m
        JOIN barbote_containers c ON m.container_id = c.id
        WHERE m.status = 'planned' AND m.scheduled_date <= NOW() + INTERVAL '7 days'
      `);
      if (maintenanceDue.rows.length > 0) {
        alerts.push({
          type: 'info',
          message: `${maintenanceDue.rows.length} maintenance(s) dans les 7 jours`,
          items: maintenanceDue.rows
        });
      }
    } catch (err) {
      console.error('Alert check error:', err.message);
    }
    return alerts;
  }
}

export const monitoring = new MonitoringService();
