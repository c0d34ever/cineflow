import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/characters/project/:projectId - Get all characters for a project
router.get('/project/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const pool = getPool();

    const [characters] = await pool.query(
      'SELECT * FROM characters WHERE project_id = ? ORDER BY name ASC',
      [projectId]
    );

    res.json({ characters });
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

// GET /api/characters/scene/:sceneId - Get characters in a scene
router.get('/scene/:sceneId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const sceneId = req.params.sceneId;
    const pool = getPool();

    const [characters] = await pool.query(
      `SELECT c.*, sc.role_in_scene 
       FROM characters c
       INNER JOIN scene_characters sc ON c.id = sc.character_id
       WHERE sc.scene_id = ?`,
      [sceneId]
    );

    res.json({ characters });
  } catch (error) {
    console.error('Error fetching scene characters:', error);
    res.status(500).json({ error: 'Failed to fetch scene characters' });
  }
});

// POST /api/characters - Create character
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { project_id, name, description, role, appearance, personality, backstory, image_url } = req.body;

    if (!project_id || !name) {
      return res.status(400).json({ error: 'project_id and name are required' });
    }

    const pool = getPool();

    const [result] = await pool.query(
      `INSERT INTO characters 
       (project_id, name, description, role, appearance, personality, backstory, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [project_id, name, description || null, role || null, appearance || null, personality || null, backstory || null, image_url || null]
    );

    const insertResult = result as any;
    res.status(201).json({ id: insertResult.insertId, message: 'Character created successfully' });
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ error: 'Failed to create character' });
  }
});

// PUT /api/characters/:id - Update character
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const characterId = parseInt(req.params.id);
    const { name, description, role, appearance, personality, backstory, image_url } = req.body;

    const pool = getPool();

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
    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }
    if (appearance !== undefined) {
      updates.push('appearance = ?');
      params.push(appearance);
    }
    if (personality !== undefined) {
      updates.push('personality = ?');
      params.push(personality);
    }
    if (backstory !== undefined) {
      updates.push('backstory = ?');
      params.push(backstory);
    }
    if (image_url !== undefined) {
      updates.push('image_url = ?');
      params.push(image_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(characterId);

    await pool.query(`UPDATE characters SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'Character updated successfully' });
  } catch (error) {
    console.error('Error updating character:', error);
    res.status(500).json({ error: 'Failed to update character' });
  }
});

// DELETE /api/characters/:id - Delete character
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const characterId = parseInt(req.params.id);
    const pool = getPool();

    await pool.query('DELETE FROM characters WHERE id = ?', [characterId]);
    res.json({ message: 'Character deleted successfully' });
  } catch (error) {
    console.error('Error deleting character:', error);
    res.status(500).json({ error: 'Failed to delete character' });
  }
});

// POST /api/characters/scene/:sceneId - Add character to scene
router.post('/scene/:sceneId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const sceneId = req.params.sceneId;
    const { character_id, role_in_scene } = req.body;

    if (!character_id) {
      return res.status(400).json({ error: 'character_id is required' });
    }

    const pool = getPool();

    await pool.query(
      'INSERT IGNORE INTO scene_characters (scene_id, character_id, role_in_scene) VALUES (?, ?, ?)',
      [sceneId, character_id, role_in_scene || null]
    );

    res.json({ message: 'Character added to scene' });
  } catch (error) {
    console.error('Error adding character to scene:', error);
    res.status(500).json({ error: 'Failed to add character to scene' });
  }
});

// DELETE /api/characters/scene/:sceneId/:characterId - Remove character from scene
router.delete('/scene/:sceneId/:characterId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const sceneId = req.params.sceneId;
    const characterId = parseInt(req.params.characterId);
    const pool = getPool();

    await pool.query(
      'DELETE FROM scene_characters WHERE scene_id = ? AND character_id = ?',
      [sceneId, characterId]
    );

    res.json({ message: 'Character removed from scene' });
  } catch (error) {
    console.error('Error removing character from scene:', error);
    res.status(500).json({ error: 'Failed to remove character from scene' });
  }
});

export default router;

