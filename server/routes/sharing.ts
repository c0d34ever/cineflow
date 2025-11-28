import express, { Request, Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../admin/middleware/auth';
import crypto from 'crypto';

const router = express.Router();

// GET /api/sharing/project/:projectId - Get shares for a project
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
      return res.status(403).json({ error: 'Not authorized to view shares for this project' });
    }

    const [shares] = await pool.query(
      `SELECT ps.*, u.username as shared_with_username, u.email as shared_with_email
       FROM project_shares ps
       LEFT JOIN users u ON ps.shared_with_user_id = u.id
       WHERE ps.project_id = ? AND ps.shared_by_user_id = ?
       ORDER BY ps.created_at DESC`,
      [projectId, userId]
    );

    res.json({ shares });
  } catch (error) {
    console.error('Error fetching shares:', error);
    res.status(500).json({ error: 'Failed to fetch shares' });
  }
});

// POST /api/sharing - Create share
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { project_id, shared_with_user_id, access_level, expires_at } = req.body;
    const userId = req.user!.id;

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    const pool = getPool();

    // Verify user owns the project
    const [projects] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [project_id, userId]
    );

    if (!Array.isArray(projects) || projects.length === 0) {
      return res.status(403).json({ error: 'Not authorized to share this project' });
    }

    // Generate unique share token
    const shareToken = crypto.randomBytes(32).toString('hex');

    const [result] = await pool.query(
      `INSERT INTO project_shares 
       (project_id, shared_by_user_id, shared_with_user_id, share_token, access_level, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        userId,
        shared_with_user_id || null,
        shareToken,
        access_level || 'view',
        expires_at || null
      ]
    );

    const insertResult = result as any;

    // Update project visibility
    await pool.query(
      'UPDATE projects SET visibility = ? WHERE id = ?',
      ['shared', project_id]
    );

    res.status(201).json({
      id: insertResult.insertId,
      share_token: shareToken,
      share_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/shared/${shareToken}`,
      message: 'Project shared successfully'
    });
  } catch (error) {
    console.error('Error creating share:', error);
    res.status(500).json({ error: 'Failed to create share' });
  }
});

// DELETE /api/sharing/:id - Revoke share
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const shareId = parseInt(req.params.id);
    const userId = req.user!.id;
    const pool = getPool();

    // Verify user owns the share
    const [shares] = await pool.query(
      'SELECT id, project_id FROM project_shares WHERE id = ? AND shared_by_user_id = ?',
      [shareId, userId]
    );

    if (!Array.isArray(shares) || shares.length === 0) {
      return res.status(403).json({ error: 'Not authorized to revoke this share' });
    }

    await pool.query('DELETE FROM project_shares WHERE id = ?', [shareId]);
    res.json({ message: 'Share revoked successfully' });
  } catch (error) {
    console.error('Error revoking share:', error);
    res.status(500).json({ error: 'Failed to revoke share' });
  }
});

// GET /api/sharing/token/:token - Get project by share token (public)
router.get('/token/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    const pool = getPool();

    const [shares] = await pool.query(
      `SELECT ps.*, p.*
       FROM project_shares ps
       INNER JOIN projects p ON ps.project_id = p.id
       WHERE ps.share_token = ? AND ps.is_active = TRUE
       AND (ps.expires_at IS NULL OR ps.expires_at > NOW())`,
      [token]
    );

    if (!Array.isArray(shares) || shares.length === 0) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }

    const share = shares[0] as any;
    res.json({ share, access_level: share.access_level });
  } catch (error) {
    console.error('Error fetching share by token:', error);
    res.status(500).json({ error: 'Failed to fetch share' });
  }
});

export default router;

