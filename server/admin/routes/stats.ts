import express, { Response, NextFunction } from 'express';
import { getPool } from '../../db/index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// GET /api/stats - Get system statistics
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database connection not available');
    }

    // Get counts with proper type handling
    const [userCountResult] = await pool.query('SELECT COUNT(*) as count FROM users') as [any[], any];
    const [projectCountResult] = await pool.query('SELECT COUNT(*) as count FROM projects') as [any[], any];
    const [sceneCountResult] = await pool.query('SELECT COUNT(*) as count FROM scenes') as [any[], any];
    const [activeUserCountResult] = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE') as [any[], any];

    // Get recent activity
    const [recentProjectsResult] = await pool.query(
      'SELECT COUNT(*) as count FROM projects WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    ) as [any[], any];

    const [recentUsersResult] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    ) as [any[], any];

    // Get projects by genre
    const [projectsByGenreResult] = await pool.query(
      `SELECT genre, COUNT(*) as count 
       FROM projects 
       WHERE genre IS NOT NULL 
       GROUP BY genre 
       ORDER BY count DESC 
       LIMIT 10`
    ) as [any[], any];

    // Get user roles distribution
    const [usersByRoleResult] = await pool.query(
      `SELECT role, COUNT(*) as count 
       FROM users 
       GROUP BY role`
    ) as [any[], any];

    // Extract counts safely
    const userCount = Array.isArray(userCountResult) && userCountResult.length > 0 ? userCountResult[0].count : 0;
    const projectCount = Array.isArray(projectCountResult) && projectCountResult.length > 0 ? projectCountResult[0].count : 0;
    const sceneCount = Array.isArray(sceneCountResult) && sceneCountResult.length > 0 ? sceneCountResult[0].count : 0;
    const activeUserCount = Array.isArray(activeUserCountResult) && activeUserCountResult.length > 0 ? activeUserCountResult[0].count : 0;
    const recentProjects = Array.isArray(recentProjectsResult) && recentProjectsResult.length > 0 ? recentProjectsResult[0].count : 0;
    const recentUsers = Array.isArray(recentUsersResult) && recentUsersResult.length > 0 ? recentUsersResult[0].count : 0;

    res.json({
      overview: {
        totalUsers: userCount,
        activeUsers: activeUserCount,
        totalProjects: projectCount,
        totalScenes: sceneCount,
        recentProjects: recentProjects,
        recentUsers: recentUsers,
      },
      projectsByGenre: Array.isArray(projectsByGenreResult) ? projectsByGenreResult : [],
      usersByRole: Array.isArray(usersByRoleResult) ? usersByRoleResult : [],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
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

