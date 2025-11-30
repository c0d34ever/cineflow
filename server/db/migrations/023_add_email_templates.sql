-- Migration: 023_add_email_templates
-- Description: Add email templates table for SMTP email service
-- Created: 2024-01-01

CREATE TABLE IF NOT EXISTS email_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSON, -- JSON array of available variables like {{username}}, {{resetLink}}, etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_template_key (template_key),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add email_verified column to users table
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE AFTER email,
ADD COLUMN email_verification_token VARCHAR(255) NULL AFTER email_verified,
ADD COLUMN email_verification_expires DATETIME NULL AFTER email_verification_token,
ADD INDEX idx_email_verification_token (email_verification_token);

-- Insert default email templates
INSERT INTO email_templates (template_key, name, subject, body_html, body_text, variables) VALUES
('password_reset', 'Password Reset', 'Reset Your Password', 
'<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #FF6B35;">Password Reset Request</h2>
    <p>Hello {{username}},</p>
    <p>You requested to reset your password. Click the button below to reset it:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{resetLink}}" style="background-color: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
    </p>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666;">{{resetLink}}</p>
    <p>This link will expire in 1 hour.</p>
    <p>If you did not request this password reset, please ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">This is an automated message, please do not reply.</p>
  </div>
</body>
</html>',
'Hello {{username}},

You requested to reset your password. Click the link below to reset it:

{{resetLink}}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email.

This is an automated message, please do not reply.',
JSON_ARRAY('username', 'resetLink')),

('email_verification', 'Email Verification', 'Verify Your Email Address',
'<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #FF6B35;">Verify Your Email Address</h2>
    <p>Hello {{username}},</p>
    <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{verificationLink}}" style="background-color: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
    </p>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666;">{{verificationLink}}</p>
    <p>This link will expire in 24 hours.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">This is an automated message, please do not reply.</p>
  </div>
</body>
</html>',
'Hello {{username}},

Thank you for registering! Please verify your email address by clicking the link below:

{{verificationLink}}

This link will expire in 24 hours.

This is an automated message, please do not reply.',
JSON_ARRAY('username', 'verificationLink')),

('welcome', 'Welcome Email', 'Welcome to CineFlow!',
'<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #FF6B35;">Welcome to CineFlow!</h2>
    <p>Hello {{username}},</p>
    <p>Welcome to CineFlow! We''re excited to have you on board.</p>
    <p>Get started by creating your first project and bringing your stories to life.</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{appUrl}}" style="background-color: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Get Started</a>
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">This is an automated message, please do not reply.</p>
  </div>
</body>
</html>',
'Hello {{username}},

Welcome to CineFlow! We''re excited to have you on board.

Get started by creating your first project and bringing your stories to life.

Visit: {{appUrl}}

This is an automated message, please do not reply.',
JSON_ARRAY('username', 'appUrl')),

('password_changed', 'Password Changed', 'Your Password Has Been Changed',
'<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #FF6B35;">Password Changed Successfully</h2>
    <p>Hello {{username}},</p>
    <p>Your password has been successfully changed.</p>
    <p>If you did not make this change, please contact support immediately.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">This is an automated message, please do not reply.</p>
  </div>
</body>
</html>',
'Hello {{username}},

Your password has been successfully changed.

If you did not make this change, please contact support immediately.

This is an automated message, please do not reply.',
JSON_ARRAY('username'));

