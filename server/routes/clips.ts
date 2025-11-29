import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import { DirectorSettings } from '../../types.js';

const router = express.Router();

// GET /api/clips/episode/:episodeId - Get all clips for an episode
router.get('/episode/:episodeId', async (req: express.Request, res: Response) => {
  try {
    const episodeId = req.params.episodeId;
    const pool = getPool();

    const [clips] = await pool.query(
      `SELECT s.*, 
              sds.custom_scene_id, sds.lens, sds.angle, sds.lighting, sds.movement, 
              sds.zoom, sds.sound, sds.dialogue, sds.stunt_instructions, 
              sds.physics_focus, sds.style, sds.transition
       FROM scenes s
       LEFT JOIN scene_director_settings sds ON s.id = sds.scene_id
       WHERE s.episode_id = ?
       ORDER BY s.sequence_number ASC`,
      [episodeId]
    );

    res.json({ clips });
  } catch (error) {
    console.error('Error fetching clips:', error);
    res.status(500).json({ error: 'Failed to fetch clips' });
  }
});

// GET /api/clips/:id - Get single clip
router.get('/:id', async (req: express.Request, res: Response) => {
  try {
    const clipId = req.params.id;
    const pool = getPool();

    const [clips] = await pool.query(
      `SELECT s.*, 
              sds.custom_scene_id, sds.lens, sds.angle, sds.lighting, sds.movement, 
              sds.zoom, sds.sound, sds.dialogue, sds.stunt_instructions, 
              sds.physics_focus, sds.style, sds.transition
       FROM scenes s
       LEFT JOIN scene_director_settings sds ON s.id = sds.scene_id
       WHERE s.id = ?`,
      [clipId]
    );

    if (!Array.isArray(clips) || clips.length === 0) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    res.json({ clip: clips[0] });
  } catch (error) {
    console.error('Error fetching clip:', error);
    res.status(500).json({ error: 'Failed to fetch clip' });
  }
});

// POST /api/clips - Create clip
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      episode_id,
      project_id,
      sequence_number,
      raw_idea,
      enhanced_prompt,
      context_summary,
      status,
      director_settings,
    } = req.body;

    if (!episode_id && !project_id) {
      return res.status(400).json({ error: 'episode_id or project_id is required' });
    }

    if (!sequence_number) {
      return res.status(400).json({ error: 'sequence_number is required' });
    }

    const pool = getPool();
    const clipId = `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Insert clip
    await pool.query(
      `INSERT INTO scenes (id, project_id, episode_id, sequence_number, raw_idea, enhanced_prompt, context_summary, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clipId,
        project_id || null,
        episode_id || null,
        sequence_number,
        raw_idea || '',
        enhanced_prompt || '',
        context_summary || '',
        status || 'completed',
      ]
    );

    // Insert director settings if provided
    if (director_settings) {
      await pool.query(
        `INSERT INTO scene_director_settings (
          scene_id, custom_scene_id, lens, angle, lighting, movement, zoom,
          sound, dialogue, stunt_instructions, physics_focus, style, transition
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clipId,
          director_settings.customSceneId || '',
          director_settings.lens || '',
          director_settings.angle || '',
          director_settings.lighting || '',
          director_settings.movement || '',
          director_settings.zoom || '',
          director_settings.sound || '',
          director_settings.dialogue || '',
          director_settings.stuntInstructions || '',
          director_settings.physicsFocus || false,
          director_settings.style || 'Cinematic',
          director_settings.transition || '',
        ]
      );
    }

    res.status(201).json({
      id: clipId,
      message: 'Clip created successfully',
    });
  } catch (error) {
    console.error('Error creating clip:', error);
    res.status(500).json({ error: 'Failed to create clip' });
  }
});

// PUT /api/clips/:id - Update clip
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const clipId = req.params.id;
    const {
      sequence_number,
      raw_idea,
      enhanced_prompt,
      context_summary,
      status,
      episode_id,
      director_settings,
    } = req.body;

    const pool = getPool();

    // Update clip
    const updates: string[] = [];
    const params: any[] = [];

    if (sequence_number !== undefined) {
      updates.push('sequence_number = ?');
      params.push(sequence_number);
    }

    if (raw_idea !== undefined) {
      updates.push('raw_idea = ?');
      params.push(raw_idea);
    }

    if (enhanced_prompt !== undefined) {
      updates.push('enhanced_prompt = ?');
      params.push(enhanced_prompt);
    }

    if (context_summary !== undefined) {
      updates.push('context_summary = ?');
      params.push(context_summary);
    }

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (episode_id !== undefined) {
      updates.push('episode_id = ?');
      params.push(episode_id);
    }

    if (updates.length > 0) {
      params.push(clipId);
      await pool.query(`UPDATE scenes SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Update director settings if provided
    if (director_settings) {
      // Check if settings exist
      const [existing] = await pool.query('SELECT id FROM scene_director_settings WHERE scene_id = ?', [clipId]);

      if (Array.isArray(existing) && existing.length > 0) {
        // Update existing
        await pool.query(
          `UPDATE scene_director_settings SET
            custom_scene_id = COALESCE(?, custom_scene_id),
            lens = COALESCE(?, lens),
            angle = COALESCE(?, angle),
            lighting = COALESCE(?, lighting),
            movement = COALESCE(?, movement),
            zoom = COALESCE(?, zoom),
            sound = COALESCE(?, sound),
            dialogue = COALESCE(?, dialogue),
            stunt_instructions = COALESCE(?, stunt_instructions),
            physics_focus = COALESCE(?, physics_focus),
            style = COALESCE(?, style),
            transition = COALESCE(?, transition)
           WHERE scene_id = ?`,
          [
            director_settings.customSceneId || null,
            director_settings.lens || null,
            director_settings.angle || null,
            director_settings.lighting || null,
            director_settings.movement || null,
            director_settings.zoom || null,
            director_settings.sound || null,
            director_settings.dialogue || null,
            director_settings.stuntInstructions || null,
            director_settings.physicsFocus ?? null,
            director_settings.style || null,
            director_settings.transition || null,
            clipId,
          ]
        );
      } else {
        // Insert new
        await pool.query(
          `INSERT INTO scene_director_settings (
            scene_id, custom_scene_id, lens, angle, lighting, movement, zoom,
            sound, dialogue, stunt_instructions, physics_focus, style, transition
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            clipId,
            director_settings.customSceneId || '',
            director_settings.lens || '',
            director_settings.angle || '',
            director_settings.lighting || '',
            director_settings.movement || '',
            director_settings.zoom || '',
            director_settings.sound || '',
            director_settings.dialogue || '',
            director_settings.stuntInstructions || '',
            director_settings.physicsFocus || false,
            director_settings.style || 'Cinematic',
            director_settings.transition || '',
          ]
        );
      }
    }

    res.json({ message: 'Clip updated successfully' });
  } catch (error) {
    console.error('Error updating clip:', error);
    res.status(500).json({ error: 'Failed to update clip' });
  }
});

// DELETE /api/clips/:id - Delete clip
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const clipId = req.params.id;
    const pool = getPool();

    // Delete clip (director settings cascade)
    await pool.query('DELETE FROM scenes WHERE id = ?', [clipId]);

    res.json({ message: 'Clip deleted successfully' });
  } catch (error) {
    console.error('Error deleting clip:', error);
    res.status(500).json({ error: 'Failed to delete clip' });
  }
});

// POST /api/clips/:id/move - Move clip to different episode
router.post('/:id/move', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const clipId = req.params.id;
    const { episode_id, sequence_number } = req.body;

    if (!episode_id) {
      return res.status(400).json({ error: 'episode_id is required' });
    }

    const pool = getPool();

    const updates: string[] = ['episode_id = ?'];
    const params: any[] = [episode_id];

    if (sequence_number !== undefined) {
      updates.push('sequence_number = ?');
      params.push(sequence_number);
    }

    params.push(clipId);

    await pool.query(`UPDATE scenes SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ message: 'Clip moved successfully' });
  } catch (error) {
    console.error('Error moving clip:', error);
    res.status(500).json({ error: 'Failed to move clip' });
  }
});

export default router;

