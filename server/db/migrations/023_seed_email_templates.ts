// Migration: 023_seed_email_templates
// Description: Seed default email templates (runs after 023_add_email_templates)
// Created: 2024-01-01

import { getPool } from '../index.js';

const emailTemplates = [
  {
    template_key: 'password_reset',
    name: 'Password Reset',
    subject: 'Reset Your Password',
    body_html: `<html>
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
</html>`,
    body_text: `Hello {{username}},

You requested to reset your password. Click the link below to reset it:

{{resetLink}}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email.

This is an automated message, please do not reply.`,
    variables: JSON.stringify(['username', 'resetLink']),
  },
  {
    template_key: 'email_verification',
    name: 'Email Verification',
    subject: 'Verify Your Email Address',
    body_html: `<html>
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
</html>`,
    body_text: `Hello {{username}},

Thank you for registering! Please verify your email address by clicking the link below:

{{verificationLink}}

This link will expire in 24 hours.

This is an automated message, please do not reply.`,
    variables: JSON.stringify(['username', 'verificationLink']),
  },
  {
    template_key: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to CineFlow!',
    body_html: `<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #FF6B35;">Welcome to CineFlow!</h2>
    <p>Hello {{username}},</p>
    <p>Welcome to CineFlow! We're excited to have you on board.</p>
    <p>Get started by creating your first project and bringing your stories to life.</p>
    <p style="text-align: center; margin: 30px 0;">
      <a href="{{appUrl}}" style="background-color: #FF6B35; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Get Started</a>
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">This is an automated message, please do not reply.</p>
  </div>
</body>
</html>`,
    body_text: `Hello {{username}},

Welcome to CineFlow! We're excited to have you on board.

Get started by creating your first project and bringing your stories to life.

Visit: {{appUrl}}

This is an automated message, please do not reply.`,
    variables: JSON.stringify(['username', 'appUrl']),
  },
  {
    template_key: 'password_changed',
    name: 'Password Changed',
    subject: 'Your Password Has Been Changed',
    body_html: `<html>
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
</html>`,
    body_text: `Hello {{username}},

Your password has been successfully changed.

If you did not make this change, please contact support immediately.

This is an automated message, please do not reply.`,
    variables: JSON.stringify(['username']),
  },
];

export async function up(): Promise<void> {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Insert templates (using ON DUPLICATE KEY UPDATE to avoid errors if already exists)
    for (const template of emailTemplates) {
      await connection.query(`
        INSERT INTO email_templates (template_key, name, subject, body_html, body_text, variables)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          subject = VALUES(subject),
          body_html = VALUES(body_html),
          body_text = VALUES(body_text),
          variables = VALUES(variables)
      `, [
        template.template_key,
        template.name,
        template.subject,
        template.body_html,
        template.body_text,
        template.variables,
      ]);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function down(): Promise<void> {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Delete templates
    for (const template of emailTemplates) {
      await connection.query(
        'DELETE FROM email_templates WHERE template_key = ?',
        [template.template_key]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

