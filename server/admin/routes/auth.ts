import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { getPool } from '../../db';

const router = express.Router();
const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h';

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!password || (!username && !email)) {
      return res.status(400).json({ error: 'Username/email and password required' });
    }

    const pool = getPool();
    const [users] = await pool.query(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = TRUE',
      [username || email, email || username]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0] as any;
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Generate token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, role = 'user' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const pool = getPool();

    // Check if user exists
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
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, role]
    );

    const insertResult = result as any;
    const userId = insertResult.insertId;

    // Generate token
    const token = jwt.sign(
      { userId, username, role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );

    res.status(201).json({
      token,
      user: {
        id: userId,
        username,
        email,
        role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /api/auth/me (get current user)
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const pool = getPool();

    const [users] = await pool.query(
      'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;

