import express, { Request, Response } from 'express';
import { getPool } from '../db/index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// GET /api/scene-bookmarks/project/:projectId - Get all bookmarks for a project
router.get('/project/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const pool = getPool();
    const [bookmarks] = await pool.query(
      `SELECT * FROM scene_bookmarks 
       WHERE user_id = ? AND project_id = ? 
       ORDER BY created_at DESC`,
      [userId, projectId]
    );

    res.json({ bookmarks });
  } catch (error) {
    console.error('Error fetching scene bookmarks:', error);
    res.status(500).json({ error: 'Failed to fetch scene bookmarks' });
  }
});

// POST /api/scene-bookmarks - Create a bookmark
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { project_id, scene_id, category, notes } = req.body;
    const userId = req.user!.id;

    if (!project_id || !scene_id) {
      return res.status(400).json({ error: 'project_id and scene_id are required' });
    }

    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO scene_bookmarks (user_id, project_id, scene_id, category, notes)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       category = VALUES(category),
       notes = VALUES(notes),
       updated_at = CURRENT_TIMESTAMP`,
      [userId, project_id, scene_id, category || 'general', notes || null]
    );

    const insertResult = result as any;
    res.status(201).json({ 
      id: insertResult.insertId || insertResult.affectedRows,
      message: 'Bookmark created successfully' 
    });
  } catch (error) {
    console.error('Error creating scene bookmark:', error);
    res.status(500).json({ error: 'Failed to create scene bookmark' });
  }
});

// DELETE /api/scene-bookmarks/:id - Delete a bookmark
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const pool = getPool();
    const [result] = await pool.query(
      `DELETE FROM scene_bookmarks WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    const deleteResult = result as any;
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    res.json({ message: 'Bookmark deleted successfully' });
  } catch (error) {
    console.error('Error deleting scene bookmark:', error);
    res.status(500).json({ error: 'Failed to delete scene bookmark' });
  }
});

// DELETE /api/scene-bookmarks/scene/:sceneId - Delete bookmark by scene ID
router.delete('/scene/:sceneId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { sceneId } = req.params;
    const userId = req.user!.id;

    const pool = getPool();
    const [result] = await pool.query(
      `DELETE FROM scene_bookmarks WHERE scene_id = ? AND user_id = ?`,
      [sceneId, userId]
    );

    res.json({ message: 'Bookmark deleted successfully' });
  } catch (error) {
    console.error('Error deleting scene bookmark:', error);
    res.status(500).json({ error: 'Failed to delete scene bookmark' });
  }
});

// PUT /api/scene-bookmarks/:id - Update a bookmark
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { category, notes } = req.body;
    const userId = req.user!.id;

    const pool = getPool();
    const [result] = await pool.query(
      `UPDATE scene_bookmarks 
       SET category = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [category, notes, id, userId]
    );

    const updateResult = result as any;
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    res.json({ message: 'Bookmark updated successfully' });
  } catch (error) {
    console.error('Error updating scene bookmark:', error);
    res.status(500).json({ error: 'Failed to update scene bookmark' });
  }
});

export default router;

