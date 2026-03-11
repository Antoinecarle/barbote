/**
 * Barbote — Structured Request Logger Middleware
 *
 * Each request gets a unique requestId.
 * Logs: method, path, status, duration, userId, requestId
 * Format: JSON (for log aggregators) or pretty (for dev)
 */
import { randomUUID } from 'crypto';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Structured log entry — emits to stdout
 * @param {Object} entry
 */
export function logEntry(entry) {
  const base = {
    ts: new Date().toISOString(),
    service: 'barbote-api',
    ...entry,
  };

  if (IS_PROD) {
    // JSON lines format for log aggregators (Railway, Datadog, etc.)
    process.stdout.write(JSON.stringify(base) + '\n');
  } else {
    // Pretty format for local dev
    const { ts, level = 'info', method, path, status, duration_ms, ...rest } = base;
    const levelColors = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', debug: '\x1b[90m' };
    const reset = '\x1b[0m';
    const color = levelColors[level] || '';
    const statusColor = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';

    if (method && path) {
      const extras = Object.keys(rest).filter(k => !['service', 'ts', 'requestId', 'userId'].includes(k));
      const extraStr = extras.length ? ' ' + extras.map(k => `${k}=${rest[k]}`).join(' ') : '';
      console.log(
        `${color}[${level.toUpperCase()}]${reset} ${ts.substring(11, 19)} ` +
        `${method.padEnd(6)} ${path.padEnd(40)} ` +
        `${statusColor}${status}${reset} ${duration_ms}ms` +
        extraStr
      );
    } else {
      const { ts: _ts, service: _svc, ...printable } = base;
      console.log(`${color}[${level?.toUpperCase() || 'INFO'}]${reset} ${ts.substring(11, 19)}`, printable);
    }
  }
}

/**
 * requestLogger() — Express middleware
 *
 * Adds req.requestId, req.log(level, data)
 * Logs on response finish with method, path, status, duration, userId
 */
export function requestLogger() {
  return (req, res, next) => {
    const requestId = randomUUID();
    const start = Date.now();

    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Convenience logger attached to request
    req.log = (level, data) => logEntry({ level, requestId, ...data });

    res.on('finish', () => {
      const duration_ms = Date.now() - start;
      const userId = req.user?.id || null;

      // Skip health check noise in prod
      if (IS_PROD && req.path === '/api/health') return;

      logEntry({
        level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms,
        userId,
        ip: req.ip,
      });
    });

    next();
  };
}

/**
 * log(level, data) — standalone logger for services/routes
 * Usage: log('error', { message: 'DB failed', err: err.message })
 */
export function log(level, data) {
  logEntry({ level, ...data });
}
