import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Encryption key (should be stored in env, but for simplicity using a constant)
// In production, use a proper key management system
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-32chars!!';
const ALGORITHM = 'aes-256-cbc';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.substring(0, 32), 'utf8'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.substring(0, 32), 'utf8'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// GET /api/email-settings - Get all email settings (admin only)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const pool = getPool();
    const [settings] = await pool.query(
      'SELECT setting_key, setting_value, description, is_encrypted, updated_at FROM system_email_settings ORDER BY setting_key'
    ) as [any[], any];

    // Decrypt encrypted values for display (but mask sensitive ones)
    const processedSettings = (Array.isArray(settings) ? settings : []).map((setting: any) => {
      let value = setting.setting_value;
      
      if (setting.is_encrypted && value) {
        try {
          value = decrypt(value);
          // Mask password fields
          if (setting.setting_key === 'smtp_password') {
            value = value.length > 0 ? '••••••••' : '';
          }
        } catch (error) {
          console.error('Error decrypting setting:', error);
          value = '';
        }
      }

      return {
        key: setting.setting_key,
        value: value,
        description: setting.description,
        is_encrypted: setting.is_encrypted,
        updated_at: setting.updated_at,
      };
    });

    res.json({ settings: processedSettings });
  } catch (error: any) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({ error: 'Failed to fetch email settings' });
  }
});

// PUT /api/email-settings - Update email settings (admin only)
router.put('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings array is required' });
    }

    const pool = getPool();

    for (const setting of settings) {
      const { key, value } = setting;

      if (!key) {
        continue;
      }

      // Get setting metadata
      const [existing] = await pool.query(
        'SELECT is_encrypted FROM system_email_settings WHERE setting_key = ?',
        [key]
      ) as [any[], any];

      if (!Array.isArray(existing) || existing.length === 0) {
        continue; // Skip unknown settings
      }

      const isEncrypted = existing[0].is_encrypted;
      let finalValue = value || '';

      // Encrypt if needed
      if (isEncrypted && finalValue && finalValue !== '••••••••') {
        finalValue = encrypt(finalValue);
      } else if (isEncrypted && finalValue === '••••••••') {
        // Don't update if masked (user didn't change it)
        continue;
      }

      // Update setting
      await pool.query(
        'UPDATE system_email_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
        [finalValue, key]
      );
    }

    res.json({ message: 'Email settings updated successfully' });
  } catch (error: any) {
    console.error('Error updating email settings:', error);
    res.status(500).json({ error: 'Failed to update email settings' });
  }
});

// POST /api/email-settings/test - Test email settings (admin only)
router.post('/test', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { to } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    // Import emailService dynamically to avoid circular dependency
    const { emailService } = await import('../services/emailService.js');
    
    // Reload settings before testing
    await emailService.reloadSettings();

    const success = await emailService.sendEmail({
      to,
      subject: 'Test Email from CineFlow',
      html: '<p>This is a test email from CineFlow. If you received this, your SMTP settings are configured correctly!</p>',
      text: 'This is a test email from CineFlow. If you received this, your SMTP settings are configured correctly!',
    });

    if (success) {
      res.json({ message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send test email. Check SMTP settings.' });
    }
  } catch (error: any) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email: ' + error.message });
  }
});

export default router;

