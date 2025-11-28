import express, { Response } from 'express';
import { getPool } from '../db';
import { AuthRequest, authenticateToken } from '../admin/middleware/auth';

const router = express.Router();

// GET /api/favorites - Get user's favorites
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const pool = getPool();

    const [favorites] = await pool.query(
      `SELECT p.*, f.created_at as favorited_at
       FROM favorites f
       JOIN projects p ON f.project_id = p.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ favorites });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// POST /api/favorites/:projectId - Add to favorites
router.post('/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.projectId;

    const pool = getPool();

    await pool.query(
      'INSERT IGNORE INTO favorites (user_id, project_id) VALUES (?, ?)',
      [userId, projectId]
    );

    res.json({ message: 'Added to favorites' });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

// DELETE /api/favorites/:projectId - Remove from favorites
router.delete('/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.projectId;

    const pool = getPool();

    await pool.query(
      'DELETE FROM favorites WHERE user_id = ? AND project_id = ?',
      [userId, projectId]
    );

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

// GET /api/favorites/check/:projectId - Check if favorited
router.get('/check/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.projectId;

    const pool = getPool();

    const [favorites] = await pool.query(
      'SELECT id FROM favorites WHERE user_id = ? AND project_id = ?',
      [userId, projectId]
    );

    res.json({ isFavorited: Array.isArray(favorites) && favorites.length > 0 });
  } catch (error) {
    console.error('Error checking favorite:', error);
    res.status(500).json({ error: 'Failed to check favorite' });
  }
});

export default router;

