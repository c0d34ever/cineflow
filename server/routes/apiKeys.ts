import express, { Response } from 'express';
import crypto from 'crypto';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Generate API key
function generateApiKey(): string {
  return 'cf_' + crypto.randomBytes(32).toString('hex');
}

// GET /api/api-keys - Get user's API keys
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const pool = getPool();

    const [keys] = await pool.query(
      `SELECT id, key_name, api_key, last_used, usage_count, is_active, expires_at, created_at
       FROM api_keys 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ apiKeys: keys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// POST /api/api-keys - Create new API key
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { key_name, expires_at } = req.body;

    if (!key_name) {
      return res.status(400).json({ error: 'key_name is required' });
    }

    const pool = getPool();
    const apiKey = generateApiKey();

    const [result] = await pool.query(
      `INSERT INTO api_keys (user_id, key_name, api_key, expires_at)
       VALUES (?, ?, ?, ?)`,
      [userId, key_name, apiKey, expires_at || null]
    );

    const insertResult = result as any;

    res.status(201).json({
      id: insertResult.insertId,
      key_name,
      api_key: apiKey, // Only shown once
      expires_at: expires_at || null,
      message: 'API key created. Save it now - it will not be shown again!'
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// PUT /api/api-keys/:id - Update API key
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const keyId = parseInt(req.params.id);
    const { key_name, is_active } = req.body;

    const pool = getPool();

    // Verify ownership
    const [keys] = await pool.query(
      'SELECT id FROM api_keys WHERE id = ? AND user_id = ?',
      [keyId, userId]
    );

    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (key_name) {
      updates.push('key_name = ?');
      params.push(key_name);
    }

    if (typeof is_active === 'boolean') {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(keyId, userId);

    await pool.query(
      `UPDATE api_keys SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    res.json({ message: 'API key updated successfully' });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// DELETE /api/api-keys/:id - Delete API key
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const keyId = parseInt(req.params.id);

    const pool = getPool();

    await pool.query(
      'DELETE FROM api_keys WHERE id = ? AND user_id = ?',
      [keyId, userId]
    );

    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// POST /api/api-keys/:id/regenerate - Regenerate API key
router.post('/:id/regenerate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const keyId = parseInt(req.params.id);

    const pool = getPool();

    // Verify ownership
    const [keys] = await pool.query(
      'SELECT id, key_name FROM api_keys WHERE id = ? AND user_id = ?',
      [keyId, userId]
    );

    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const newApiKey = generateApiKey();

    await pool.query(
      'UPDATE api_keys SET api_key = ?, usage_count = 0 WHERE id = ? AND user_id = ?',
      [newApiKey, keyId, userId]
    );

    res.json({
      api_key: newApiKey,
      message: 'API key regenerated. Save it now - it will not be shown again!'
    });
  } catch (error) {
    console.error('Error regenerating API key:', error);
    res.status(500).json({ error: 'Failed to regenerate API key' });
  }
});

export default router;

