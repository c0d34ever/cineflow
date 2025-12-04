import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import { sseService } from '../services/sseService.js';

const router = express.Router();

// Store notification SSE connections per user
const notificationConnections = new Map<number, string>();

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

// DELETE /api/activity/notifications/:id - Delete notification
router.delete('/notifications/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user!.id;
    const pool = getPool();

    await pool.query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    // Notify via SSE if connection exists
    const connectionId = notificationConnections.get(userId);
    if (connectionId && sseService.hasConnection(connectionId)) {
      sseService.send(connectionId, 'notification_deleted', { notificationId });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// GET /api/activity/notifications/stream - SSE stream for real-time notifications
router.get('/notifications/stream', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const connectionId = `notifications-${userId}-${Date.now()}`;
  
  // Store connection
  notificationConnections.set(userId, connectionId);
  
  // Create SSE connection
  sseService.createConnection(connectionId, res);
  
  // Send initial notifications
  try {
    const pool = getPool();
    const limit = 50;
    
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

    sseService.send(connectionId, 'notifications', {
      notifications,
      unread_count: (unreadCount as any[])[0]?.count || 0
    });
  } catch (error) {
    console.error('Error sending initial notifications:', error);
  }
  
  // Clean up on disconnect
  res.on('close', () => {
    notificationConnections.delete(userId);
    sseService.closeConnection(connectionId);
  });
});

// Helper function to notify user of new notification (called when notification is created)
export const notifyUserViaSSE = (userId: number, notification: any) => {
  const connectionId = notificationConnections.get(userId);
  if (connectionId && sseService.hasConnection(connectionId)) {
    sseService.send(connectionId, 'new_notification', notification);
    
    // Also update unread count
    const pool = getPool();
    pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    ).then(([result]) => {
      const unreadCount = (result as any[])[0]?.count || 0;
      sseService.send(connectionId, 'unread_count', { count: unreadCount });
    }).catch(err => console.error('Error updating unread count:', err));
  }
};

export default router;

