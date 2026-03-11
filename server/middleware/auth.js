import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';

export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'barbote-secret-key');
    // Verify user still exists
    const result = await query(
      'SELECT id, email, name, role FROM barbote_users WHERE id = $1',
      [decoded.userId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }
    next();
  };
}

export function requireAdmin(req, res, next) {
  if (!['admin', 'oenologue'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs et oenologues' });
  }
  next();
}
