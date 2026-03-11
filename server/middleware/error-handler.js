/**
 * Barbote — Global Error Handler Middleware
 *
 * Catches all unhandled errors from routes.
 * Sanitizes stack traces in production.
 * Returns consistent error shape: { error, code, requestId }
 */
import { logEntry } from './logger.js';

/**
 * AppError — structured error with status code and optional code
 *
 * Usage: throw new AppError('Lot non trouvé', 404, 'LOT_NOT_FOUND')
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * notFound() — 404 handler for unmatched routes
 * Mount BEFORE globalErrorHandler
 */
export function notFound(req, res, next) {
  const err = new AppError(`Route non trouvée: ${req.method} ${req.path}`, 404, 'NOT_FOUND');
  next(err);
}

/**
 * globalErrorHandler() — must be mounted LAST in Express app
 *
 * Signature: (err, req, res, next) — 4 args required by Express
 */
export function globalErrorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || 500;
  const requestId = req.requestId || null;
  const isProduction = process.env.NODE_ENV === 'production';

  // Structured log
  logEntry({
    level: statusCode >= 500 ? 'error' : 'warn',
    requestId,
    event: 'unhandled_error',
    code: err.code || 'INTERNAL_ERROR',
    message: err.message,
    path: req.path,
    method: req.method,
    userId: req.user?.id || null,
    // Stack trace only in non-prod logs
    ...(isProduction ? {} : { stack: err.stack }),
  });

  const body = {
    error: isProduction && statusCode === 500
      ? 'Une erreur interne est survenue'
      : err.message,
    code: err.code || 'INTERNAL_ERROR',
    requestId,
  };

  // Include validation details if present
  if (err.details) body.details = err.details;

  res.status(statusCode).json(body);
}

/**
 * asyncHandler(fn) — wraps async route handlers to forward errors to globalErrorHandler
 *
 * Usage: router.get('/lots', asyncHandler(async (req, res) => { ... }))
 *
 * Without this, thrown errors in async functions would hang or crash without response.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
