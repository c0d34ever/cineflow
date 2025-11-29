import express, { Request, Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/tags - Get all tags
router.get('/', async (req: express.Request, res: Response) => {
  try {
    const pool = getPool();
    const [tags] = await pool.query('SELECT * FROM tags ORDER BY name');
    res.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// POST /api/tags - Create tag (authenticated)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const pool = getPool();

    try {
      const [result] = await pool.query(
        'INSERT INTO tags (name, color) VALUES (?, ?)',
        [name, color || '#6366f1']
      );

      const insertResult = result as any;
      res.status(201).json({ id: insertResult.insertId, name, color: color || '#6366f1' });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Tag already exists' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// PUT /api/tags/:id - Update tag
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tagId = parseInt(req.params.id);
    const { name, color } = req.body;

    const pool = getPool();
    const updates: string[] = [];
    const params: any[] = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (color) {
      updates.push('color = ?');
      params.push(color);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(tagId);

    await pool.query(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'Tag updated successfully' });
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// DELETE /api/tags/:id - Delete tag
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tagId = parseInt(req.params.id);
    const pool = getPool();

    await pool.query('DELETE FROM tags WHERE id = ?', [tagId]);
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// POST /api/tags/:tagId/projects/:projectId - Add tag to project
router.post('/:tagId/projects/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tagId = parseInt(req.params.tagId);
    const projectId = req.params.projectId;

    const pool = getPool();

    await pool.query(
      'INSERT IGNORE INTO project_tags (project_id, tag_id) VALUES (?, ?)',
      [projectId, tagId]
    );

    res.json({ message: 'Tag added to project' });
  } catch (error) {
    console.error('Error adding tag to project:', error);
    res.status(500).json({ error: 'Failed to add tag to project' });
  }
});

// DELETE /api/tags/:tagId/projects/:projectId - Remove tag from project
router.delete('/:tagId/projects/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const tagId = parseInt(req.params.tagId);
    const projectId = req.params.projectId;

    const pool = getPool();

    await pool.query(
      'DELETE FROM project_tags WHERE project_id = ? AND tag_id = ?',
      [projectId, tagId]
    );

    res.json({ message: 'Tag removed from project' });
  } catch (error) {
    console.error('Error removing tag from project:', error);
    res.status(500).json({ error: 'Failed to remove tag from project' });
  }
});

export default router;

