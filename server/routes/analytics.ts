import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/analytics/project/:projectId - Get project analytics
router.get('/project/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user!.id;
    const pool = getPool();

    // Verify user owns the project
    const [projects] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (!Array.isArray(projects) || projects.length === 0) {
      return res.status(403).json({ error: 'Not authorized to view analytics for this project' });
    }

    // Get project analytics
    const [analytics] = await pool.query(
      'SELECT * FROM project_analytics WHERE project_id = ?',
      [projectId]
    ) as [any[], any];

    // Get scene count
    const [sceneCount] = await pool.query(
      'SELECT COUNT(*) as count FROM scenes WHERE project_id = ?',
      [projectId]
    );

    // Get export count
    const [exportCount] = await pool.query(
      'SELECT COUNT(*) as count FROM export_history WHERE project_id = ?',
      [projectId]
    );

    // Get comment count
    const [commentCount] = await pool.query(
      'SELECT COUNT(*) as count FROM project_comments WHERE project_id = ?',
      [projectId]
    );

    // Get character count
    const [characterCount] = await pool.query(
      'SELECT COUNT(*) as count FROM characters WHERE project_id = ?',
      [projectId]
    );

    // Get location count
    const [locationCount] = await pool.query(
      'SELECT COUNT(*) as count FROM locations WHERE project_id = ?',
      [projectId]
    );

    const analyticsData = (analytics as any[])[0] || {};
    const sceneCountNum = (sceneCount as any[])[0]?.count || 0;
    const exportCountNum = (exportCount as any[])[0]?.count || 0;
    const commentCountNum = (commentCount as any[])[0]?.count || 0;
    const characterCountNum = (characterCount as any[])[0]?.count || 0;
    const locationCountNum = (locationCount as any[])[0]?.count || 0;

    res.json({
      analytics: analyticsData,
      stats: {
        scenes: sceneCountNum,
        exports: exportCountNum,
        comments: commentCountNum,
        characters: characterCountNum,
        locations: locationCountNum,
        total_duration: sceneCountNum * 8, // 8 seconds per scene
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// POST /api/analytics/project/:projectId/view - Track project view
router.post('/project/:projectId/view', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const pool = getPool();

    // Update or create analytics record
    await pool.query(
      `INSERT INTO project_analytics (project_id, view_count, last_viewed)
       VALUES (?, 1, NOW())
       ON DUPLICATE KEY UPDATE
       view_count = view_count + 1,
       last_viewed = NOW()`,
      [projectId]
    );

    res.json({ message: 'View tracked' });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ error: 'Failed to track view' });
  }
});

// POST /api/analytics/project/:projectId/edit - Track project edit
router.post('/project/:projectId/edit', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const pool = getPool();

    // Update or create analytics record
    await pool.query(
      `INSERT INTO project_analytics (project_id, edit_count, last_edited)
       VALUES (?, 1, NOW())
       ON DUPLICATE KEY UPDATE
       edit_count = edit_count + 1,
       last_edited = NOW()`,
      [projectId]
    );

    res.json({ message: 'Edit tracked' });
  } catch (error) {
    console.error('Error tracking edit:', error);
    res.status(500).json({ error: 'Failed to track edit' });
  }
});

export default router;

