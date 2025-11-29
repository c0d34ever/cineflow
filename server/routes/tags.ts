import express, { Request, Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/tags - Get all tags (authenticated)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  // Set timeout for this request
  req.setTimeout(5000); // 5 seconds
  
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      console.warn('Tags endpoint timeout - returning empty array');
      res.json({ tags: [] });
    }
  }, 4000); // Return empty array after 4 seconds
  
  try {
    const pool = getPool();
    
    // Simple query - should be very fast
    const [tags] = await pool.query('SELECT id, name, color FROM tags ORDER BY name ASC LIMIT 1000') as [any[], any];
    
    clearTimeout(timeoutId);
    
    // Ensure we return an array
    const tagsArray = Array.isArray(tags) ? tags : [];
    res.json({ tags: tagsArray });
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('Error fetching tags:', error);
    
    // Handle timeout specifically
    if (error.message?.includes('timeout') || error.message?.includes('TIMEOUT') || error.code === 'ETIMEDOUT' || error.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER') {
      console.warn('Tags query timeout - returning empty array');
      if (!res.headersSent) {
        return res.json({ tags: [] });
      }
      return;
    }
    
    // Handle database connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'PROTOCOL_ENQUEUE_AFTER_QUIT') {
      console.error('Database connection error:', error.code);
      if (!res.headersSent) {
        return res.status(503).json({ error: 'Database temporarily unavailable', tags: [] });
      }
      return;
    }
    
    // Return empty array on other errors instead of failing completely
    console.warn('Tags fetch error - returning empty array:', error.message);
    if (!res.headersSent) {
      res.json({ tags: [] });
    }
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

