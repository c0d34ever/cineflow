import express, { Request, Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/comments/project/:projectId - Get project comments
router.get('/project/:projectId', async (req: express.Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const sceneId = req.query.scene_id as string | undefined;
    const pool = getPool();

    let query = `SELECT c.*, u.username, u.email,
                 (SELECT COUNT(*) FROM project_comments WHERE parent_comment_id = c.id) as reply_count
                 FROM project_comments c
                 LEFT JOIN users u ON c.user_id = u.id
                 WHERE c.project_id = ?`;
    const params: any[] = [projectId];

    if (sceneId) {
      query += ' AND c.scene_id = ?';
      params.push(sceneId);
    } else {
      query += ' AND c.scene_id IS NULL';
    }

    query += ' ORDER BY c.is_pinned DESC, c.created_at DESC';

    const [comments] = await pool.query(query, params);

    // Load mentions for each comment
    const commentsWithMentions = await Promise.all(
      (comments as any[]).map(async (comment) => {
        const [mentions] = await pool.query(
          `SELECT cm.mentioned_user_id, u.username, u.email
           FROM comment_mentions cm
           LEFT JOIN users u ON cm.mentioned_user_id = u.id
           WHERE cm.comment_id = ?`,
          [comment.id]
        );
        return {
          ...comment,
          mentions: Array.isArray(mentions) ? mentions : []
        };
      })
    );

    res.json({ comments: commentsWithMentions });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// GET /api/comments/:id/replies - Get replies to a comment
router.get('/:id/replies', async (req: express.Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.id);
    const pool = getPool();

    const [replies] = await pool.query(
      `SELECT c.*, u.username, u.email
       FROM project_comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.parent_comment_id = ?
       ORDER BY c.created_at ASC`,
      [commentId]
    );

    res.json({ replies: replies || [] });
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// POST /api/comments/project/:projectId - Add comment
router.post('/project/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const { content, is_pinned, scene_id, parent_comment_id, mentioned_user_ids } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const pool = getPool();
    const userId = req.user!.id;

    // Extract mentions from content if not provided
    let mentionedIds: number[] = mentioned_user_ids || [];
    if (!mentionedIds.length) {
      const mentionRegex = /@(\w+)/g;
      const matches = content.match(mentionRegex);
      if (matches) {
        const usernames = matches.map(m => m.substring(1)); // Remove @
        const [users] = await pool.query(
          'SELECT id FROM users WHERE username IN (?)',
          [usernames]
        );
        mentionedIds = (users as any[]).map((u: any) => u.id);
      }
    }

    const [result] = await pool.query(
      `INSERT INTO project_comments (project_id, user_id, content, is_pinned, scene_id, parent_comment_id, mentions) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        userId,
        content,
        is_pinned || false,
        scene_id || null,
        parent_comment_id || null,
        JSON.stringify(mentionedIds)
      ]
    );

    const insertResult = result as any;
    const commentId = insertResult.insertId;

    // Create mention records and notifications
    if (mentionedIds.length > 0) {
      for (const mentionedUserId of mentionedIds) {
        if (mentionedUserId !== userId) { // Don't notify self
          // Insert mention record
          await pool.query(
            'INSERT INTO comment_mentions (comment_id, mentioned_user_id) VALUES (?, ?)',
            [commentId, mentionedUserId]
          );

          // Create notification
          await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, link, is_read)
             VALUES (?, 'comment_mention', ?, ?, ?, FALSE)`,
            [
              mentionedUserId,
              'You were mentioned in a comment',
              `${req.user!.username || req.user!.email} mentioned you in a comment`,
              `/projects/${projectId}${scene_id ? `?scene=${scene_id}` : ''}`
            ]
          );
        }
      }
    }

    res.status(201).json({ id: commentId, message: 'Comment added' });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// PUT /api/comments/:id - Update comment
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const commentId = parseInt(req.params.id);
    const { content, is_pinned } = req.body;
    const userId = req.user!.id;

    const pool = getPool();

    // Verify ownership
    const [comments] = await pool.query(
      'SELECT id FROM project_comments WHERE id = ? AND user_id = ?',
      [commentId, userId]
    );

    if (!Array.isArray(comments) || comments.length === 0) {
      return res.status(403).json({ error: 'Not authorized to update this comment' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (content) {
      updates.push('content = ?');
      params.push(content);
    }

    if (typeof is_pinned === 'boolean') {
      updates.push('is_pinned = ?');
      params.push(is_pinned);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(commentId);

    await pool.query(`UPDATE project_comments SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'Comment updated successfully' });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// DELETE /api/comments/:id - Delete comment
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const commentId = parseInt(req.params.id);
    const userId = req.user!.id;

    const pool = getPool();

    // Verify ownership or admin
    const [comments] = await pool.query(
      'SELECT id FROM project_comments WHERE id = ? AND user_id = ?',
      [commentId, userId]
    );

    if (!Array.isArray(comments) || comments.length === 0) {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to delete this comment' });
      }
    }

    await pool.query('DELETE FROM project_comments WHERE id = ?', [commentId]);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// GET /api/comments/users/search - Search users for @mention autocomplete
router.get('/users/search', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const search = req.query.q as string;
    if (!search || search.length < 1) {
      return res.json({ users: [] });
    }

    const pool = getPool();
    const [users] = await pool.query(
      `SELECT id, username, email 
       FROM users 
       WHERE (username LIKE ? OR email LIKE ?) AND is_active = TRUE
       LIMIT 10`,
      [`%${search}%`, `%${search}%`]
    );

    res.json({ users: users || [] });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

export default router;

