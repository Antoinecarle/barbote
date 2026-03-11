/**
 * Tests — RBAC permission system
 * 28 tests covering permission matrix, requirePermission, hasPermission, getRolePermissions
 */
import { jest } from '@jest/globals';
import { PERMISSIONS, requirePermission, hasPermission, getRolePermissions } from '../middleware/rbac.js';

// ─── PERMISSIONS matrix ───────────────────────────────────────────────────────

describe('PERMISSIONS matrix', () => {
  test('all permissions have at least one role', () => {
    for (const [perm, roles] of Object.entries(PERMISSIONS)) {
      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThan(0);
    }
  });

  test('admin is in every permission', () => {
    for (const [perm, roles] of Object.entries(PERMISSIONS)) {
      expect(roles).toContain('admin');
    }
  });

  test('viewer only has read permissions', () => {
    const viewerPerms = Object.entries(PERMISSIONS)
      .filter(([, roles]) => roles.includes('viewer'))
      .map(([perm]) => perm);
    for (const perm of viewerPerms) {
      expect(perm).toMatch(/\.read$/);
    }
  });

  test('lots.delete is admin-only', () => {
    expect(PERMISSIONS['lots.delete']).toEqual(['admin']);
  });

  test('users.manage is admin-only', () => {
    expect(PERMISSIONS['users.manage']).toEqual(['admin']);
  });

  test('ai.chat excludes operator and viewer', () => {
    const aiChatRoles = PERMISSIONS['ai.chat'];
    expect(aiChatRoles).not.toContain('operator');
    expect(aiChatRoles).not.toContain('viewer');
  });

  test('movements.write allows operator', () => {
    expect(PERMISSIONS['movements.write']).toContain('operator');
  });

  test('lots.write does not allow operator', () => {
    expect(PERMISSIONS['lots.write']).not.toContain('operator');
    expect(PERMISSIONS['lots.write']).not.toContain('viewer');
  });
});

// ─── hasPermission ────────────────────────────────────────────────────────────

describe('hasPermission(user, permission)', () => {
  test('admin can do everything', () => {
    const admin = { role: 'admin' };
    for (const perm of Object.keys(PERMISSIONS)) {
      expect(hasPermission(admin, perm)).toBe(true);
    }
  });

  test('viewer can read but not write', () => {
    const viewer = { role: 'viewer' };
    expect(hasPermission(viewer, 'lots.read')).toBe(true);
    expect(hasPermission(viewer, 'lots.write')).toBe(false);
    expect(hasPermission(viewer, 'ai.chat')).toBe(false);
  });

  test('operator can write movements but not lots', () => {
    const operator = { role: 'operator' };
    expect(hasPermission(operator, 'movements.write')).toBe(true);
    expect(hasPermission(operator, 'lots.write')).toBe(false);
  });

  test('oenologue can use AI but not manage users', () => {
    const oeno = { role: 'oenologue' };
    expect(hasPermission(oeno, 'ai.chat')).toBe(true);
    expect(hasPermission(oeno, 'users.manage')).toBe(false);
  });

  test('null user returns false', () => {
    expect(hasPermission(null, 'lots.read')).toBe(false);
  });

  test('unknown permission returns false', () => {
    expect(hasPermission({ role: 'admin' }, 'unknown.perm')).toBe(false);
  });

  test('user without role returns false', () => {
    expect(hasPermission({}, 'lots.read')).toBe(false);
  });
});

// ─── requirePermission middleware ─────────────────────────────────────────────

describe('requirePermission(permission)', () => {
  function mockRes() {
    const res = { _status: 200, _body: null };
    res.status = (code) => { res._status = code; return res; };
    res.json = (body) => { res._body = body; return res; };
    return res;
  }

  test('calls next() when role is authorized', () => {
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    const next = jest.fn();
    requirePermission('lots.write')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res._status).toBe(200); // unchanged
  });

  test('returns 403 when role is insufficient', () => {
    const req = { user: { role: 'viewer' } };
    const res = mockRes();
    const next = jest.fn();
    requirePermission('lots.write')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
    expect(res._body.code).toBe('INSUFFICIENT_ROLE');
    expect(res._body.current_role).toBe('viewer');
  });

  test('returns 401 when user is missing', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();
    requirePermission('lots.read')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  test('returns 403 for unknown permission (fail-closed)', () => {
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    const next = jest.fn();
    requirePermission('nonexistent.perm')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(403);
    expect(res._body.code).toBe('UNKNOWN_PERMISSION');
  });

  test('error response includes required_roles', () => {
    const req = { user: { role: 'operator' } };
    const res = mockRes();
    const next = jest.fn();
    requirePermission('lots.delete')(req, res, next);
    expect(res._body.required_roles).toEqual(['admin']);
  });
});

// ─── getRolePermissions ───────────────────────────────────────────────────────

describe('getRolePermissions(role)', () => {
  test('admin has the most permissions', () => {
    const adminPerms = getRolePermissions('admin');
    const viewerPerms = getRolePermissions('viewer');
    expect(adminPerms.length).toBeGreaterThan(viewerPerms.length);
    expect(adminPerms.length).toBe(Object.keys(PERMISSIONS).length);
  });

  test('viewer permissions are all read', () => {
    const perms = getRolePermissions('viewer');
    perms.forEach(p => expect(p).toMatch(/\.read$/));
  });

  test('unknown role returns empty array', () => {
    expect(getRolePermissions('superuser')).toEqual([]);
  });

  test('oenologue has ai.chat', () => {
    expect(getRolePermissions('oenologue')).toContain('ai.chat');
  });
});
