import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { StoryContext, Scene, DirectorSettings } from '../../types.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import { generateCharacterComposite } from '../services/characterCompositeService.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { uploadToImageKit, isImageKitAvailable } from '../services/imagekitService.js';
import sharp from 'sharp';
import { sseService } from '../services/sseService.js';

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
  cover_image_id?: string | null;
  cover_image_url?: string | null;
  cover_imagekit_url?: string | null;
}

interface SceneRow {
  id: string;
  project_id: string;
  sequence_number: number;
  raw_idea: string;
  enhanced_prompt: string;
  context_summary: string;
  status: string;
  thumbnail_url?: string | null;
  is_ai_generated?: boolean | null;
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
    // Explicitly select cover_image columns (they might not exist if migration hasn't run)
    const [projectsResult] = await pool.query(
      `SELECT id, user_id, title, genre, content_type, plot_summary, characters, initial_context, last_updated,
              COALESCE(cover_image_id, NULL) as cover_image_id,
              COALESCE(cover_image_url, NULL) as cover_image_url,
              COALESCE(cover_imagekit_url, NULL) as cover_imagekit_url
       FROM projects 
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

        // Get cover image (user-uploaded or generate character composite)
        let coverImageUrl: string | null = null;
        let coverImagekitUrl: string | null = null;
        
        try {
          if (project.cover_imagekit_url) {
            coverImagekitUrl = project.cover_imagekit_url;
            console.log(`[Project ${project.id}] Using ImageKit cover: ${coverImagekitUrl}`);
          } else if (project.cover_image_url) {
            coverImageUrl = project.cover_image_url;
            console.log(`[Project ${project.id}] Using local cover: ${coverImageUrl}`);
          } else {
            // Generate character composite if no cover exists
            console.log(`[Project ${project.id}] No cover found, generating character composite...`);
            const composite = await generateCharacterComposite(project.id);
            if (composite) {
              coverImagekitUrl = composite.imagekitUrl || undefined;
              coverImageUrl = composite.localPath;
              console.log(`[Project ${project.id}] Generated cover: ${coverImageUrl} (ImageKit: ${coverImagekitUrl || 'none'})`);
              // Save generated cover to database
              await pool.query(
                `UPDATE projects 
                 SET cover_image_url = ?, cover_imagekit_url = ?
                 WHERE id = ?`,
                [composite.localPath, composite.imagekitUrl || null, project.id]
              );
            } else {
              console.log(`[Project ${project.id}] No characters with images found, no cover generated`);
            }
          }
        } catch (error: any) {
          console.error(`[Project ${project.id}] Error getting cover image:`, error.message);
          // Continue without cover image
        }

        const storyContext: StoryContext = {
          id: project.id,
          title: project.title,
          genre: project.genre || '',
          plotSummary: project.plot_summary || '',
          characters: project.characters || '',
          initialContext: project.initial_context || '',
          lastUpdated: project.last_updated,
          coverImageUrl: coverImagekitUrl || coverImageUrl || undefined,
          contentType: (project as any).content_type || undefined,
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
              thumbnailUrl: scene.thumbnail_url || undefined,
              is_ai_generated: scene.is_ai_generated || false,
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
  const projectId = req.params.id;
  console.error(`[GET /api/projects/:id] ===== REQUEST RECEIVED =====`);
  console.error(`[GET /api/projects/:id] Project ID: ${projectId}`);
  console.error(`[GET /api/projects/:id] User ID: ${req.user!.id}`);
  try {
    const userId = req.user!.id;
    const pool = getPool();
    // Include projects with user_id matching OR NULL user_id (legacy)
    // Explicitly select cover_image columns (they might not exist if migration hasn't run)
    const [projectsResult] = await pool.query(
      `SELECT id, user_id, title, genre, content_type, plot_summary, characters, initial_context, last_updated,
              COALESCE(cover_image_id, NULL) as cover_image_id,
              COALESCE(cover_image_url, NULL) as cover_image_url,
              COALESCE(cover_imagekit_url, NULL) as cover_imagekit_url
       FROM projects 
       WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
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

    console.error(`[GET /api/projects/:id] Project ${project.id} (type: ${typeof project.id}): Found ${scenes.length} scenes in database`);
    
    // Debug: Check if scenes exist with different project_id format
    if (scenes.length === 0) {
      // Check total scenes count
      const [totalScenes] = await pool.query('SELECT COUNT(*) as count FROM scenes') as [any[], any];
      console.log(`[GET /api/projects/:id] Total scenes in database: ${totalScenes[0]?.count || 0}`);
      
      // Check for scenes with this specific project_id (case-insensitive, trimmed)
      const [matchingScenes] = await pool.query(
        'SELECT id, project_id, sequence_number FROM scenes WHERE TRIM(project_id) = TRIM(?) OR project_id = ?',
        [project.id, project.id]
      ) as [any[], any];
      console.log(`[GET /api/projects/:id] Scenes matching project_id (trimmed): ${matchingScenes.length}`);
      
      // Get sample scenes to see project_id format
      const [allScenes] = await pool.query(
        'SELECT id, project_id, sequence_number FROM scenes LIMIT 20'
      ) as [any[], any];
      console.log(`[GET /api/projects/:id] Sample scenes in database:`, allScenes.map(s => ({ 
        scene_id: s.id, 
        project_id: s.project_id, 
        project_id_type: typeof s.project_id,
        matches: String(s.project_id).trim() === String(project.id).trim(),
        sequence: s.sequence_number
      })));
      
      // Check if there are any scenes for this project using LIKE (in case of partial match)
      const [likeScenes] = await pool.query(
        'SELECT id, project_id FROM scenes WHERE project_id LIKE ? LIMIT 5',
        [`%${project.id}%`]
      ) as [any[], any];
      if (likeScenes.length > 0) {
        console.log(`[GET /api/projects/:id] Found ${likeScenes.length} scenes with LIKE match:`, likeScenes);
      }
    }

    const [settings] = await pool.query(
      'SELECT * FROM director_settings WHERE project_id = ?',
      [project.id]
    ) as [DirectorSettingsRow[], any];

    // Get cover image (user-uploaded or generate character composite)
    let coverImageUrl: string | null = null;
    let coverImagekitUrl: string | null = null;
    
    try {
      if (project.cover_imagekit_url) {
        coverImagekitUrl = project.cover_imagekit_url;
      } else if (project.cover_image_url) {
        coverImageUrl = project.cover_image_url;
      } else {
        // Generate character composite if no cover exists
        const composite = await generateCharacterComposite(project.id);
        if (composite) {
          coverImagekitUrl = composite.imagekitUrl || undefined;
          coverImageUrl = composite.localPath;
          // Save generated cover to database
          await pool.query(
            `UPDATE projects 
             SET cover_image_url = ?, cover_imagekit_url = ?
             WHERE id = ?`,
            [composite.localPath, composite.imagekitUrl || null, project.id]
          );
        }
      }
    } catch (error: any) {
      console.error(`[Project ${project.id}] Error getting cover image:`, error.message);
    }

    const storyContext: StoryContext = {
      id: project.id,
      title: project.title,
      genre: project.genre || '',
      plotSummary: project.plot_summary || '',
      characters: project.characters || '',
      initialContext: project.initial_context || '',
      lastUpdated: project.last_updated,
          coverImageUrl: coverImagekitUrl || coverImageUrl || undefined,
          contentType: (project as any).content_type || undefined,
        };

    console.log(`[GET /api/projects/:id] Processing ${scenes.length} scenes for project ${project.id}`);
    
    // If no scenes found, log a warning
    if (scenes.length === 0) {
      console.warn(`[GET /api/projects/:id] WARNING: No scenes found for project ${project.id}. This might indicate scenes were never saved or were deleted.`);
    }

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
          thumbnailUrl: scene.thumbnail_url || undefined,
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

    console.error(`[GET /api/projects/:id] Returning project ${project.id} with ${scenesData.length} scenes`);
    
    if (scenesData.length === 0) {
      console.error(`[GET /api/projects/:id] WARNING: Returning empty scenes array for project ${project.id}`);
    }

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
  console.error(`[POST /api/projects] ===== SAVE REQUEST =====`);
  console.error(`[POST /api/projects] Project ID: ${req.body?.context?.id}`);
  console.error(`[POST /api/projects] Scenes count: ${req.body?.scenes?.length || 0}`);
  if (req.body?.scenes && Array.isArray(req.body.scenes) && req.body.scenes.length > 0) {
    console.error(`[POST /api/projects] First scene ID: ${req.body.scenes[0]?.id}`);
  }

  const connectionId = (req.body.sseConnectionId || req.headers['x-sse-connection-id']) as string | undefined;
  const useSSE = !!connectionId && sseService.hasConnection(connectionId);

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

      // Upsert project (preserve cover_image fields if they exist)
      await connection.query(
        `INSERT INTO projects (id, user_id, title, genre, content_type, plot_summary, characters, initial_context, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           genre = VALUES(genre),
           content_type = VALUES(content_type),
           plot_summary = VALUES(plot_summary),
           characters = VALUES(characters),
           initial_context = VALUES(initial_context),
           last_updated = VALUES(last_updated),
           cover_image_id = COALESCE(cover_image_id, NULL),
           cover_image_url = COALESCE(cover_image_url, NULL),
           cover_imagekit_url = COALESCE(cover_imagekit_url, NULL)`,
        [
          context.id,
          userId,
          context.title || '',
          context.genre || '',
          context.contentType || 'film',
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

      // Get existing scene IDs to preserve media associations
      const [existingScenes] = await connection.query(
        'SELECT id FROM scenes WHERE project_id = ?',
        [context.id]
      ) as [Array<{ id: string }>, any];
      const existingSceneIds = new Set(existingScenes.map(s => s.id));
      const incomingSceneIds = new Set((scenes || []).map((s: any) => s.id));

      // Delete scenes that are no longer in the incoming list (but preserve their media)
      const scenesToDelete = Array.from(existingSceneIds).filter(id => !incomingSceneIds.has(id));
      if (scenesToDelete.length > 0) {
        await connection.query('DELETE FROM scene_director_settings WHERE scene_id IN (?)', [scenesToDelete]);
        await connection.query('DELETE FROM scenes WHERE id IN (?)', [scenesToDelete]);
        console.log(`Deleted ${scenesToDelete.length} scenes that were removed from project`);
      }

      // Update or insert scenes (preserving existing scenes to keep media associations)
      console.error(`[POST /api/projects] Saving ${scenes?.length || 0} scenes for project ${context.id}`);
      if (scenes && Array.isArray(scenes) && scenes.length > 0) {
        if (useSSE) {
          sseService.sendProgress(connectionId!, 0, 'Starting to save scenes...', { total: scenes.length, saved: 0 });
        }
        // Batch fetch thumbnails for all scenes at once (much faster)
        const sceneIds = scenes.map(s => s.id);
        let thumbnailMap: Record<string, string | null> = {};
        try {
          const [allThumbnails] = await connection.query(
            'SELECT scene_id, thumbnail_path FROM media WHERE scene_id IN (?) AND is_primary = 1',
            [sceneIds]
          ) as [any[], any];
          thumbnailMap = (allThumbnails || []).reduce((acc: Record<string, string | null>, media: any) => {
            if (media.scene_id && media.thumbnail_path) {
              acc[media.scene_id] = media.thumbnail_path;
            }
            return acc;
          }, {});
        } catch (error) {
          console.warn('Could not batch fetch thumbnails:', error);
        }

        // Process scenes in batches to avoid timeout
        const batchSize = 50;
        const totalBatches = Math.ceil(scenes.length / batchSize);
        for (let i = 0; i < scenes.length; i += batchSize) {
          const batch = scenes.slice(i, i + batchSize);
          const currentBatch = Math.floor(i / batchSize) + 1;
          console.error(`[POST /api/projects] Processing scenes batch ${currentBatch}/${totalBatches} (${batch.length} scenes)`);
          
          if (useSSE) {
            const progress = Math.floor((i / scenes.length) * 100);
            sseService.sendProgress(connectionId!, progress, `Saving batch ${currentBatch}/${totalBatches}...`, { 
              total: scenes.length, 
              saved: i,
              currentBatch,
              totalBatches
            });
          }
          
          // Use Promise.all to process batch in parallel
          await Promise.all(batch.map(async (scene) => {
            const thumbnailUrl = scene.thumbnailUrl || thumbnailMap[scene.id] || null;

            // Insert or update scene
            await connection.query(
              `INSERT INTO scenes (id, project_id, sequence_number, raw_idea, enhanced_prompt, context_summary, status, thumbnail_url, is_ai_generated)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 sequence_number = VALUES(sequence_number),
                 raw_idea = VALUES(raw_idea),
                 enhanced_prompt = VALUES(enhanced_prompt),
                 context_summary = VALUES(context_summary),
                 status = VALUES(status),
                 thumbnail_url = COALESCE(VALUES(thumbnail_url), thumbnail_url),
                 is_ai_generated = VALUES(is_ai_generated)`,
              [
                scene.id,
                context.id,
                scene.sequenceNumber,
                scene.rawIdea || '',
                scene.enhancedPrompt || '',
                scene.contextSummary || '',
                scene.status || 'completed',
                thumbnailUrl,
                scene.is_ai_generated || false,
              ]
            );

            // Insert or update scene director settings
            if (scene.directorSettings) {
              await connection.query(
                `INSERT INTO scene_director_settings (
                  scene_id, custom_scene_id, lens, angle, lighting, movement, zoom,
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
          }));
        }
        console.error(`[POST /api/projects] Successfully saved ${scenes.length} scenes for project ${context.id}`);
        
        if (useSSE) {
          sseService.sendProgress(connectionId!, 100, 'All scenes saved successfully!', { 
            total: scenes.length, 
            saved: scenes.length 
          });
        }
      }

      await connection.commit();
      
      if (useSSE) {
        sseService.sendComplete(connectionId!, { 
          success: true, 
          id: context.id,
          message: 'Project saved successfully'
        });
        // Don't send regular response when using SSE
        return;
      }
      
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
    
    const connectionId = (req.body?.sseConnectionId || req.headers['x-sse-connection-id']) as string | undefined;
    if (connectionId && sseService.hasConnection(connectionId)) {
      sseService.sendError(connectionId, errorMessage, { 
        statusCode,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      });
      return;
    }
    
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
        `INSERT INTO projects (id, user_id, title, genre, content_type, plot_summary, characters, initial_context, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newProjectId,
          userId,
          newTitle || `${originalProject.title} (Copy)`,
          originalProject.genre || '',
          (originalProject as any).content_type || 'film',
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
            `INSERT INTO scenes (id, project_id, sequence_number, raw_idea, enhanced_prompt, context_summary, status, thumbnail_url, is_ai_generated)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newSceneId,
              newProjectId,
              scene.sequence_number,
              scene.raw_idea,
              scene.enhanced_prompt,
              scene.context_summary,
              scene.status || 'completed',
              scene.thumbnail_url || null,
              scene.is_ai_generated || false
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

// GET /api/projects/:id/versions - Get all versions for a project
router.get('/:id/versions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;
    const pool = getPool();

    // Verify project belongs to user
    const [projects] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [projectId, userId]
    ) as [any[], any];

    if (!Array.isArray(projects) || projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [versions] = await pool.query(
      'SELECT * FROM project_versions WHERE project_id = ? ORDER BY version_number DESC LIMIT 10',
      [projectId]
    ) as [any[], any];

    // Parse JSON fields
    const parsedVersions = (versions || []).map((v: any) => ({
      id: v.id,
      project_id: v.project_id,
      version_number: v.version_number,
      context: typeof v.context === 'string' ? JSON.parse(v.context) : v.context,
      scenes: typeof v.scenes === 'string' ? JSON.parse(v.scenes) : v.scenes,
      settings: typeof v.settings === 'string' ? JSON.parse(v.settings) : v.settings,
      note: v.note,
      created_at: v.created_at,
    }));

    res.json({ versions: parsedVersions });
  } catch (error: any) {
    console.error('Error fetching versions:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// POST /api/projects/:id/versions - Save a new version
router.post('/:id/versions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;
    const { context, scenes, settings, note } = req.body;
    const pool = getPool();

    // Verify project belongs to user
    const [projects] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [projectId, userId]
    ) as [any[], any];

    if (!Array.isArray(projects) || projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get next version number
    const [versionCount] = await pool.query(
      'SELECT COUNT(*) as count FROM project_versions WHERE project_id = ?',
      [projectId]
    ) as [Array<{ count: number }>, any];

    const versionNumber = (versionCount[0]?.count || 0) + 1;
    const versionId = `v_${projectId}_${Date.now()}`;

    // Insert version
    await pool.query(
      `INSERT INTO project_versions (id, project_id, version_number, context, scenes, settings, note, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        versionId,
        projectId,
        versionNumber,
        JSON.stringify(context),
        JSON.stringify(scenes || []),
        JSON.stringify(settings || {}),
        note || null,
        userId,
      ]
    );

    // Keep only last 10 versions
    await pool.query(
      `DELETE FROM project_versions 
       WHERE project_id = ? AND version_number NOT IN (
         SELECT version_number FROM (
           SELECT version_number FROM project_versions 
           WHERE project_id = ? 
           ORDER BY version_number DESC LIMIT 10
         ) AS keep_versions
       )`,
      [projectId, projectId]
    );

    res.json({ success: true, version_id: versionId, version_number: versionNumber });
  } catch (error: any) {
    console.error('Error saving version:', error);
    res.status(500).json({ error: 'Failed to save version' });
  }
});

// DELETE /api/projects/:id/versions/:versionId - Delete a version
router.delete('/:id/versions/:versionId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;
    const versionId = req.params.versionId;
    const pool = getPool();

    // Verify project belongs to user
    const [projects] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [projectId, userId]
    ) as [any[], any];

    if (!Array.isArray(projects) || projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await pool.query(
      'DELETE FROM project_versions WHERE id = ? AND project_id = ?',
      [versionId, projectId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting version:', error);
    res.status(500).json({ error: 'Failed to delete version' });
  }
});

// Configure multer for cover image upload
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `cover-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// POST /api/projects/:id/cover-image - Set project cover image
router.post('/:id/cover-image', authenticateToken, upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;
    const pool = getPool();

    // Verify project belongs to user
    const [projects] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [projectId, userId]
    ) as [any[], any];

    if (!Array.isArray(projects) || projects.length === 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    // Upload to ImageKit if available
    let imagekitUrl: string | null = null;
    let imagekitThumbnailUrl: string | null = null;

    if (isImageKitAvailable()) {
      try {
        const result = await uploadToImageKit(req.file.path, req.file.originalname, `/cineflow/projects/${projectId}/covers`);
        if (result) {
          imagekitUrl = result.url;
          imagekitThumbnailUrl = result.thumbnailUrl || null;
        }
      } catch (error: any) {
        console.warn('ImageKit upload failed:', error.message);
      }
    }

    // Update project with cover image
    const filePath = `/uploads/${req.file.filename}`;
    await pool.query(
      `UPDATE projects 
       SET cover_image_url = ?, cover_imagekit_url = ?, cover_image_id = NULL
       WHERE id = ?`,
      [filePath, imagekitUrl, projectId]
    );

    res.json({
      success: true,
      cover_image_url: filePath,
      cover_imagekit_url: imagekitUrl,
      cover_imagekit_thumbnail_url: imagekitThumbnailUrl,
    });
  } catch (error: any) {
    console.error('Error setting cover image:', error);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    res.status(500).json({ error: 'Failed to set cover image' });
  }
});

// POST /api/projects/:id/generate-cover - Generate character composite cover (with SSE support)
router.post('/:id/generate-cover', authenticateToken, async (req: AuthRequest, res: Response) => {
  const connectionId = (req.body.sseConnectionId || req.headers['x-sse-connection-id']) as string | undefined;
  const useSSE = !!connectionId && sseService.hasConnection(connectionId);
  
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;
    const pool = getPool();

    // Verify project belongs to user
    const [projects] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [projectId, userId]
    ) as [any[], any];

    if (!Array.isArray(projects) || projects.length === 0) {
      if (useSSE) {
        sseService.sendError(connectionId!, 'Project not found');
        return;
      }
      return res.status(404).json({ error: 'Project not found' });
    }

    if (useSSE) {
      sseService.sendProgress(connectionId!, 10, 'Loading characters...');
    }
    
    // Generate character composite
    if (useSSE) {
      sseService.sendProgress(connectionId!, 30, 'Generating composite image...');
    }
    
    const result = await generateCharacterComposite(projectId);
    
    if (!result) {
      if (useSSE) {
        sseService.sendError(connectionId!, 'No characters with images found in this project');
        return;
      }
      return res.status(400).json({ error: 'No characters with images found in this project' });
    }

    if (useSSE) {
      sseService.sendProgress(connectionId!, 70, 'Uploading to ImageKit...');
    }

    // Update project with generated cover
    await pool.query(
      `UPDATE projects 
       SET cover_image_url = ?, cover_imagekit_url = ?, cover_image_id = NULL
       WHERE id = ?`,
      [result.localPath, result.imagekitUrl || null, projectId]
    );

    if (useSSE) {
      sseService.sendProgress(connectionId!, 100, 'Cover generated successfully!');
      sseService.sendComplete(connectionId!, {
        success: true,
        cover_image_url: result.localPath,
        cover_imagekit_url: result.imagekitUrl,
        cover_imagekit_thumbnail_url: result.imagekitThumbnailUrl,
      });
      return;
    }

    res.json({
      success: true,
      cover_image_url: result.localPath,
      cover_imagekit_url: result.imagekitUrl,
      cover_imagekit_thumbnail_url: result.imagekitThumbnailUrl,
    });
  } catch (error: any) {
    console.error('Error generating cover:', error);
    const errorMsg = error.message || 'Failed to generate cover image';
    
    if (useSSE) {
      sseService.sendError(connectionId!, errorMsg);
      return;
    }
    
    res.status(500).json({ error: errorMsg });
  }
});

// POST /api/projects/batch-generate-covers - Batch generate covers for multiple projects (with SSE support)
router.post('/batch-generate-covers', authenticateToken, async (req: AuthRequest, res: Response) => {
  const connectionId = (req.body.sseConnectionId || req.headers['x-sse-connection-id']) as string | undefined;
  const useSSE = !!connectionId && sseService.hasConnection(connectionId);
  
  try {
    const userId = req.user!.id;
    const { project_ids } = req.body;
    
    if (!Array.isArray(project_ids) || project_ids.length === 0) {
      if (useSSE) {
        sseService.sendError(connectionId!, 'project_ids array is required');
        return;
      }
      return res.status(400).json({ error: 'project_ids array is required' });
    }

    const pool = getPool();
    const total = project_ids.length;
    let successCount = 0;
    let failCount = 0;
    const results: any[] = [];

    for (let i = 0; i < project_ids.length; i++) {
      const projectId = project_ids[i];
      const progress = Math.floor((i / total) * 90); // 0-90% for generation
      
      if (useSSE) {
        sseService.sendProgress(connectionId!, progress, `Generating cover ${i + 1}/${total}...`, {
          current: i + 1,
          total,
          projectId
        });
      }

      try {
        // Verify project belongs to user
        const [projects] = await pool.query(
          'SELECT id FROM projects WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
          [projectId, userId]
        ) as [any[], any];

        if (Array.isArray(projects) && projects.length > 0) {
          const result = await generateCharacterComposite(projectId);
          
          if (result) {
            await pool.query(
              `UPDATE projects 
               SET cover_image_url = ?, cover_imagekit_url = ?, cover_image_id = NULL
               WHERE id = ?`,
              [result.localPath, result.imagekitUrl || null, projectId]
            );
            successCount++;
            results.push({ projectId, success: true, ...result });
          } else {
            failCount++;
            results.push({ projectId, success: false, error: 'No characters with images found' });
          }
        } else {
          failCount++;
          results.push({ projectId, success: false, error: 'Project not found' });
        }
      } catch (error: any) {
        failCount++;
        results.push({ projectId, success: false, error: error.message || 'Failed to generate cover' });
      }
    }

    if (useSSE) {
      sseService.sendProgress(connectionId!, 100, `Generated ${successCount} cover(s), ${failCount} failed`);
      sseService.sendComplete(connectionId!, {
        successCount,
        failCount,
        total,
        results
      });
      return;
    }

    res.json({
      successCount,
      failCount,
      total,
      results
    });
  } catch (error: any) {
    console.error('Error in batch cover generation:', error);
    const errorMsg = error.message || 'Failed to generate covers';
    
    if (useSSE) {
      sseService.sendError(connectionId!, errorMsg);
      return;
    }
    
    res.status(500).json({ error: errorMsg });
  }
});

// DELETE /api/projects/:id/cover-image - Remove cover image (use auto-generated)
router.delete('/:id/cover-image', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;
    const pool = getPool();

    // Verify project belongs to user
    const [projects] = await pool.query(
      'SELECT id, cover_image_url FROM projects WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [projectId, userId]
    ) as [any[], any];

    if (!Array.isArray(projects) || projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Delete local file if exists
    const project = projects[0];
    if (project.cover_image_url) {
      try {
        const filePath = path.join(__dirname, '../../', project.cover_image_url.substring(1));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        // Ignore file deletion errors
      }
    }

    // Clear cover image (will use auto-generated character composite)
    await pool.query(
      `UPDATE projects 
       SET cover_image_url = NULL, cover_imagekit_url = NULL, cover_image_id = NULL
       WHERE id = ?`,
      [projectId]
    );

    res.json({ success: true, message: 'Cover image removed. Will use auto-generated character composite.' });
  } catch (error: any) {
    console.error('Error removing cover image:', error);
    res.status(500).json({ error: 'Failed to remove cover image' });
  }
});

export default router;

