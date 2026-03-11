/**
 * Barbote — Simple In-Memory Rate Limiter
 *
 * No external dependency (no express-rate-limit).
 * Uses sliding window counter per IP.
 *
 * Default: 100 req / 60s globally, 10 req / 60s for auth routes
 */

/**
 * createRateLimiter(options) — factory
 *
 * @param {{ windowMs?: number, max?: number, message?: string }} options
 * @returns Express middleware
 */
export function createRateLimiter({ windowMs = 60_000, max = 100, message = 'Trop de requêtes. Réessayez dans un moment.' } = {}) {
  // Map<ip, { count, resetAt }>
  const store = new Map();

  // Cleanup every 5 minutes to avoid memory leak
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 5 * 60_000);

  // Allow GC to collect the interval if the app shuts down
  if (cleanupInterval.unref) cleanupInterval.unref();

  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();

    let entry = store.get(ip);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(ip, entry);
    }

    entry.count++;

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      return res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retry_after_ms: entry.resetAt - now,
      });
    }

    next();
  };
}

/** Pre-built limiters for common use cases */
export const globalLimiter = createRateLimiter({ windowMs: 60_000, max: 200 });
export const authLimiter = createRateLimiter({ windowMs: 60_000, max: 10, message: 'Trop de tentatives de connexion. Attendez 1 minute.' });
export const aiLimiter = createRateLimiter({ windowMs: 60_000, max: 20, message: 'Quota IA atteint. Réessayez dans 1 minute.' });
export const importLimiter = createRateLimiter({ windowMs: 60_000, max: 5, message: 'Trop d\'imports simultanés.' });
