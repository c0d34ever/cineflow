import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { StoryContext, Scene, DirectorSettings } from '../../types.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to convert database row to ProjectData
interface ProjectRow {
  id: string;
  user_id?: number | null;
  title: string;
  genre: string;
  plot_summary: string;
  characters: string;
  initial_context: string;
  last_updated: number;
}

interface SceneRow {
  id: string;
  project_id: string;
  sequence_number: number;
  raw_idea: string;
  enhanced_prompt: string;
  context_summary: string;
  status: string;
}

interface DirectorSettingsRow {
  custom_scene_id: string;
  lens: string;
  angle: string;
  lighting: string;
  movement: string;
  zoom: string;
  sound: string;
  dialogue: string;
  stunt_instructions: string;
  physics_focus: boolean;
  style: string;
  transition: string;
}

// GET /api/projects - Get all projects (user's own projects)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const pool = getPool();
    // Include projects with user_id matching current user OR projects with NULL user_id (legacy projects)
    // For NULL user_id projects, we'll assign them to the current user on first access
    const [projectsResult] = await pool.query(
      `SELECT * FROM projects 
       WHERE user_id = ? OR user_id IS NULL 
       ORDER BY last_updated DESC`,
      [userId]
    ) as [any[], any];
    
    const projects = Array.isArray(projectsResult) ? projectsResult : [];
    
    // Update any NULL user_id projects to belong to current user (one-time migration)
    const nullUserProjects = projects.filter((p: any) => !p.user_id);
    if (nullUserProjects.length > 0) {
      const projectIds = nullUserProjects.map((p: any) => p.id);
      if (projectIds.length > 0) {
        const placeholders = projectIds.map(() => '?').join(',');
        await pool.query(
          `UPDATE projects SET user_id = ? WHERE id IN (${placeholders})`,
          [userId, ...projectIds]
        );
      }
    }

    const projectsWithData = await Promise.all(
      projects.map(async (project: ProjectRow) => {
        const [scenes] = await pool.query(
          'SELECT * FROM scenes WHERE project_id = ? ORDER BY sequence_number ASC',
          [project.id]
        ) as [SceneRow[], any];

        const [settings] = await pool.query(
          'SELECT * FROM director_settings WHERE project_id = ?',
          [project.id]
        ) as [DirectorSettingsRow[], any];

        const storyContext: StoryContext = {
          id: project.id,
          title: project.title,
          genre: project.genre || '',
          plotSummary: project.plot_summary || '',
          characters: project.characters || '',
          initialContext: project.initial_context || '',
          lastUpdated: project.last_updated,
        };

        const scenesData: Scene[] = await Promise.all(
          scenes.map(async (scene) => {
            const [sceneSettings] = await pool.query(
              'SELECT * FROM scene_director_settings WHERE scene_id = ?',
              [scene.id]
            ) as [DirectorSettingsRow[], any];

            const directorSettings: DirectorSettings = sceneSettings[0]
              ? {
                  customSceneId: sceneSettings[0].custom_scene_id || '',
                  lens: sceneSettings[0].lens || '',
                  angle: sceneSettings[0].angle || '',
                  lighting: sceneSettings[0].lighting || '',
                  movement: sceneSettings[0].movement || '',
                  zoom: sceneSettings[0].zoom || '',
                  sound: sceneSettings[0].sound || '',
                  dialogue: sceneSettings[0].dialogue || '',
                  stuntInstructions: sceneSettings[0].stunt_instructions || '',
                  physicsFocus: sceneSettings[0].physics_focus || false,
                  style: sceneSettings[0].style as any || 'Cinematic',
                  transition: sceneSettings[0].transition || '',
                }
              : {
                  customSceneId: '',
                  lens: '',
                  angle: '',
                  lighting: '',
                  movement: '',
                  zoom: '',
                  sound: '',
                  dialogue: '',
                  stuntInstructions: '',
                  physicsFocus: false,
                  style: 'Cinematic' as any,
                  transition: '',
                };

            return {
              id: scene.id,
              sequenceNumber: scene.sequence_number,
              rawIdea: scene.raw_idea,
              enhancedPrompt: scene.enhanced_prompt,
              contextSummary: scene.context_summary || '',
              status: scene.status as any,
              directorSettings,
            };
          })
        );

        const directorSettings: DirectorSettings = settings[0]
          ? {
              customSceneId: settings[0].custom_scene_id || '',
              lens: settings[0].lens || '',
              angle: settings[0].angle || '',
              lighting: settings[0].lighting || '',
              movement: settings[0].movement || '',
              zoom: settings[0].zoom || '',
              sound: settings[0].sound || '',
              dialogue: settings[0].dialogue || '',
              stuntInstructions: settings[0].stunt_instructions || '',
              physicsFocus: settings[0].physics_focus || false,
              style: settings[0].style as any || 'Cinematic',
              transition: settings[0].transition || '',
            }
          : {
              customSceneId: '',
              lens: '35mm Prime',
              angle: 'Eye Level',
              lighting: 'Natural Cinematic',
              movement: 'Static',
              zoom: '',
              sound: 'Atmospheric ambient',
              dialogue: '',
              stuntInstructions: '',
              physicsFocus: true,
              style: 'Cinematic' as any,
              transition: 'Cut',
            };

        return {
          context: storyContext,
          scenes: scenesData,
          settings: directorSettings,
        };
      })
    );

    res.json(projectsWithData);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id - Get single project
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const pool = getPool();
    // Include projects with user_id matching OR NULL user_id (legacy)
    const [projectsResult] = await pool.query(
      'SELECT * FROM projects WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [req.params.id, userId]
    ) as [any[], any];

    const projects = Array.isArray(projectsResult) ? projectsResult : [];
    
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Update NULL user_id project to belong to current user
    const project = projects[0] as ProjectRow;
    if (!project.user_id) {
      await pool.query(
        'UPDATE projects SET user_id = ? WHERE id = ?',
        [userId, project.id]
      );
      project.user_id = userId;
    }
    const [scenes] = await pool.query(
      'SELECT * FROM scenes WHERE project_id = ? ORDER BY sequence_number ASC',
      [project.id]
    ) as [SceneRow[], any];

    const [settings] = await pool.query(
      'SELECT * FROM director_settings WHERE project_id = ?',
      [project.id]
    ) as [DirectorSettingsRow[], any];

    const storyContext: StoryContext = {
      id: project.id,
      title: project.title,
      genre: project.genre || '',
      plotSummary: project.plot_summary || '',
      characters: project.characters || '',
      initialContext: project.initial_context || '',
      lastUpdated: project.last_updated,
    };

    const scenesData: Scene[] = await Promise.all(
      scenes.map(async (scene) => {
        const [sceneSettings] = await pool.query(
          'SELECT * FROM scene_director_settings WHERE scene_id = ?',
          [scene.id]
        ) as [DirectorSettingsRow[], any];

        const directorSettings: DirectorSettings = sceneSettings[0]
          ? {
              customSceneId: sceneSettings[0].custom_scene_id || '',
              lens: sceneSettings[0].lens || '',
              angle: sceneSettings[0].angle || '',
              lighting: sceneSettings[0].lighting || '',
              movement: sceneSettings[0].movement || '',
              zoom: sceneSettings[0].zoom || '',
              sound: sceneSettings[0].sound || '',
              dialogue: sceneSettings[0].dialogue || '',
              stuntInstructions: sceneSettings[0].stunt_instructions || '',
              physicsFocus: sceneSettings[0].physics_focus || false,
              style: sceneSettings[0].style as any || 'Cinematic',
              transition: sceneSettings[0].transition || '',
            }
          : {
              customSceneId: '',
              lens: '',
              angle: '',
              lighting: '',
              movement: '',
              zoom: '',
              sound: '',
              dialogue: '',
              stuntInstructions: '',
              physicsFocus: false,
              style: 'Cinematic' as any,
              transition: '',
            };

        return {
          id: scene.id,
          sequenceNumber: scene.sequence_number,
          rawIdea: scene.raw_idea,
          enhancedPrompt: scene.enhanced_prompt,
          contextSummary: scene.context_summary || '',
          status: scene.status as any,
          directorSettings,
        };
      })
    );

    const directorSettings: DirectorSettings = settings[0]
      ? {
          customSceneId: settings[0].custom_scene_id || '',
          lens: settings[0].lens || '',
          angle: settings[0].angle || '',
          lighting: settings[0].lighting || '',
          movement: settings[0].movement || '',
          zoom: settings[0].zoom || '',
          sound: settings[0].sound || '',
          dialogue: settings[0].dialogue || '',
          stuntInstructions: settings[0].stunt_instructions || '',
          physicsFocus: settings[0].physics_focus || false,
          style: settings[0].style as any || 'Cinematic',
          transition: settings[0].transition || '',
        }
      : {
          customSceneId: '',
          lens: '35mm Prime',
          angle: 'Eye Level',
          lighting: 'Natural Cinematic',
          movement: 'Static',
          zoom: '',
          sound: 'Atmospheric ambient',
          dialogue: '',
          stuntInstructions: '',
          physicsFocus: true,
          style: 'Cinematic' as any,
          transition: 'Cut',
        };

    res.json({
      context: storyContext,
      scenes: scenesData,
      settings: directorSettings,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/projects - Create or update project
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { context, scenes, settings } = req.body;

    if (!context || !context.id) {
      return res.status(400).json({ error: 'Invalid project data' });
    }

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if project exists (belongs to user OR has NULL user_id)
      const [existingResult] = await connection.query(
        'SELECT id, user_id FROM projects WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
        [context.id, userId]
      ) as [any[], any];
      
      const existing = Array.isArray(existingResult) ? existingResult : [];
      
      // If project exists but has NULL user_id, update it
      if (existing.length > 0 && !existing[0].user_id) {
        await connection.query(
          'UPDATE projects SET user_id = ? WHERE id = ?',
          [userId, context.id]
        );
      }

      // Upsert project
      await connection.query(
        `INSERT INTO projects (id, user_id, title, genre, plot_summary, characters, initial_context, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           genre = VALUES(genre),
           plot_summary = VALUES(plot_summary),
           characters = VALUES(characters),
           initial_context = VALUES(initial_context),
           last_updated = VALUES(last_updated)`,
        [
          context.id,
          userId,
          context.title || '',
          context.genre || '',
          context.plotSummary || '',
          context.characters || '',
          context.initialContext || '',
          context.lastUpdated || Date.now(),
        ]
      );

      // Upsert director settings
      await connection.query(
        `INSERT INTO director_settings (
          project_id, custom_scene_id, lens, angle, lighting, movement, zoom,
          sound, dialogue, stunt_instructions, physics_focus, style, transition
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          custom_scene_id = VALUES(custom_scene_id),
          lens = VALUES(lens),
          angle = VALUES(angle),
          lighting = VALUES(lighting),
          movement = VALUES(movement),
          zoom = VALUES(zoom),
          sound = VALUES(sound),
          dialogue = VALUES(dialogue),
          stunt_instructions = VALUES(stunt_instructions),
          physics_focus = VALUES(physics_focus),
          style = VALUES(style),
          transition = VALUES(transition)`,
        [
          context.id,
          settings?.customSceneId || '',
          settings?.lens || '',
          settings?.angle || '',
          settings?.lighting || '',
          settings?.movement || '',
          settings?.zoom || '',
          settings?.sound || '',
          settings?.dialogue || '',
          settings?.stuntInstructions || '',
          settings?.physicsFocus || false,
          settings?.style || 'Cinematic',
          settings?.transition || '',
        ]
      );

      // Delete existing scenes and their settings
      await connection.query('DELETE FROM scene_director_settings WHERE scene_id IN (SELECT id FROM scenes WHERE project_id = ?)', [context.id]);
      await connection.query('DELETE FROM scenes WHERE project_id = ?', [context.id]);

      // Insert new scenes
      if (scenes && Array.isArray(scenes)) {
        for (const scene of scenes) {
          await connection.query(
            `INSERT INTO scenes (id, project_id, sequence_number, raw_idea, enhanced_prompt, context_summary, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              scene.id,
              context.id,
              scene.sequenceNumber,
              scene.rawIdea || '',
              scene.enhancedPrompt || '',
              scene.contextSummary || '',
              scene.status || 'completed',
            ]
          );

          // Insert scene director settings
          if (scene.directorSettings) {
            await connection.query(
              `INSERT INTO scene_director_settings (
                scene_id, custom_scene_id, lens, angle, lighting, movement, zoom,
                sound, dialogue, stunt_instructions, physics_focus, style, transition
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                scene.id,
                scene.directorSettings.customSceneId || '',
                scene.directorSettings.lens || '',
                scene.directorSettings.angle || '',
                scene.directorSettings.lighting || '',
                scene.directorSettings.movement || '',
                scene.directorSettings.zoom || '',
                scene.directorSettings.sound || '',
                scene.directorSettings.dialogue || '',
                scene.directorSettings.stuntInstructions || '',
                scene.directorSettings.physicsFocus || false,
                scene.directorSettings.style || 'Cinematic',
                scene.directorSettings.transition || '',
              ]
            );
          }
        }
      }

      await connection.commit();
      res.json({ success: true, id: context.id });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Error saving project:', error);
    const errorMessage = error?.message || 'Failed to save project';
    const statusCode = error?.statusCode || 500;
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
});

// POST /api/projects/:id/duplicate - Duplicate project
router.post('/:id/duplicate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;
    const { includeScenes = true, includeMedia = false, newTitle } = req.body;
    const pool = getPool();

    // Get original project
    const [projectsResult] = await pool.query(
      'SELECT * FROM projects WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [projectId, userId]
    ) as [any[], any];

    const projects = Array.isArray(projectsResult) ? projectsResult : [];
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const originalProject = projects[0];
    const newProjectId = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Create new project
      await connection.query(
        `INSERT INTO projects (id, user_id, title, genre, plot_summary, characters, initial_context, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newProjectId,
          userId,
          newTitle || `${originalProject.title} (Copy)`,
          originalProject.genre || '',
          originalProject.plot_summary || '',
          originalProject.characters || '',
          originalProject.initial_context || '',
          Date.now()
        ]
      );

      // Copy director settings
      const [settings] = await connection.query(
        'SELECT * FROM director_settings WHERE project_id = ?',
        [projectId]
      ) as [any[], any];
      
      if (settings.length > 0) {
        const setting = settings[0];
        await connection.query(
          `INSERT INTO director_settings (project_id, lens, angle, lighting, movement, zoom, sound, style, transition)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newProjectId,
            setting.lens,
            setting.angle,
            setting.lighting,
            setting.movement,
            setting.zoom,
            setting.sound,
            setting.style,
            setting.transition
          ]
        );
      }

      // Copy scenes if requested
      if (includeScenes) {
        const [scenes] = await connection.query(
          'SELECT * FROM scenes WHERE project_id = ? ORDER BY sequence_number ASC',
          [projectId]
        ) as [any[], any];

        for (const scene of scenes) {
          const newSceneId = `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await connection.query(
            `INSERT INTO scenes (id, project_id, sequence_number, raw_idea, enhanced_prompt, context_summary, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              newSceneId,
              newProjectId,
              scene.sequence_number,
              scene.raw_idea,
              scene.enhanced_prompt,
              scene.context_summary,
              scene.status || 'completed'
            ]
          );

          // Copy scene director settings
          const [sceneSettings] = await connection.query(
            'SELECT * FROM scene_director_settings WHERE scene_id = ?',
            [scene.id]
          ) as [any[], any];

          if (sceneSettings.length > 0) {
            const ss = sceneSettings[0];
            await connection.query(
              `INSERT INTO scene_director_settings 
               (scene_id, custom_scene_id, lens, angle, lighting, movement, zoom, sound, dialogue, 
                stunt_instructions, physics_focus, style, transition)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                newSceneId,
                ss.custom_scene_id,
                ss.lens,
                ss.angle,
                ss.lighting,
                ss.movement,
                ss.zoom,
                ss.sound,
                ss.dialogue,
                ss.stunt_instructions,
                ss.physics_focus,
                ss.style,
                ss.transition
              ]
            );
          }
        }
      }

      await connection.commit();
      res.json({ id: newProjectId, message: 'Project duplicated successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Error duplicating project:', error);
    res.status(500).json({ error: error.message || 'Failed to duplicate project' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    ) as [any, any];

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;

