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
    let userCountResult: any[], projectCountResult: any[], sceneCountResult: any[], activeUserCountResult: any[];
    
    try {
      [userCountResult] = await pool.query('SELECT COUNT(*) as count FROM users') as [any[], any];
    } catch (err: any) {
      console.error('Error querying users:', err);
      userCountResult = [{ count: 0 }];
    }
    
    try {
      [projectCountResult] = await pool.query('SELECT COUNT(*) as count FROM projects') as [any[], any];
    } catch (err: any) {
      console.error('Error querying projects:', err);
      projectCountResult = [{ count: 0 }];
    }
    
    try {
      [sceneCountResult] = await pool.query('SELECT COUNT(*) as count FROM scenes') as [any[], any];
    } catch (err: any) {
      console.error('Error querying scenes:', err);
      sceneCountResult = [{ count: 0 }];
    }
    
    try {
      [activeUserCountResult] = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE') as [any[], any];
    } catch (err: any) {
      console.error('Error querying active users:', err);
      activeUserCountResult = [{ count: 0 }];
    }

    // Get recent activity
    let recentProjectsResult: any[], recentUsersResult: any[], projectsByGenreResult: any[], usersByRoleResult: any[];
    
    try {
      [recentProjectsResult] = await pool.query(
        'SELECT COUNT(*) as count FROM projects WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
      ) as [any[], any];
    } catch (err: any) {
      console.error('Error querying recent projects:', err);
      recentProjectsResult = [{ count: 0 }];
    }

    try {
      [recentUsersResult] = await pool.query(
        'SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
      ) as [any[], any];
    } catch (err: any) {
      console.error('Error querying recent users:', err);
      recentUsersResult = [{ count: 0 }];
    }

    // Get projects by genre
    try {
      [projectsByGenreResult] = await pool.query(
        `SELECT genre, COUNT(*) as count 
         FROM projects 
         WHERE genre IS NOT NULL 
         GROUP BY genre 
         ORDER BY count DESC 
         LIMIT 10`
      ) as [any[], any];
    } catch (err: any) {
      console.error('Error querying projects by genre:', err);
      projectsByGenreResult = [];
    }

    // Get user roles distribution
    try {
      [usersByRoleResult] = await pool.query(
        `SELECT role, COUNT(*) as count 
         FROM users 
         GROUP BY role`
      ) as [any[], any];
    } catch (err: any) {
      console.error('Error querying users by role:', err);
      usersByRoleResult = [];
    }

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

