import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import { generateComicContent } from '../services/geminiService.js';
import { StoryContext, Scene } from '../../types.js';

const router = express.Router();

// GET /api/comics/:projectId - Get existing comic export
router.get('/:projectId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { episodeId } = req.query;
    const userId = req.user!.id;
    const pool = getPool();

    // Check if comic exists
    const [comics] = await pool.query(
      `SELECT * FROM comic_exports 
       WHERE project_id = ? AND (episode_id = ? OR (episode_id IS NULL AND ? IS NULL))
       ORDER BY version DESC, created_at DESC 
       LIMIT 1`,
      [projectId, episodeId || null, episodeId || null]
    ) as [any[], any];

    if (Array.isArray(comics) && comics.length > 0) {
      const comic = comics[0];
      return res.json({
        exists: true,
        comic: {
          id: comic.id,
          comicContent: comic.comic_content,
          htmlContent: comic.html_content,
          version: comic.version,
          createdAt: comic.created_at
        }
      });
    }

    res.json({ exists: false });
  } catch (error: any) {
    console.error('Error fetching comic:', error);
    res.status(500).json({ error: 'Failed to fetch comic' });
  }
});

// POST /api/comics/generate - Generate new comic content
router.post('/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, episodeId, projectContext, scenes } = req.body;
    const userId = req.user!.id;

    if (!projectId || !projectContext || !scenes || !Array.isArray(scenes)) {
      return res.status(400).json({ error: 'projectId, projectContext, and scenes are required' });
    }

    const pool = getPool();

    // Generate comic content using Gemini
    const { comicContent, htmlContent } = await generateComicContent(
      projectContext as StoryContext,
      scenes as Scene[],
      userId
    );

    // Check if comic exists
    const [existing] = await pool.query(
      `SELECT id, version FROM comic_exports 
       WHERE project_id = ? AND (episode_id = ? OR (episode_id IS NULL AND ? IS NULL))
       ORDER BY version DESC LIMIT 1`,
      [projectId, episodeId || null, episodeId || null]
    ) as [any[], any];

    let comicId: number;
    let version = 1;

    if (Array.isArray(existing) && existing.length > 0) {
      // Update existing
      version = existing[0].version + 1;
      comicId = existing[0].id;
      await pool.query(
        `UPDATE comic_exports 
         SET comic_content = ?, html_content = ?, version = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [comicContent, htmlContent, version, comicId]
      );
    } else {
      // Insert new
      const [result] = await pool.query(
        `INSERT INTO comic_exports (project_id, episode_id, comic_content, html_content, version)
         VALUES (?, ?, ?, ?, ?)`,
        [projectId, episodeId || null, comicContent, htmlContent, version]
      ) as [any, any];
      comicId = (result as any).insertId;
    }

    res.json({
      success: true,
      comic: {
        id: comicId,
        comicContent,
        htmlContent
      }
    });
  } catch (error: any) {
    console.error('Error generating comic:', error);
    res.status(500).json({ error: error.message || 'Failed to generate comic' });
  }
});

// GET /api/comics/:projectId/download - Download comic HTML
router.get('/:projectId/download', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { episodeId } = req.query;
    const pool = getPool();

    const [comics] = await pool.query(
      `SELECT html_content FROM comic_exports 
       WHERE project_id = ? AND (episode_id = ? OR (episode_id IS NULL AND ? IS NULL))
       ORDER BY version DESC, created_at DESC 
       LIMIT 1`,
      [projectId, episodeId || null, episodeId || null]
    ) as [any[], any];

    if (Array.isArray(comics) && comics.length > 0) {
      const htmlContent = comics[0].html_content;
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="comic_${projectId}.html"`);
      res.send(htmlContent);
    } else {
      res.status(404).json({ error: 'Comic not found' });
    }
  } catch (error: any) {
    console.error('Error downloading comic:', error);
    res.status(500).json({ error: 'Failed to download comic' });
  }
});

export default router;

