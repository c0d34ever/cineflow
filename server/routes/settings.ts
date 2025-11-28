import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../admin/middleware/auth';

const router = express.Router();

// GET /api/settings - Get user settings
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const pool = getPool();

    const [settings] = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    ) as [any[], any];

    if (!Array.isArray(settings) || settings.length === 0) {
      // Create default settings
      await pool.query(
        `INSERT INTO user_settings (user_id) VALUES (?)`,
        [userId]
      );

      const [newSettings] = await pool.query(
        'SELECT * FROM user_settings WHERE user_id = ?',
        [userId]
      ) as [any[], any];

      return res.json({ settings: newSettings[0] });
    }

    res.json({ settings: settings[0] });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings - Update user settings
router.put('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      theme,
      language,
      timezone,
      notifications_enabled,
      email_notifications,
      auto_save,
      default_project_visibility,
      preferences
    } = req.body;

    const pool = getPool();

    // Check if settings exist
    const [existing] = await pool.query(
      'SELECT id FROM user_settings WHERE user_id = ?',
      [userId]
    );

    const updates: string[] = [];
    const params: any[] = [];

    if (theme) {
      updates.push('theme = ?');
      params.push(theme);
    }

    if (language) {
      updates.push('language = ?');
      params.push(language);
    }

    if (timezone) {
      updates.push('timezone = ?');
      params.push(timezone);
    }

    if (typeof notifications_enabled === 'boolean') {
      updates.push('notifications_enabled = ?');
      params.push(notifications_enabled);
    }

    if (typeof email_notifications === 'boolean') {
      updates.push('email_notifications = ?');
      params.push(email_notifications);
    }

    if (typeof auto_save === 'boolean') {
      updates.push('auto_save = ?');
      params.push(auto_save);
    }

    if (default_project_visibility) {
      updates.push('default_project_visibility = ?');
      params.push(default_project_visibility);
    }

    if (preferences) {
      updates.push('preferences = ?');
      params.push(JSON.stringify(preferences));
    }

    if (Array.isArray(existing) && existing.length > 0) {
      // Update existing
      if (updates.length > 0) {
        params.push(userId);
        await pool.query(
          `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`,
          params
        );
      }
    } else {
      // Create new
      await pool.query(
        `INSERT INTO user_settings (user_id, ${updates.map(u => u.split(' = ')[0]).join(', ')}) 
         VALUES (?, ${updates.map(() => '?').join(', ')})`,
        [userId, ...params]
      );
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;

