import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import { sseService } from '../services/sseService.js';
import jwt from 'jsonwebtoken';

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
// Note: EventSource doesn't support custom headers, so token is passed via query param
router.get('/notifications/stream', async (req: express.Request, res: Response) => {
  // Extract token from query (EventSource doesn't support custom headers)
  let token = (req.query.token as string) || req.headers.authorization?.replace('Bearer ', '');
  
  // Decode token if it's URL encoded
  if (token) {
    try {
      token = decodeURIComponent(token);
    } catch (e) {
      // Token might not be encoded, continue with original
    }
  }
  
  if (!token) {
    console.error('[Activity SSE] No token provided');
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Verify token
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  console.error(`[Activity SSE] JWT_SECRET is ${JWT_SECRET ? 'SET' : 'NOT SET'} (length: ${JWT_SECRET?.length || 0})`);
  console.error(`[Activity SSE] Token received (first 50 chars): ${token.substring(0, 50)}...`);
  
  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as any;
  } catch (jwtError: any) {
    console.error('[Activity SSE] JWT verification failed:', jwtError.name, jwtError.message);
    if (jwtError.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired', expiredAt: jwtError.expiredAt });
    }
    if (jwtError.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token', details: jwtError.message });
    }
    return res.status(401).json({ error: 'Token verification failed', details: jwtError.message });
  }
  
  const userId = decoded.userId;
  
  if (!userId) {
    console.error('[Activity SSE] Token missing userId');
    return res.status(401).json({ error: 'Invalid token: missing user ID' });
  }
  
  // Verify user still exists and is active
  try {
    const pool = getPool();
    const [usersResult] = await pool.query(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
      [userId]
    ) as [any[], any];

    const users = Array.isArray(usersResult) ? usersResult : [];
    if (users.length === 0) {
      console.error(`[Activity SSE] User not found: ${userId}`);
      return res.status(401).json({ error: 'User not found' });
    }

    const user = users[0] as any;
    if (!user.is_active) {
      console.error(`[Activity SSE] User account inactive: ${userId}`);
      return res.status(403).json({ error: 'User account is inactive' });
    }
    
    const connectionId = `notifications-${userId}-${Date.now()}`;
    
    // Store connection
    notificationConnections.set(userId, connectionId);
    
    // Create SSE connection
    sseService.createConnection(connectionId, res);
    
    console.error(`[Activity SSE] Connection established: ${connectionId} for user ${userId}`);
    
    // Send initial notifications
    try {
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
    
    // Keep connection alive with periodic ping
    const pingInterval = setInterval(() => {
      if (sseService.hasConnection(connectionId)) {
        sseService.send(connectionId, 'ping', { timestamp: Date.now() });
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds
    
    // Clean up on disconnect
    res.on('close', () => {
      clearInterval(pingInterval);
      notificationConnections.delete(userId);
      sseService.closeConnection(connectionId);
    });
  } catch (error: any) {
    console.error('[Activity SSE] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
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

