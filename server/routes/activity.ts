import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../admin/middleware/auth.js';

const router = express.Router();

// GET /api/activity - Get user's activity feed
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const pool = getPool();

    const [activities] = await pool.query(
      `SELECT al.*, p.context->>'$.title' as project_title
       FROM activity_logs_enhanced al
       LEFT JOIN projects p ON al.project_id = p.id
       WHERE al.user_id = ?
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// POST /api/activity - Log activity
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { project_id, activity_type, activity_description, metadata } = req.body;
    const userId = req.user!.id;

    if (!activity_type) {
      return res.status(400).json({ error: 'activity_type is required' });
    }

    const pool = getPool();

    const [result] = await pool.query(
      `INSERT INTO activity_logs_enhanced 
       (user_id, project_id, activity_type, activity_description, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        project_id || null,
        activity_type,
        activity_description || null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    const insertResult = result as any;
    res.status(201).json({ id: insertResult.insertId, message: 'Activity logged' });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// GET /api/activity/notifications - Get user's notifications
router.get('/notifications', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const pool = getPool();

    const [notifications] = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    const [unreadCount] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    res.json({
      notifications,
      unread_count: (unreadCount as any[])[0]?.count || 0
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/activity/notifications/:id/read - Mark notification as read
router.put('/notifications/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user!.id;
    const pool = getPool();

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/activity/notifications/read-all - Mark all notifications as read
router.put('/notifications/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const pool = getPool();

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

export default router;

