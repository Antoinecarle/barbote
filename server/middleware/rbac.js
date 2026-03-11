/**
 * Barbote — RBAC (Role-Based Access Control) Middleware
 *
 * Permission matrix: role → set of allowed permissions
 * Roles: admin > oenologue > operator > viewer
 */

/**
 * PERMISSION MATRIX
 *
 * Format: 'resource.action'
 * Roles inherit from lower tiers (admin has all oenologue + operator + viewer perms)
 */
export const PERMISSIONS = {
  // ── Viewer (read-only) ──────────────────────────────────────────────────
  'lots.read':          ['admin', 'oenologue', 'operator', 'viewer'],
  'containers.read':    ['admin', 'oenologue', 'operator', 'viewer'],
  'movements.read':     ['admin', 'oenologue', 'operator', 'viewer'],
  'analyses.read':      ['admin', 'oenologue', 'operator', 'viewer'],
  'operations.read':    ['admin', 'oenologue', 'operator', 'viewer'],
  'maintenance.read':   ['admin', 'oenologue', 'operator', 'viewer'],
  'assemblage.read':    ['admin', 'oenologue', 'operator', 'viewer'],
  'dashboard.read':     ['admin', 'oenologue', 'operator', 'viewer'],
  'activity.read':      ['admin', 'oenologue', 'operator', 'viewer'],

  // ── Operator (write movements & operations) ─────────────────────────────
  'movements.write':    ['admin', 'oenologue', 'operator'],
  'operations.write':   ['admin', 'oenologue', 'operator'],
  'maintenance.write':  ['admin', 'oenologue', 'operator'],
  'containers.write':   ['admin', 'oenologue', 'operator'],

  // ── Oenologue (wine technical decisions) ───────────────────────────────
  'lots.write':         ['admin', 'oenologue'],
  'analyses.write':     ['admin', 'oenologue'],
  'assemblage.write':   ['admin', 'oenologue'],
  'ai.chat':            ['admin', 'oenologue'],
  'ai.assemblage':      ['admin', 'oenologue'],
  'imports.write':      ['admin', 'oenologue'],

  // ── Admin only ──────────────────────────────────────────────────────────
  'lots.delete':        ['admin'],
  'analyses.delete':    ['admin'],
  'movements.delete':   ['admin'],
  'operations.delete':  ['admin'],
  'containers.delete':  ['admin'],
  'users.manage':       ['admin'],
  'audit.read':         ['admin'],
  'monitoring.read':    ['admin'],
};

/**
 * requirePermission(permission)
 *
 * Express middleware factory.
 * Usage: router.post('/lots', verifyToken, requirePermission('lots.write'), handler)
 *
 * @param {string} permission - e.g. 'lots.write'
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const allowed = PERMISSIONS[permission];
    if (!allowed) {
      // Unknown permission → deny by default (fail-closed security)
      return res.status(403).json({
        error: `Permission inconnue: ${permission}`,
        code: 'UNKNOWN_PERMISSION'
      });
    }

    if (!allowed.includes(role)) {
      return res.status(403).json({
        error: `Accès refusé. Rôle requis: ${allowed.join(' ou ')}. Rôle actuel: ${role}`,
        code: 'INSUFFICIENT_ROLE',
        required_roles: allowed,
        current_role: role
      });
    }

    next();
  };
}

/**
 * hasPermission(user, permission) — utility for inline checks
 *
 * @param {{ role: string }} user
 * @param {string} permission
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  const role = user?.role;
  if (!role) return false;
  const allowed = PERMISSIONS[permission] || [];
  return allowed.includes(role);
}

/**
 * getRolePermissions(role) — list all permissions for a role
 *
 * @param {string} role
 * @returns {string[]}
 */
export function getRolePermissions(role) {
  return Object.entries(PERMISSIONS)
    .filter(([, roles]) => roles.includes(role))
    .map(([perm]) => perm);
}
