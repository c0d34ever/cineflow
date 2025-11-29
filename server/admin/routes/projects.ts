import express, { Response, NextFunction } from 'express';
import { getPool } from '../../db/index.js';
import { AuthRequest, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/projects - Get all projects (admin view)
router.get('/', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }
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

    const [projectsResult] = await pool.query(query, params) as [any[], any];

    // Get total count
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM projects') as [any[], any];
    const total = Array.isArray(countResult) && countResult.length > 0 ? countResult[0].total : 0;

    res.json({
      projects: Array.isArray(projectsResult) ? projectsResult : [],
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to fetch projects',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } else {
      next(error);
    }
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

