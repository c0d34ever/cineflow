import express, { Response } from 'express';
import { getPool } from '../../db';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = express.Router();

// GET /api/projects - Get all projects (admin view)
router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const { page = 1, limit = 50, userId, search } = req.query;

    let query = `
      SELECT p.*, u.username, u.email,
             COUNT(s.id) as scene_count
      FROM projects p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN scenes s ON s.project_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      query += ' AND p.user_id = ?';
      params.push(userId);
    }

    if (search) {
      query += ' AND (p.title LIKE ? OR p.genre LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    const limitNum = parseInt(limit as string);
    const offset = (parseInt(page as string) - 1) * limitNum;
    params.push(limitNum, offset);

    const [projects] = await pool.query(query, params);

    // Get total count
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM projects');
    const total = (countResult as any[])[0].total;

    res.json({
      projects,
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// DELETE /api/projects/:id - Delete project (admin only)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.id;
    const pool = getPool();

    await pool.query('DELETE FROM projects WHERE id = ?', [projectId]);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;

