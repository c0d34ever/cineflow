import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getPool } from '../db/index.js';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Authentication token required' });
      return;
    }

    // Verify token with better error handling
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        console.error('Token expired:', jwtError.expiredAt);
        res.status(403).json({ error: 'Token expired', expiredAt: jwtError.expiredAt });
        return;
      }
      if (jwtError.name === 'JsonWebTokenError') {
        console.error('Invalid token:', jwtError.message);
        res.status(403).json({ error: 'Invalid token', details: jwtError.message });
        return;
      }
      throw jwtError;
    }
    
    // Verify user still exists and is active
    const pool = getPool();
    const [usersResult] = await pool.query(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
      [decoded.userId]
    ) as [any[], any];

    const users = Array.isArray(usersResult) ? usersResult : [];
    if (users.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const user = users[0] as any;
    if (!user.is_active) {
      res.status(403).json({ error: 'User account is inactive' });
      return;
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Access denied. Required roles: ${roles.join(', ')}` });
      return;
    }

    next();
  };
}

