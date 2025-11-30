// Utility script to seed email settings from environment variables
// Run this after migration 024 to populate initial settings from .env

import { getPool } from '../index.js';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-32chars!!';
const ALGORITHM = 'aes-256-cbc';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.substring(0, 32), 'utf8'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function seedEmailSettings() {
  try {
    // Ensure connection is established
    const pool = getPool();
    
    // Test connection
    await pool.query('SELECT 1');

    // Check each setting and update from env if not already set
    // Supports both SMTP_* and MAIL_* variable names (Laravel-style)
    const settings = [
      { key: 'smtp_host', env: ['SMTP_HOST', 'MAIL_HOST'], encrypted: false },
      { key: 'smtp_port', env: ['SMTP_PORT', 'MAIL_PORT'], encrypted: false },
      { key: 'smtp_user', env: ['SMTP_USER', 'MAIL_USERNAME'], encrypted: false },
      { key: 'smtp_password', env: ['SMTP_PASSWORD', 'MAIL_PASSWORD'], encrypted: true },
      { key: 'smtp_from', env: ['SMTP_FROM', 'MAIL_FROM_ADDRESS'], encrypted: false },
      { key: 'smtp_service', env: ['SMTP_SERVICE'], encrypted: false },
      { key: 'smtp_encryption', env: ['SMTP_ENCRYPTION', 'MAIL_ENCRYPTION'], encrypted: false },
      { key: 'frontend_url', env: ['FRONTEND_URL'], encrypted: false },
      { key: 'email_enabled', env: ['EMAIL_ENABLED'], encrypted: false },
    ];

    for (const setting of settings) {
      // Support multiple env variable names (array or single string)
      const envNames = Array.isArray(setting.env) ? setting.env : [setting.env];
      let envValue: string | undefined;
      
      for (const envName of envNames) {
        envValue = process.env[envName];
        if (envValue) break; // Use first found value
      }
      
      if (!envValue) {
        continue; // Skip if env var not set
      }

      // Check if setting already has a value
      const [existing] = await pool.query(
        'SELECT setting_value FROM system_email_settings WHERE setting_key = ?',
        [setting.key]
      ) as [any[], any];

      if (Array.isArray(existing) && existing.length > 0 && existing[0].setting_value) {
        console.log(`⏭️  Skipping ${setting.key} - already has value`);
        continue;
      }

      // Prepare value (encrypt if needed)
      let value = envValue;
      if (setting.encrypted) {
        value = encrypt(envValue);
      }

      // Update setting
      await pool.query(
        'UPDATE system_email_settings SET setting_value = ? WHERE setting_key = ?',
        [value, setting.key]
      );

      console.log(`✅ Seeded ${setting.key} from environment`);
    }

    console.log('✅ Email settings seeding completed');
  } catch (error) {
    console.error('❌ Error seeding email settings:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedEmailSettings()
    .then(() => {
      console.log('Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

export { seedEmailSettings };

