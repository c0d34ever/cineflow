import express, { Response } from 'express';
import { getPool } from '../db';
import { AuthRequest, authenticateToken } from '../admin/middleware/auth';

const router = express.Router();

// GET /api/scene-templates - Get all scene templates (system + user's)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const pool = getPool();

    const [templates] = await pool.query(
      `SELECT * FROM scene_templates 
       WHERE is_system = TRUE OR user_id = ?
       ORDER BY is_system DESC, name ASC`,
      [userId]
    );

    res.json({ templates });
  } catch (error) {
    console.error('Error fetching scene templates:', error);
    res.status(500).json({ error: 'Failed to fetch scene templates' });
  }
});

// POST /api/scene-templates - Create scene template
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, raw_idea, director_settings } = req.body;
    const userId = req.user!.id;

    if (!name || !raw_idea) {
      return res.status(400).json({ error: 'name and raw_idea are required' });
    }

    const pool = getPool();

    const [result] = await pool.query(
      `INSERT INTO scene_templates 
       (user_id, name, description, raw_idea, director_settings)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        name,
        description || null,
        raw_idea,
        director_settings ? JSON.stringify(director_settings) : null
      ]
    );

    const insertResult = result as any;
    res.status(201).json({ id: insertResult.insertId, message: 'Scene template created successfully' });
  } catch (error) {
    console.error('Error creating scene template:', error);
    res.status(500).json({ error: 'Failed to create scene template' });
  }
});

// PUT /api/scene-templates/:id - Update scene template
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);
    const userId = req.user!.id;
    const { name, description, raw_idea, director_settings } = req.body;
    const pool = getPool();

    // Verify ownership
    const [templates] = await pool.query(
      'SELECT id FROM scene_templates WHERE id = ? AND user_id = ?',
      [templateId, userId]
    );

    if (!Array.isArray(templates) || templates.length === 0) {
      return res.status(403).json({ error: 'Not authorized to update this template' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (raw_idea !== undefined) {
      updates.push('raw_idea = ?');
      params.push(raw_idea);
    }
    if (director_settings !== undefined) {
      updates.push('director_settings = ?');
      params.push(JSON.stringify(director_settings));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(templateId);

    await pool.query(`UPDATE scene_templates SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'Scene template updated successfully' });
  } catch (error) {
    console.error('Error updating scene template:', error);
    res.status(500).json({ error: 'Failed to update scene template' });
  }
});

// DELETE /api/scene-templates/:id - Delete scene template
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);
    const userId = req.user!.id;
    const pool = getPool();

    // Verify ownership
    const [templates] = await pool.query(
      'SELECT id FROM scene_templates WHERE id = ? AND user_id = ?',
      [templateId, userId]
    );

    if (!Array.isArray(templates) || templates.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this template' });
    }

    await pool.query('DELETE FROM scene_templates WHERE id = ?', [templateId]);
    res.json({ message: 'Scene template deleted successfully' });
  } catch (error) {
    console.error('Error deleting scene template:', error);
    res.status(500).json({ error: 'Failed to delete scene template' });
  }
});

export default router;

