import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { StoryContext, Scene, DirectorSettings } from '../../types.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to convert database row to ProjectData
interface ProjectRow {
  id: string;
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
    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY last_updated DESC',
      [userId]
    ) as [ProjectRow[], any];

    const projectsWithData = await Promise.all(
      projects.map(async (project) => {
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
    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [req.params.id, userId]
    ) as [ProjectRow[], any];

    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projects[0];
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

      // Check if project exists and belongs to user
      const [existing] = await connection.query(
        'SELECT id FROM projects WHERE id = ? AND user_id = ?',
        [context.id, userId]
      ) as [any[], any];

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
  } catch (error) {
    console.error('Error saving project:', error);
    res.status(500).json({ error: 'Failed to save project' });
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

