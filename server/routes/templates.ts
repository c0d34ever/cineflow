import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/templates - Get all templates (system + user's)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const pool = getPool();

    const [templates] = await pool.query(
      `SELECT * FROM project_templates 
       WHERE is_system_template = TRUE OR created_by_user_id = ?
       ORDER BY is_system_template DESC, name ASC`,
      [userId]
    );

    res.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /api/templates - Create template from current project
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, genre, plot_summary, characters, initial_context, director_settings } = req.body;
    const userId = req.user!.id;

    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    const pool = getPool();

    const [result] = await pool.query(
      `INSERT INTO project_templates 
       (name, description, genre, plot_summary, characters, initial_context, director_settings, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || null,
        genre || null,
        plot_summary || null,
        characters || null,
        initial_context || null,
        director_settings ? JSON.stringify(director_settings) : null,
        userId
      ]
    );

    const insertResult = result as any;
    res.status(201).json({ id: insertResult.insertId, message: 'Template created successfully' });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// GET /api/templates/:id - Get single template
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);
    const userId = req.user?.id;
    const pool = getPool();

    const [templates] = await pool.query(
      `SELECT * FROM project_templates 
       WHERE id = ? AND (is_system_template = TRUE OR created_by_user_id = ?)`,
      [templateId, userId]
    );

    if (!Array.isArray(templates) || templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templates[0] as any;
    if (template.director_settings) {
      template.director_settings = JSON.parse(template.director_settings);
    }

    res.json({ template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST /api/templates/:id/create-project - Create project from template
router.post('/:id/create-project', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);
    const userId = req.user!.id;
    const pool = getPool();

    // Get template
    const [templates] = await pool.query(
      `SELECT * FROM project_templates 
       WHERE id = ? AND (is_system_template = TRUE OR created_by_user_id = ?)`,
      [templateId, userId]
    );

    if (!Array.isArray(templates) || templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templates[0] as any;
    const directorSettings = template.director_settings 
      ? (typeof template.director_settings === 'string' ? JSON.parse(template.director_settings) : template.director_settings)
      : null;

    // Create new project from template
    const projectId = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    await pool.query(
      `INSERT INTO projects (id, user_id, title, genre, plot_summary, characters, initial_context, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        userId,
        `${template.name} (Copy)`,
        template.genre || '',
        template.plot_summary || '',
        template.characters || '',
        template.initial_context || '',
        now,
      ]
    );

    // Create default director settings if template has them
    if (directorSettings) {
      await pool.query(
        `INSERT INTO director_settings (project_id, custom_scene_id, lens, angle, lighting, movement, zoom, sound, dialogue, stunt_instructions, physics_focus, style, transition)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          directorSettings.customSceneId || '',
          directorSettings.lens || '',
          directorSettings.angle || '',
          directorSettings.lighting || '',
          directorSettings.movement || '',
          directorSettings.zoom || '',
          directorSettings.sound || '',
          directorSettings.dialogue || '',
          directorSettings.stuntInstructions || '',
          directorSettings.physicsFocus || false,
          directorSettings.style || 'Cinematic',
          directorSettings.transition || '',
        ]
      );
    }

    res.json({ 
      id: projectId,
      message: 'Project created from template successfully' 
    });
  } catch (error) {
    console.error('Error creating project from template:', error);
    res.status(500).json({ error: 'Failed to create project from template' });
  }
});

// DELETE /api/templates/:id - Delete user's template
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);
    const userId = req.user!.id;
    const pool = getPool();

    // Only allow deleting user's own templates (not system templates)
    const [result] = await pool.query(
      'DELETE FROM project_templates WHERE id = ? AND created_by_user_id = ? AND is_system_template = FALSE',
      [templateId, userId]
    );

    const deleteResult = result as any;
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Template not found or cannot be deleted' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;

