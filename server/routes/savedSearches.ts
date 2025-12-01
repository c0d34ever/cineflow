import express, { Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getPool } from '../db';

const router = express.Router();

// GET /api/saved-searches - Get user's saved searches
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const pool = getPool();

    const [searches] = await pool.query(
      `SELECT * FROM saved_searches 
       WHERE user_id = ? 
       ORDER BY last_used_at DESC, created_at DESC 
       LIMIT 50`,
      [userId]
    );

    res.json(searches);
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    res.status(500).json({ error: 'Failed to fetch saved searches' });
  }
});

// POST /api/saved-searches - Create a new saved search
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, search_query, filters } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Search name is required' });
    }

    const pool = getPool();

    const [result] = await pool.query(
      `INSERT INTO saved_searches (user_id, name, search_query, filters) 
       VALUES (?, ?, ?, ?)`,
      [userId, name.trim(), search_query || '', JSON.stringify(filters || {})]
    );

    const insertId = (result as any).insertId;

    const [savedSearch] = await pool.query(
      'SELECT * FROM saved_searches WHERE id = ?',
      [insertId]
    );

    res.status(201).json((savedSearch as any[])[0]);
  } catch (error) {
    console.error('Error creating saved search:', error);
    res.status(500).json({ error: 'Failed to create saved search' });
  }
});

// PUT /api/saved-searches/:id - Update a saved search
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const searchId = parseInt(req.params.id);
    const { name, search_query, filters } = req.body;

    const pool = getPool();

    // Verify ownership
    const [existing] = await pool.query(
      'SELECT * FROM saved_searches WHERE id = ? AND user_id = ?',
      [searchId, userId]
    );

    if ((existing as any[]).length === 0) {
      return res.status(404).json({ error: 'Saved search not found' });
    }

    await pool.query(
      `UPDATE saved_searches 
       SET name = ?, search_query = ?, filters = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        name?.trim() || (existing as any[])[0].name,
        search_query !== undefined ? search_query : (existing as any[])[0].search_query,
        filters !== undefined ? JSON.stringify(filters) : (existing as any[])[0].filters,
        searchId,
        userId
      ]
    );

    const [updated] = await pool.query(
      'SELECT * FROM saved_searches WHERE id = ?',
      [searchId]
    );

    res.json((updated as any[])[0]);
  } catch (error) {
    console.error('Error updating saved search:', error);
    res.status(500).json({ error: 'Failed to update saved search' });
  }
});

// DELETE /api/saved-searches/:id - Delete a saved search
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const searchId = parseInt(req.params.id);
    const pool = getPool();

    await pool.query(
      'DELETE FROM saved_searches WHERE id = ? AND user_id = ?',
      [searchId, userId]
    );

    res.json({ message: 'Saved search deleted' });
  } catch (error) {
    console.error('Error deleting saved search:', error);
    res.status(500).json({ error: 'Failed to delete saved search' });
  }
});

// POST /api/saved-searches/:id/use - Record usage of a saved search
router.post('/:id/use', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const searchId = parseInt(req.params.id);
    const pool = getPool();

    await pool.query(
      `UPDATE saved_searches 
       SET last_used_at = CURRENT_TIMESTAMP, use_count = use_count + 1
       WHERE id = ? AND user_id = ?`,
      [searchId, userId]
    );

    res.json({ message: 'Usage recorded' });
  } catch (error) {
    console.error('Error recording search usage:', error);
    res.status(500).json({ error: 'Failed to record usage' });
  }
});

export default router;

