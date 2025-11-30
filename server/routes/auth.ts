import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { getPool } from '../db/index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

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

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const verificationExpires = new Date(Date.now() + 86400000); // 24 hours from now

    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash, role, email_verified, email_verification_token, email_verification_expires) VALUES (?, ?, ?, ?, FALSE, ?, ?)',
      [username, email, passwordHash, role, verificationTokenHash, verificationExpires]
    );

    const insertResult = result as any;
    const userId = insertResult.insertId;

      // Send verification email
      // Frontend URL will be added automatically by emailService
      const verificationUrl = `/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
      await emailService.sendTemplateEmail('email_verification', email, {
        username: username,
        verificationLink: verificationUrl,
      });

      // Send welcome email
      await emailService.sendTemplateEmail('welcome', email, {
        username: username,
      });

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

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, email, username FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    ) as [any[], any];

    // Always return success to prevent email enumeration
    // In production, you would send an email here
    if (Array.isArray(users) && users.length > 0) {
      const user = users[0];
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

      // Store hashed token and expiration in database
      await pool.query(
        'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
        [resetTokenHash, resetExpires, user.id]
      );

      // Send password reset email
      // Frontend URL will be added automatically by emailService
      const resetUrl = `/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
      
      await emailService.sendTemplateEmail('password_reset', user.email, {
        username: user.username || user.email,
        resetLink: resetUrl,
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
      }
    }

    // Always return success message (security best practice)
    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return res.status(400).json({ error: 'Token, email, and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const pool = getPool();
    
    // Hash the token to compare with stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const [users] = await pool.query(
      `SELECT id, email, password_reset_expires 
       FROM users 
       WHERE email = ? 
       AND password_reset_token = ? 
       AND password_reset_expires > NOW() 
       AND is_active = TRUE`,
      [email, resetTokenHash]
    ) as [any[], any];

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = users[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await pool.query(
      'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
      [passwordHash, user.id]
    );

    // Send password changed notification email
    await emailService.sendTemplateEmail('password_changed', user.email, {
      username: user.email.split('@')[0], // Use email prefix as username fallback
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /api/auth/change-password - Change password for authenticated users
router.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const pool = getPool();
    const [users] = await pool.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    ) as [any[], any];

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Get user email for notification
    const [userData] = await pool.query(
      'SELECT email, username FROM users WHERE id = ?',
      [userId]
    ) as [any[], any];
    const userEmail = Array.isArray(userData) && userData.length > 0 ? userData[0].email : null;

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, userId]
    );

    // Send password changed notification email
    if (userEmail) {
      const username = Array.isArray(userData) && userData.length > 0 ? (userData[0].username || userEmail.split('@')[0]) : userEmail.split('@')[0];
      await emailService.sendTemplateEmail('password_changed', userEmail, {
        username: username,
      });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/auth/verify-email - Verify email address with token
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({ error: 'Token and email are required' });
    }

    const pool = getPool();
    
    // Hash the token to compare with stored hash
    const verificationTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid verification token
    const [users] = await pool.query(
      `SELECT id, email, email_verification_expires 
       FROM users 
       WHERE email = ? 
       AND email_verification_token = ? 
       AND email_verification_expires > NOW() 
       AND is_active = TRUE`,
      [email, verificationTokenHash]
    ) as [any[], any];

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = users[0];

    // Mark email as verified and clear verification token
    await pool.query(
      'UPDATE users SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?',
      [user.id]
    );

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// POST /api/auth/resend-verification - Resend verification email
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const pool = getPool();
    const [users] = await pool.query(
      'SELECT id, email, username, email_verified FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    ) as [any[], any];

    // Always return success to prevent email enumeration
    if (Array.isArray(users) && users.length > 0) {
      const user = users[0];
      
      // Skip if already verified
      if (user.email_verified) {
        return res.json({ message: 'Email is already verified' });
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
      const verificationExpires = new Date(Date.now() + 86400000); // 24 hours from now

      // Store hashed token and expiration in database
      await pool.query(
        'UPDATE users SET email_verification_token = ?, email_verification_expires = ? WHERE id = ?',
        [verificationTokenHash, verificationExpires, user.id]
      );

      // Send verification email
      // Frontend URL will be added automatically by emailService
      const verificationUrl = `/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
      await emailService.sendTemplateEmail('email_verification', user.email, {
        username: user.username || user.email,
        verificationLink: verificationUrl,
      });
    }

    res.json({ 
      message: 'If an account with that email exists and is not verified, a verification email has been sent.' 
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to process verification request' });
  }
});

export default router;

