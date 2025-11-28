import express, { Response } from 'express';
import { getPool } from '../db';
import { AuthRequest, authenticateToken } from '../admin/middleware/auth';

const router = express.Router();

// GET /api/locations/project/:projectId - Get all locations for a project
router.get('/project/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const pool = getPool();

    const [locations] = await pool.query(
      'SELECT * FROM locations WHERE project_id = ? ORDER BY name ASC',
      [projectId]
    );

    res.json({ locations });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// GET /api/locations/scene/:sceneId - Get locations for a scene
router.get('/scene/:sceneId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const sceneId = req.params.sceneId;
    const pool = getPool();

    const [locations] = await pool.query(
      `SELECT l.*
       FROM locations l
       INNER JOIN scene_locations sl ON l.id = sl.location_id
       WHERE sl.scene_id = ?`,
      [sceneId]
    );

    res.json({ locations });
  } catch (error) {
    console.error('Error fetching scene locations:', error);
    res.status(500).json({ error: 'Failed to fetch scene locations' });
  }
});

// POST /api/locations - Create location
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { project_id, name, description, location_type, address, image_url, notes } = req.body;

    if (!project_id || !name) {
      return res.status(400).json({ error: 'project_id and name are required' });
    }

    const pool = getPool();

    const [result] = await pool.query(
      `INSERT INTO locations 
       (project_id, name, description, location_type, address, image_url, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        name,
        description || null,
        location_type || null,
        address || null,
        image_url || null,
        notes || null
      ]
    );

    const insertResult = result as any;
    res.status(201).json({ id: insertResult.insertId, message: 'Location created successfully' });
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// PUT /api/locations/:id - Update location
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const locationId = parseInt(req.params.id);
    const { name, description, location_type, address, image_url, notes } = req.body;

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
    if (location_type !== undefined) {
      updates.push('location_type = ?');
      params.push(location_type);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address);
    }
    if (image_url !== undefined) {
      updates.push('image_url = ?');
      params.push(image_url);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(locationId);

    await pool.query(`UPDATE locations SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// DELETE /api/locations/:id - Delete location
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const locationId = parseInt(req.params.id);
    const pool = getPool();

    await pool.query('DELETE FROM locations WHERE id = ?', [locationId]);
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

// POST /api/locations/scene/:sceneId - Add location to scene
router.post('/scene/:sceneId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const sceneId = req.params.sceneId;
    const { location_id } = req.body;

    if (!location_id) {
      return res.status(400).json({ error: 'location_id is required' });
    }

    const pool = getPool();

    await pool.query(
      'INSERT IGNORE INTO scene_locations (scene_id, location_id) VALUES (?, ?)',
      [sceneId, location_id]
    );

    // Also update scene's primary location_id
    await pool.query(
      'UPDATE scenes SET location_id = ? WHERE id = ?',
      [location_id, sceneId]
    );

    res.json({ message: 'Location added to scene' });
  } catch (error) {
    console.error('Error adding location to scene:', error);
    res.status(500).json({ error: 'Failed to add location to scene' });
  }
});

// DELETE /api/locations/scene/:sceneId/:locationId - Remove location from scene
router.delete('/scene/:sceneId/:locationId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const sceneId = req.params.sceneId;
    const locationId = parseInt(req.params.locationId);
    const pool = getPool();

    await pool.query(
      'DELETE FROM scene_locations WHERE scene_id = ? AND location_id = ?',
      [sceneId, locationId]
    );

    res.json({ message: 'Location removed from scene' });
  } catch (error) {
    console.error('Error removing location from scene:', error);
    res.status(500).json({ error: 'Failed to remove location from scene' });
  }
});

export default router;

