import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../admin/middleware/auth.js';

const router = express.Router();

// GET /api/episodes/project/:projectId - Get all episodes for a project
router.get('/project/:projectId', async (req: express.Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const pool = getPool();

    const [episodes] = await pool.query(
      `SELECT e.*, 
              COUNT(s.id) as clip_count,
              SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) as completed_clips
       FROM episodes e
       LEFT JOIN scenes s ON s.episode_id = e.id
       WHERE e.project_id = ?
       GROUP BY e.id
       ORDER BY e.episode_number ASC`,
      [projectId]
    );

    res.json({ episodes });
  } catch (error) {
    console.error('Error fetching episodes:', error);
    res.status(500).json({ error: 'Failed to fetch episodes' });
  }
});

// GET /api/episodes/:id - Get single episode with clips
router.get('/:id', async (req: express.Request, res: Response) => {
  try {
    const episodeId = req.params.id;
    const pool = getPool();

    const [episodes] = await pool.query(
      'SELECT * FROM episodes WHERE id = ?',
      [episodeId]
    );

    if (!Array.isArray(episodes) || episodes.length === 0) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const episode = episodes[0] as any;

    // Get clips for this episode
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

    res.json({
      episode,
      clips,
    });
  } catch (error) {
    console.error('Error fetching episode:', error);
    res.status(500).json({ error: 'Failed to fetch episode' });
  }
});

// POST /api/episodes - Create episode
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { project_id, episode_number, title, description, duration_seconds, air_date, status, thumbnail_url } = req.body;

    if (!project_id || !episode_number) {
      return res.status(400).json({ error: 'project_id and episode_number are required' });
    }

    const pool = getPool();
    const episodeId = `episode-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const [result] = await pool.query(
      `INSERT INTO episodes (id, project_id, episode_number, title, description, duration_seconds, air_date, status, thumbnail_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [episodeId, project_id, episode_number, title || null, description || null, duration_seconds || 0, air_date || null, status || 'draft', thumbnail_url || null]
    );

    const insertResult = result as any;

    res.status(201).json({
      id: episodeId,
      message: 'Episode created successfully',
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Episode number already exists for this project' });
    }
    console.error('Error creating episode:', error);
    res.status(500).json({ error: 'Failed to create episode' });
  }
});

// PUT /api/episodes/:id/generate-content - Generate hashtags and caption for episode
router.put('/:id/generate-content', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const episodeId = req.params.id;
    const { project_context } = req.body;
    const pool = getPool();

    // Get episode
    const [episodes] = await pool.query('SELECT * FROM episodes WHERE id = ?', [episodeId]);
    if (!Array.isArray(episodes) || episodes.length === 0) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const episode = episodes[0] as any;

    // Generate content using Gemini
    const { generateEpisodeContent } = require('../services/geminiService');
    const userId = req.user!.id;
    const content = await generateEpisodeContent(
      episode.title || `Episode ${episode.episode_number}`,
      episode.description || '',
      project_context,
      userId
    );

    // Update episode with generated content
    await pool.query(
      'UPDATE episodes SET hashtags = ?, caption = ? WHERE id = ?',
      [JSON.stringify(content.hashtags), content.caption, episodeId]
    );

    res.json({ hashtags: content.hashtags, caption: content.caption });
  } catch (error: any) {
    console.error('Error generating episode content:', error);
    res.status(500).json({ error: error.message || 'Failed to generate episode content' });
  }
});

// PUT /api/episodes/:id - Update episode
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const episodeId = req.params.id;
    const { title, description, duration_seconds, air_date, status, thumbnail_url, episode_number, hashtags, caption } = req.body;

    const pool = getPool();

    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (duration_seconds !== undefined) {
      updates.push('duration_seconds = ?');
      params.push(duration_seconds);
    }

    if (air_date !== undefined) {
      updates.push('air_date = ?');
      params.push(air_date);
    }

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (thumbnail_url !== undefined) {
      updates.push('thumbnail_url = ?');
      params.push(thumbnail_url);
    }

    if (episode_number !== undefined) {
      updates.push('episode_number = ?');
      params.push(episode_number);
    }

    if (hashtags !== undefined) {
      updates.push('hashtags = ?');
      params.push(Array.isArray(hashtags) ? JSON.stringify(hashtags) : hashtags);
    }

    if (caption !== undefined) {
      updates.push('caption = ?');
      params.push(caption);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(episodeId);

    await pool.query(`UPDATE episodes SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ message: 'Episode updated successfully' });
  } catch (error) {
    console.error('Error updating episode:', error);
    res.status(500).json({ error: 'Failed to update episode' });
  }
});

// DELETE /api/episodes/:id - Delete episode
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const episodeId = req.params.id;
    const pool = getPool();

    // Delete episode (clips will be orphaned or can be moved)
    await pool.query('DELETE FROM episodes WHERE id = ?', [episodeId]);

    res.json({ message: 'Episode deleted successfully' });
  } catch (error) {
    console.error('Error deleting episode:', error);
    res.status(500).json({ error: 'Failed to delete episode' });
  }
});

export default router;

