import express, { Request, Response } from 'express';
import { generateStoryConcept, suggestNextScene, suggestDirectorSettings, enhanceScenePrompt, extractCharacters, extractLocations, generateEpisodeContent, analyzeCharacterRelationships, suggestScenes } from '../services/geminiService.js';
import { StoryContext, DirectorSettings, Scene } from '../../types.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

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
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to generate story concept';
    let statusCode = error.status || 500;
    
    if (error.status === 403 || error.statusCode === 403 || error.message?.includes('PERMISSION_DENIED') || error.message?.includes('SERVICE_DISABLED')) {
      errorMessage = 'Gemini API is not enabled. Please enable the Generative Language API in Google Cloud Console: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview';
      statusCode = 403;
    } else if (error.message?.includes('API key') || error.message?.includes('not set') || error.message?.includes('Gemini API key is not set')) {
      errorMessage = 'Invalid or missing Gemini API key. Please check your API key in settings or contact support if using the default key.';
      statusCode = 500;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    
    // Enhanced validation with better error messages
    if (!rawIdea || typeof rawIdea !== 'string' || rawIdea.trim().length === 0) {
      console.error('Validation failed: rawIdea is missing or invalid', { 
        hasRawIdea: !!rawIdea, 
        type: typeof rawIdea,
        length: rawIdea?.length 
      });
      return res.status(400).json({ error: 'rawIdea is required and must be a non-empty string' });
    }
    
    if (!context || typeof context !== 'object' || Array.isArray(context)) {
      console.error('Validation failed: context is missing or invalid', { 
        hasContext: !!context, 
        type: typeof context,
        isArray: Array.isArray(context),
        keys: context ? Object.keys(context) : []
      });
      return res.status(400).json({ error: 'context is required and must be a valid object' });
    }
    
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      console.error('Validation failed: settings is missing or invalid', { 
        hasSettings: !!settings, 
        type: typeof settings,
        isArray: Array.isArray(settings),
        keys: settings ? Object.keys(settings) : []
      });
      return res.status(400).json({ error: 'settings is required and must be a valid object' });
    }
    
    // Log request for debugging (without sensitive data)
    console.log('Enhancing scene prompt:', {
      rawIdeaLength: rawIdea?.length || 0,
      contextKeys: context ? Object.keys(context) : [],
      settingsKeys: settings ? Object.keys(settings) : [],
      hasPrevSceneSummary: !!prevSceneSummary,
      contextId: (context as any)?.id || 'missing'
    });
    
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
    console.error('Request body:', {
      hasRawIdea: !!req.body.rawIdea,
      hasContext: !!req.body.context,
      hasSettings: !!req.body.settings,
      rawIdeaType: typeof req.body.rawIdea,
      contextType: typeof req.body.context,
      settingsType: typeof req.body.settings
    });
    
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
  // Set a longer timeout for this endpoint (2 minutes)
  req.setTimeout(120000);
  
  try {
    const { context, scenes } = req.body;
    if (!context) {
      return res.status(400).json({ error: 'Story context is required' });
    }

    const userId = req.user!.id;
    
    // Limit scenes to prevent timeout
    const scenesArray = (scenes || []) as Scene[];
    if (scenesArray.length > 50) {
      console.warn(`Character extraction: Limiting to first 50 of ${scenesArray.length} scenes`);
    }
    
    const characters = await extractCharacters(context as StoryContext, scenesArray, userId);
    res.json({ characters });
  } catch (error: any) {
    console.error('Error extracting characters:', error);
    
    // Handle timeout errors specifically
    if (error.message?.includes('timeout') || error.message?.includes('TIMEOUT') || error.code === 'ETIMEDOUT') {
      return res.status(504).json({ 
        error: 'Request timed out. The story may be too large. Try with fewer scenes or split the extraction.' 
      });
    }
    
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

// POST /api/gemini/analyze-character-relationships - Analyze character relationships using AI
router.post('/analyze-character-relationships', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { characters, scenes, context } = req.body;
    if (!characters || !Array.isArray(characters) || characters.length === 0) {
      return res.status(400).json({ error: 'Characters array is required' });
    }
    if (!scenes || !Array.isArray(scenes)) {
      return res.status(400).json({ error: 'Scenes array is required' });
    }
    if (!context) {
      return res.status(400).json({ error: 'Story context is required' });
    }

    const userId = req.user!.id;
    const relationships = await analyzeCharacterRelationships(
      characters,
      scenes as Scene[],
      context as StoryContext,
      userId
    );
    res.json(relationships);
  } catch (error: any) {
    console.error('Error analyzing character relationships:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze character relationships' });
  }
});

// POST /api/gemini/suggest-scenes - Get AI-powered scene suggestions
router.post('/suggest-scenes', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { storyContext, scenes, prompt, suggestionType, selectedSceneId } = req.body;
    
    if (!storyContext) {
      return res.status(400).json({ error: 'Story context is required' });
    }
    if (!scenes || !Array.isArray(scenes)) {
      return res.status(400).json({ error: 'Scenes array is required' });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const userId = req.user!.id;
    const suggestions = await suggestScenes(
      storyContext as StoryContext,
      scenes as Scene[],
      prompt,
      suggestionType || 'next',
      selectedSceneId,
      userId
    );
    
    res.json({ suggestions });
  } catch (error: any) {
    console.error('Error suggesting scenes:', error);
    res.status(500).json({ error: error.message || 'Failed to suggest scenes' });
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

// GET /api/gemini/check-api-key - Diagnostic endpoint to check API key status
router.get('/check-api-key', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const envKey = process.env.GEMINI_API_KEY;
    const envKeyExists = !!envKey;
    const envKeyLength = envKey ? envKey.length : 0;
    const envKeyMasked = envKey ? envKey.substring(0, 8) + '...' + envKey.substring(envKey.length - 4) : null;
    
    // Check if user has their own key
    let userKeyExists = false;
    let userKeyLength = 0;
    if (userId) {
      try {
        const pool = await import('../db/index.js').then(m => m.getPool());
        const [settings] = await pool.query(
          'SELECT user_gemini_api_key FROM user_settings WHERE user_id = ?',
          [userId]
        ) as [any[], any];
        
        if (Array.isArray(settings) && settings.length > 0) {
          const userSettings = settings[0] as any;
          userKeyExists = !!userSettings.user_gemini_api_key;
          userKeyLength = userKeyExists ? userSettings.user_gemini_api_key.length : 0;
        }
      } catch (err) {
        console.error('Error checking user key:', err);
      }
    }
    
    const willUseUserKey = userKeyExists;
    const willUseEnvKey = !userKeyExists && envKeyExists;
    const noKeyAvailable = !userKeyExists && !envKeyExists;
    
    res.json({
      status: noKeyAvailable ? 'no_key' : 'key_available',
      userKey: {
        exists: userKeyExists,
        length: userKeyLength,
        willBeUsed: willUseUserKey
      },
      environmentKey: {
        exists: envKeyExists,
        length: envKeyLength,
        masked: envKeyMasked,
        willBeUsed: willUseEnvKey
      },
      message: noKeyAvailable 
        ? 'No API key available. Please set GEMINI_API_KEY in environment or add your key in user settings.'
        : willUseUserKey 
        ? 'Will use user-specific API key from settings.'
        : 'Will use fallback API key from environment variable.'
    });
  } catch (error: any) {
    console.error('Error checking API key:', error);
    res.status(500).json({ error: 'Failed to check API key status' });
  }
});

export default router;

