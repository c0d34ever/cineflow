import express, { Request, Response } from 'express';
import { getPool } from '../db';
import { AuthRequest, authenticateToken } from '../admin/middleware/auth';

const router = express.Router();

// GET /api/comments/project/:projectId - Get project comments
router.get('/project/:projectId', async (req: express.Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const pool = getPool();

    const [comments] = await pool.query(
      `SELECT c.*, u.username, u.email
       FROM project_comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.project_id = ?
       ORDER BY c.is_pinned DESC, c.created_at DESC`,
      [projectId]
    );

    res.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/comments/project/:projectId - Add comment
router.post('/project/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const { content, is_pinned } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const pool = getPool();
    const userId = req.user!.id;

    const [result] = await pool.query(
      'INSERT INTO project_comments (project_id, user_id, content, is_pinned) VALUES (?, ?, ?, ?)',
      [projectId, userId, content, is_pinned || false]
    );

    const insertResult = result as any;
    res.status(201).json({ id: insertResult.insertId, message: 'Comment added' });
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

export default router;

