import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../admin/middleware/auth.js';

const router = express.Router();

// POST /api/exports - Track export
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { project_id, export_type, file_name } = req.body;
    const userId = req.user?.id;

    if (!project_id || !export_type) {
      return res.status(400).json({ error: 'project_id and export_type are required' });
    }

    const pool = getPool();
    
    await pool.query(
      `INSERT INTO export_history (project_id, user_id, export_type, file_name, file_size)
       VALUES (?, ?, ?, ?, ?)`,
      [project_id, userId || null, export_type, file_name || null, null]
    );

    res.json({ message: 'Export tracked successfully' });
  } catch (error) {
    console.error('Error tracking export:', error);
    res.status(500).json({ error: 'Failed to track export' });
  }
});

// GET /api/exports - Get user's export history
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const pool = getPool();

    const [exports] = await pool.query(
      `SELECT e.*, p.title as project_title 
       FROM export_history e
       LEFT JOIN projects p ON e.project_id = p.id
       WHERE e.user_id = ?
       ORDER BY e.created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({ exports });
  } catch (error) {
    console.error('Error fetching export history:', error);
    res.status(500).json({ error: 'Failed to fetch export history' });
  }
});

export default router;

