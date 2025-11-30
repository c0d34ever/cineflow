import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import { emailService } from '../services/emailService.js';

const router = express.Router();

// GET /api/emails/templates - Get all email templates (admin only)
router.get('/templates', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    
    // Only admins can view templates
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const pool = getPool();
    const [templates] = await pool.query(
      'SELECT id, template_key, name, subject, variables, is_active, created_at, updated_at FROM email_templates ORDER BY name'
    ) as [any[], any];

    res.json({ templates: Array.isArray(templates) ? templates : [] });
  } catch (error: any) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

// GET /api/emails/templates/:key - Get specific template
router.get('/templates/:key', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { key } = req.params;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const template = await emailService.getTemplate(key);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template });
  } catch (error: any) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ error: 'Failed to fetch email template' });
  }
});

// PUT /api/emails/templates/:key - Update email template (admin only)
router.put('/templates/:key', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { key } = req.params;
    const { name, subject, body_html, body_text, variables, is_active } = req.body;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const pool = getPool();
    
    // Check if template exists
    const [existing] = await pool.query(
      'SELECT id FROM email_templates WHERE template_key = ?',
      [key]
    ) as [any[], any];

    if (!Array.isArray(existing) || existing.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Update template
    await pool.query(
      `UPDATE email_templates 
       SET name = ?, subject = ?, body_html = ?, body_text = ?, variables = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE template_key = ?`,
      [
        name,
        subject,
        body_html,
        body_text || null,
        variables ? JSON.stringify(variables) : null,
        is_active !== undefined ? is_active : true,
        key
      ]
    );

    res.json({ message: 'Template updated successfully' });
  } catch (error: any) {
    console.error('Error updating email template:', error);
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

// POST /api/emails/test - Send test email (admin only)
router.post('/test', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { to, template_key, variables } = req.body;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!to || !template_key) {
      return res.status(400).json({ error: 'to and template_key are required' });
    }

    const success = await emailService.sendTemplateEmail(template_key, to, variables || {});

    if (success) {
      res.json({ message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send test email' });
    }
  } catch (error: any) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// POST /api/emails/verify - Verify SMTP connection (admin only)
router.post('/verify', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const verified = await emailService.verifyConnection();

    if (verified) {
      res.json({ message: 'SMTP connection verified successfully' });
    } else {
      res.status(500).json({ error: 'SMTP connection failed' });
    }
  } catch (error: any) {
    console.error('Error verifying SMTP:', error);
    res.status(500).json({ error: 'Failed to verify SMTP connection' });
  }
});

export default router;

