import express, { Request, Response } from 'express';
import { generateStoryConcept, suggestNextScene, suggestDirectorSettings, enhanceScenePrompt } from '../services/geminiService';
import { StoryContext, DirectorSettings, Scene } from '../../types';
import { authenticateToken, AuthRequest } from '../admin/middleware/auth';

const router = express.Router();

// Helper to get user ID from request (optional auth)
function getUserId(req: Request): number | undefined {
  const authReq = req as AuthRequest;
  return authReq.user?.id;
}

// POST /api/gemini/generate-story
router.post('/generate-story', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { seed } = req.body;
    if (!seed || typeof seed !== 'string') {
      return res.status(400).json({ error: 'Seed is required' });
    }
    const userId = req.user?.id;
    const result = await generateStoryConcept(seed, userId);
    res.json(result);
  } catch (error: any) {
    console.error('Error generating story:', error);
    res.status(500).json({ error: error.message || 'Failed to generate story concept' });
  }
});

// POST /api/gemini/suggest-next-scene
router.post('/suggest-next-scene', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { context, recentScenes } = req.body;
    if (!context) {
      return res.status(400).json({ error: 'Context is required' });
    }
    const userId = req.user?.id;
    const result = await suggestNextScene(context as StoryContext, recentScenes || [], userId);
    res.json({ suggestion: result });
  } catch (error: any) {
    console.error('Error suggesting next scene:', error);
    res.status(500).json({ error: error.message || 'Failed to suggest next scene' });
  }
});

// POST /api/gemini/suggest-director-settings
router.post('/suggest-director-settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { rawIdea, context, prevSceneSummary, currentSettings } = req.body;
    if (!rawIdea || !context || !currentSettings) {
      return res.status(400).json({ error: 'rawIdea, context, and currentSettings are required' });
    }
    const userId = req.user?.id;
    const result = await suggestDirectorSettings(
      rawIdea,
      context as StoryContext,
      prevSceneSummary || null,
      currentSettings as DirectorSettings,
      userId
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error suggesting director settings:', error);
    res.status(500).json({ error: error.message || 'Failed to suggest director settings' });
  }
});

// POST /api/gemini/enhance-scene-prompt
router.post('/enhance-scene-prompt', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { rawIdea, context, prevSceneSummary, settings } = req.body;
    if (!rawIdea || !context || !settings) {
      return res.status(400).json({ error: 'rawIdea, context, and settings are required' });
    }
    const userId = req.user?.id;
    const result = await enhanceScenePrompt(
      rawIdea,
      context as StoryContext,
      prevSceneSummary || null,
      settings as DirectorSettings,
      userId
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error enhancing scene prompt:', error);
    res.status(500).json({ error: error.message || 'Failed to enhance scene prompt' });
  }
});

export default router;

