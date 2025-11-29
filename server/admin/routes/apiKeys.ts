import express, { Response, NextFunction } from 'express';
import { getPool } from '../../db/index.js';
import { AuthRequest, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/admin/api-keys - Get all API keys (admin only)
router.get('/', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }
    const { page = 1, limit = 50, userId, is_active } = req.query;

    let query = `
      SELECT ak.*, u.username, u.email
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      query += ' AND ak.user_id = ?';
      params.push(userId);
    }

    if (typeof is_active === 'string') {
      query += ' AND ak.is_active = ?';
      params.push(is_active === 'true');
    }

    query += ' ORDER BY ak.created_at DESC LIMIT ? OFFSET ?';
    const limitNum = parseInt(limit as string);
    const offset = (parseInt(page as string) - 1) * limitNum;
    params.push(limitNum, offset);

    const [keysResult] = await pool.query(query, params) as [any[], any];

    // Get total count
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM api_keys') as [any[], any];
    const total = Array.isArray(countResult) && countResult.length > 0 ? countResult[0].total : 0;

    res.json({
      apiKeys: Array.isArray(keysResult) ? keysResult : [],
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to fetch API keys',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } else {
      next(error);
    }
  }
});

// GET /api/admin/api-keys/stats - API key statistics
router.get('/stats', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const [totalKeysResult] = await pool.query('SELECT COUNT(*) as count FROM api_keys') as [any[], any];
    const [activeKeysResult] = await pool.query('SELECT COUNT(*) as count FROM api_keys WHERE is_active = TRUE') as [any[], any];
    const [expiredKeysResult] = await pool.query('SELECT COUNT(*) as count FROM api_keys WHERE expires_at < NOW()') as [any[], any];
    const [recentKeysResult] = await pool.query(
      'SELECT COUNT(*) as count FROM api_keys WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    ) as [any[], any];

    // Extract counts safely
    const total = Array.isArray(totalKeysResult) && totalKeysResult.length > 0 ? totalKeysResult[0].count : 0;
    const active = Array.isArray(activeKeysResult) && activeKeysResult.length > 0 ? activeKeysResult[0].count : 0;
    const expired = Array.isArray(expiredKeysResult) && expiredKeysResult.length > 0 ? expiredKeysResult[0].count : 0;
    const recent = Array.isArray(recentKeysResult) && recentKeysResult.length > 0 ? recentKeysResult[0].count : 0;

    res.json({
      total,
      active,
      expired,
      recent,
    });
  } catch (error: any) {
    console.error('Error fetching API key stats:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to fetch statistics',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } else {
      next(error);
    }
  }
});

export default router;

