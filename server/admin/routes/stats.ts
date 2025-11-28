import express, { Response } from 'express';
import { getPool } from '../../db/index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// GET /api/stats - Get system statistics
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();

    // Get counts
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [projectCount] = await pool.query('SELECT COUNT(*) as count FROM projects');
    const [sceneCount] = await pool.query('SELECT COUNT(*) as count FROM scenes');
    const [activeUserCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE');

    // Get recent activity
    const [recentProjects] = await pool.query(
      'SELECT COUNT(*) as count FROM projects WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );

    const [recentUsers] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );

    // Get projects by genre
    const [projectsByGenre] = await pool.query(
      `SELECT genre, COUNT(*) as count 
       FROM projects 
       WHERE genre IS NOT NULL 
       GROUP BY genre 
       ORDER BY count DESC 
       LIMIT 10`
    );

    // Get user roles distribution
    const [usersByRole] = await pool.query(
      `SELECT role, COUNT(*) as count 
       FROM users 
       GROUP BY role`
    );

    res.json({
      overview: {
        totalUsers: (userCount as any[])[0].count,
        activeUsers: (activeUserCount as any[])[0].count,
        totalProjects: (projectCount as any[])[0].count,
        totalScenes: (sceneCount as any[])[0].count,
        recentProjects: (recentProjects as any[])[0].count,
        recentUsers: (recentUsers as any[])[0].count,
      },
      projectsByGenre: projectsByGenre,
      usersByRole: usersByRole,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;

