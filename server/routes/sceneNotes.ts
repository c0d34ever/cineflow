import express, { Response } from 'express';
import { getPool } from '../db';
import { AuthRequest, authenticateToken } from '../admin/middleware/auth';

const router = express.Router();

// GET /api/scene-notes/scene/:sceneId - Get notes for a scene
router.get('/scene/:sceneId', async (req: express.Request, res: Response) => {
  try {
    const sceneId = req.params.sceneId;
    const pool = getPool();

    const [notes] = await pool.query(
      `SELECT n.*, u.username, u.email
       FROM scene_notes n
       LEFT JOIN users u ON n.user_id = u.id
       WHERE n.scene_id = ?
       ORDER BY n.is_resolved ASC, n.created_at DESC`,
      [sceneId]
    );

    res.json({ notes });
  } catch (error) {
    console.error('Error fetching scene notes:', error);
    res.status(500).json({ error: 'Failed to fetch scene notes' });
  }
});

// POST /api/scene-notes - Create scene note
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { scene_id, note_type, content } = req.body;

    if (!scene_id || !content) {
      return res.status(400).json({ error: 'scene_id and content are required' });
    }

    const pool = getPool();
    const userId = req.user!.id;

    const [result] = await pool.query(
      'INSERT INTO scene_notes (scene_id, user_id, note_type, content) VALUES (?, ?, ?, ?)',
      [scene_id, userId, note_type || 'note', content]
    );

    const insertResult = result as any;
    res.status(201).json({ id: insertResult.insertId, message: 'Note added' });
  } catch (error) {
    console.error('Error adding scene note:', error);
    res.status(500).json({ error: 'Failed to add scene note' });
  }
});

// PUT /api/scene-notes/:id - Update scene note
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    const { content, note_type, is_resolved } = req.body;
    const userId = req.user!.id;

    const pool = getPool();

    // Verify ownership
    const [notes] = await pool.query(
      'SELECT id FROM scene_notes WHERE id = ? AND user_id = ?',
      [noteId, userId]
    );

    if (!Array.isArray(notes) || notes.length === 0) {
      return res.status(403).json({ error: 'Not authorized to update this note' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (content) {
      updates.push('content = ?');
      params.push(content);
    }

    if (note_type) {
      updates.push('note_type = ?');
      params.push(note_type);
    }

    if (typeof is_resolved === 'boolean') {
      updates.push('is_resolved = ?');
      params.push(is_resolved);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(noteId);

    await pool.query(`UPDATE scene_notes SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'Note updated successfully' });
  } catch (error) {
    console.error('Error updating scene note:', error);
    res.status(500).json({ error: 'Failed to update scene note' });
  }
});

// DELETE /api/scene-notes/:id - Delete scene note
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const noteId = parseInt(req.params.id);
    const userId = req.user!.id;

    const pool = getPool();

    // Verify ownership or admin
    const [notes] = await pool.query(
      'SELECT id FROM scene_notes WHERE id = ? AND user_id = ?',
      [noteId, userId]
    );

    if (!Array.isArray(notes) || notes.length === 0) {
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to delete this note' });
      }
    }

    await pool.query('DELETE FROM scene_notes WHERE id = ?', [noteId]);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting scene note:', error);
    res.status(500).json({ error: 'Failed to delete scene note' });
  }
});

export default router;

