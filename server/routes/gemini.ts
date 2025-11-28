import express, { Request, Response } from 'express';
import { generateStoryConcept, suggestNextScene, suggestDirectorSettings, enhanceScenePrompt, extractCharacters, extractLocations, generateEpisodeContent } from '../services/geminiService';
import { StoryContext, DirectorSettings, Scene } from '../../types.js';
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
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to generate story concept';
    if (error.status === 403 || error.message?.includes('PERMISSION_DENIED') || error.message?.includes('SERVICE_DISABLED')) {
      errorMessage = 'Gemini API is not enabled. Please enable the Generative Language API in Google Cloud Console: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview';
    } else if (error.message?.includes('API key')) {
      errorMessage = 'Invalid or missing Gemini API key. Please check your API key in settings.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(error.status || 500).json({ error: errorMessage });
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
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to suggest next scene';
    if (error.status === 403 || error.message?.includes('PERMISSION_DENIED') || error.message?.includes('SERVICE_DISABLED')) {
      errorMessage = 'Gemini API is not enabled. Please enable the Generative Language API in Google Cloud Console: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview';
    } else if (error.message?.includes('API key')) {
      errorMessage = 'Invalid or missing Gemini API key. Please check your API key in settings.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(error.status || 500).json({ error: errorMessage });
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
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to suggest director settings';
    if (error.status === 403 || error.message?.includes('PERMISSION_DENIED') || error.message?.includes('SERVICE_DISABLED')) {
      errorMessage = 'Gemini API is not enabled. Please enable the Generative Language API in Google Cloud Console: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview';
    } else if (error.message?.includes('API key')) {
      errorMessage = 'Invalid or missing Gemini API key. Please check your API key in settings.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(error.status || 500).json({ error: errorMessage });
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
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to enhance scene prompt';
    if (error.status === 403 || error.message?.includes('PERMISSION_DENIED') || error.message?.includes('SERVICE_DISABLED')) {
      errorMessage = 'Gemini API is not enabled. Please enable the Generative Language API in Google Cloud Console: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview';
    } else if (error.message?.includes('API key')) {
      errorMessage = 'Invalid or missing Gemini API key. Please check your API key in settings.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(error.status || 500).json({ error: errorMessage });
  }
});

// POST /api/gemini/extract-characters - Extract characters from story
router.post('/extract-characters', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { context, scenes } = req.body;
    if (!context) {
      return res.status(400).json({ error: 'Story context is required' });
    }

    const userId = req.user!.id;
    const characters = await extractCharacters(context as StoryContext, (scenes || []) as Scene[], userId);
    res.json({ characters });
  } catch (error: any) {
    console.error('Error extracting characters:', error);
    res.status(500).json({ error: error.message || 'Failed to extract characters' });
  }
});

// POST /api/gemini/extract-locations - Extract locations from story
router.post('/extract-locations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { context, scenes } = req.body;
    if (!context) {
      return res.status(400).json({ error: 'Story context is required' });
    }

    const userId = req.user!.id;
    const locations = await extractLocations(context, scenes || [], userId);
    res.json({ locations });
  } catch (error: any) {
    console.error('Error extracting locations:', error);
    res.status(500).json({ error: error.message || 'Failed to extract locations' });
  }
});

// POST /api/gemini/generate-episode-content - Generate hashtags and caption for episode
router.post('/generate-episode-content', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { episode_title, episode_description, project_context } = req.body;
    if (!episode_title || !project_context) {
      return res.status(400).json({ error: 'Episode title and project context are required' });
    }

    const userId = req.user!.id;
    const content = await generateEpisodeContent(
      episode_title,
      episode_description || '',
      project_context,
      userId
    );
    res.json(content);
  } catch (error: any) {
    console.error('Error generating episode content:', error);
    res.status(500).json({ error: error.message || 'Failed to generate episode content' });
  }
});

export default router;

