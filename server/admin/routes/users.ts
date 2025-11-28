import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import { getPool } from '../../db';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = express.Router();

// POST /api/users - Create new user (admin only)
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, role = 'user' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const pool = getPool();

    // Check if user already exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, TRUE)',
      [username, email, passwordHash, role]
    );

    const insertResult = result as any;
    const userId = insertResult.insertId;

    // Fetch created user
    const [users] = await pool.query(
      'SELECT id, username, email, role, is_active, created_at, last_login FROM users WHERE id = ?',
      [userId]
    ) as [any[], any];

    res.status(201).json({
      message: 'User created successfully',
      user: users[0]
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /api/users - Get all users (admin only)
router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const pool = getPool();
    const { page = 1, limit = 50, role, search } = req.query;

    let query = 'SELECT id, username, email, role, is_active, created_at, last_login FROM users WHERE 1=1';
    const params: any[] = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (search) {
      query += ' AND (username LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const limitNum = parseInt(limit as string);
    const offset = (parseInt(page as string) - 1) * limitNum;
    params.push(limitNum, offset);

    const [users] = await pool.query(query, params);

    // Get total count
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM users');
    const total = (countResult as any[])[0].total;

    res.json({
      users,
      pagination: {
        page: parseInt(page as string),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get single user
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const pool = getPool();

    const [users] = await pool.query(
      'SELECT id, username, email, role, is_active, created_at, last_login FROM users WHERE id = ?',
      [userId]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/users/:id - Update user (admin or self)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const isAdmin = req.user?.role === 'admin';
    const isSelf = req.user?.id === userId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const pool = getPool();
    const { username, email, role, is_active, password } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (username) {
      updates.push('username = ?');
      params.push(username);
    }

    if (email) {
      updates.push('email = ?');
      params.push(email);
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }

    if (isAdmin && role) {
      updates.push('role = ?');
      params.push(role);
    }

    if (isAdmin && typeof is_active === 'boolean') {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(userId);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (req.user?.id === userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const pool = getPool();
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;

