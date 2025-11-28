import express, { Response } from 'express';
import { getPool } from '../../db/index.js';
import { AuthRequest, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/admin/api-keys - Get all API keys (admin only)
router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
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

    const [keys] = await pool.query(query, params);

    // Get total count
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM api_keys');
    const total = (countResult as any[])[0].total;

    res.json({
      apiKeys: keys,
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// GET /api/admin/api-keys/stats - API key statistics
router.get('/stats', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();

    const [totalKeys] = await pool.query('SELECT COUNT(*) as count FROM api_keys');
    const [activeKeys] = await pool.query('SELECT COUNT(*) as count FROM api_keys WHERE is_active = TRUE');
    const [expiredKeys] = await pool.query('SELECT COUNT(*) as count FROM api_keys WHERE expires_at < NOW()');
    const [recentKeys] = await pool.query(
      'SELECT COUNT(*) as count FROM api_keys WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );

    res.json({
      total: (totalKeys as any[])[0].count,
      active: (activeKeys as any[])[0].count,
      expired: (expiredKeys as any[])[0].count,
      recent: (recentKeys as any[])[0].count,
    });
  } catch (error) {
    console.error('Error fetching API key stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;

