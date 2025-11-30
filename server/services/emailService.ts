import nodemailer from 'nodemailer';
import { getPool } from '../db/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface TemplateVariables {
  [key: string]: string | number | boolean;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private settings: Map<string, string> = new Map();
  private settingsLoaded: boolean = false;

  // Encryption key (should match the one in emailSettings.ts)
  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production-32chars!!';
  private readonly ALGORITHM = 'aes-256-cbc';

  constructor() {
    // Delay loading settings until database is ready
    // This will be called after database initialization
    setTimeout(async () => {
      try {
        await this.loadSettings();
        await this.initializeTransporter();
      } catch (error: any) {
        console.warn('Failed to load email settings on startup, will retry:', error.message);
        // Fallback to env
        this.loadSettingsFromEnv();
        await this.initializeTransporter();
      }
    }, 1000);
  }

  private decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv(this.ALGORITHM, Buffer.from(this.ENCRYPTION_KEY.substring(0, 32), 'utf8'), iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Error decrypting:', error);
      return '';
    }
  }

  async loadSettings(): Promise<void> {
    try {
      const pool = getPool();
      const [settings] = await pool.query(
        'SELECT setting_key, setting_value, is_encrypted FROM system_email_settings'
      ) as [any[], any];

      this.settings.clear();
      
      if (Array.isArray(settings)) {
        for (const setting of settings) {
          let value = setting.setting_value || '';
          
          if (setting.is_encrypted && value) {
            value = this.decrypt(value);
          }
          
          this.settings.set(setting.setting_key, value);
        }
      }

      this.settingsLoaded = true;
    } catch (error) {
      console.error('Error loading email settings from database:', error);
      // Fallback to env variables if database fails
      this.loadSettingsFromEnv();
    }
  }

  async reloadSettings(): Promise<void> {
    await this.loadSettings();
    await this.initializeTransporter();
  }

  private loadSettingsFromEnv(): void {
    // Fallback to environment variables
    // Support both SMTP_* and MAIL_* naming conventions
    this.settings.set('smtp_host', process.env.SMTP_HOST || process.env.MAIL_HOST || '');
    this.settings.set('smtp_port', process.env.SMTP_PORT || process.env.MAIL_PORT || '587');
    this.settings.set('smtp_user', process.env.SMTP_USER || process.env.MAIL_USERNAME || '');
    this.settings.set('smtp_password', process.env.SMTP_PASSWORD || process.env.MAIL_PASSWORD || '');
    this.settings.set('smtp_from', process.env.SMTP_FROM || process.env.MAIL_FROM_ADDRESS || '');
    this.settings.set('smtp_service', process.env.SMTP_SERVICE || '');
    this.settings.set('smtp_encryption', process.env.SMTP_ENCRYPTION || process.env.MAIL_ENCRYPTION || '');
    this.settings.set('frontend_url', process.env.FRONTEND_URL || 'http://localhost:5173');
    this.settings.set('email_enabled', process.env.EMAIL_ENABLED || 'true');
  }

  private getSetting(key: string, defaultValue: string = ''): string {
    return this.settings.get(key) || defaultValue;
  }

  private async initializeTransporter() {
    // Check if email is enabled
    const emailEnabled = this.getSetting('email_enabled', 'false').toLowerCase() === 'true';
    if (!emailEnabled) {
      console.warn('⚠️  Email functionality is disabled in settings.');
      this.transporter = null;
      return;
    }

    // Check if SMTP is configured
    const smtpHost = this.getSetting('smtp_host');
    const smtpPort = this.getSetting('smtp_port', '587');
    const smtpUser = this.getSetting('smtp_user');
    const smtpPass = this.getSetting('smtp_password');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn('⚠️  SMTP not configured. Email functionality will be disabled.');
      console.warn('   Configure SMTP settings in the admin dashboard.');
      this.transporter = null;
      return;
    }

    try {
      const port = parseInt(smtpPort, 10);
      const encryption = this.getSetting('smtp_encryption', '').toLowerCase();
      
      // Determine secure based on port or encryption setting
      let secure = false;
      if (port === 465) {
        secure = true; // SSL on port 465
      } else if (port === 587 && encryption === 'tls') {
        secure = false; // TLS on port 587
      } else if (encryption === 'ssl') {
        secure = true; // SSL encryption
      } else if (encryption === 'tls') {
        secure = false; // TLS encryption (STARTTLS)
      } else {
        // Default: secure for 465, not secure for others
        secure = port === 465;
      }

      const transportConfig: any = {
        host: smtpHost,
        port: port,
        secure: secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      };

      // For Gmail and similar services
      const smtpService = this.getSetting('smtp_service');
      if (smtpService === 'gmail') {
        transportConfig.service = 'gmail';
      }

      // Add TLS options if using TLS/STARTTLS
      if (!secure && (encryption === 'tls' || port === 587)) {
        transportConfig.requireTLS = true;
        transportConfig.tls = {
          rejectUnauthorized: false, // Allow self-signed certificates if needed
        };
      }

      this.transporter = nodemailer.createTransport(transportConfig);

      console.log('✅ SMTP transporter initialized');
    } catch (error) {
      console.error('❌ Failed to initialize SMTP transporter:', error);
    }
  }

  /**
   * Get email template from database
   */
  async getTemplate(templateKey: string): Promise<any | null> {
    try {
      const pool = getPool();
      const [templates] = await pool.query(
        'SELECT * FROM email_templates WHERE template_key = ? AND is_active = TRUE LIMIT 1',
        [templateKey]
      ) as [any[], any];

      if (Array.isArray(templates) && templates.length > 0) {
        return templates[0];
      }
      return null;
    } catch (error) {
      console.error(`Error fetching email template ${templateKey}:`, error);
      return null;
    }
  }

  /**
   * Replace template variables in string
   */
  private replaceVariables(content: string, variables: TemplateVariables): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result;
  }

  /**
   * Send email using template
   */
  async sendTemplateEmail(
    templateKey: string,
    to: string,
    variables: TemplateVariables
  ): Promise<boolean> {
    try {
      // Ensure settings are loaded
      if (!this.settingsLoaded) {
        await this.loadSettings();
      }

      const template = await this.getTemplate(templateKey);
      if (!template) {
        console.error(`Template ${templateKey} not found`);
        return false;
      }

      // Get frontend URL and ensure links are absolute
      const frontendUrl = this.getSetting('frontend_url', 'http://localhost:5173').replace(/\/$/, '');
      
      // Add frontend_url to variables if not provided
      if (!variables.appUrl && !variables.frontend_url) {
        variables.appUrl = frontendUrl;
      }

      // Make relative links absolute
      if (variables.resetLink && !variables.resetLink.startsWith('http')) {
        variables.resetLink = frontendUrl + (variables.resetLink.startsWith('/') ? '' : '/') + variables.resetLink;
      }
      if (variables.verificationLink && !variables.verificationLink.startsWith('http')) {
        variables.verificationLink = frontendUrl + (variables.verificationLink.startsWith('/') ? '' : '/') + variables.verificationLink;
      }

      const subject = this.replaceVariables(template.subject, variables);
      const html = this.replaceVariables(template.body_html, variables);
      const text = template.body_text
        ? this.replaceVariables(template.body_text, variables)
        : undefined;

      return await this.sendEmail({
        to,
        subject,
        html,
        text,
      });
    } catch (error) {
      console.error(`Error sending template email ${templateKey}:`, error);
      return false;
    }
  }

  /**
   * Send email directly
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.warn('⚠️  SMTP not configured. Email not sent:', options.to);
      // In development, log the email content
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 [DEV] Email would be sent:');
        console.log('   To:', options.to);
        console.log('   Subject:', options.subject);
        console.log('   HTML:', options.html.substring(0, 200) + '...');
      }
      return false;
    }

    try {
      const from = this.getSetting('smtp_from') || this.getSetting('smtp_user') || 'noreply@cineflow.com';

      const info = await this.transporter.sendMail({
        from: `"CineFlow" <${from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      });

      console.log('✅ Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

