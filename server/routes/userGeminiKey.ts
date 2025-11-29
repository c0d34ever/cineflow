import express, { Response } from 'express';
import { getPool } from '../db/index.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/user/gemini-key - Get user's Gemini API key (masked)
router.get('/gemini-key', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const pool = getPool();

    const [settings] = await pool.query(
      'SELECT user_gemini_api_key FROM user_settings WHERE user_id = ?',
      [userId]
    );

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.json({ hasKey: false, key: null });
    }

    const userSettings = settings[0] as any;
    const hasKey = !!userSettings.user_gemini_api_key;

    // Return masked key (show last 4 characters)
    const maskedKey = hasKey
      ? `****${userSettings.user_gemini_api_key.slice(-4)}`
      : null;

    res.json({
      hasKey,
      key: maskedKey,
    });
  } catch (error) {
    console.error('Error fetching user Gemini key:', error);
    res.status(500).json({ error: 'Failed to fetch Gemini API key' });
  }
});

// POST /api/user/gemini-key - Set user's Gemini API key
router.post('/gemini-key', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { api_key } = req.body;

    if (!api_key || typeof api_key !== 'string' || api_key.trim().length === 0) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const trimmedKey = api_key.trim();
    
    // Basic validation: Google AI Studio API keys are typically 39+ characters
    if (trimmedKey.length < 20) {
      return res.status(400).json({ error: 'API key appears to be too short. Please check your API key from https://aistudio.google.com/' });
    }

    const pool = getPool();

    // Check if settings exist
    const [existing] = await pool.query(
      'SELECT id FROM user_settings WHERE user_id = ?',
      [userId]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      // Update existing
      await pool.query(
        'UPDATE user_settings SET user_gemini_api_key = ? WHERE user_id = ?',
        [api_key.trim(), userId]
      );
    } else {
      // Create new settings with API key
      await pool.query(
        'INSERT INTO user_settings (user_id, user_gemini_api_key) VALUES (?, ?)',
        [userId, api_key.trim()]
      );
    }

    res.json({
      message: 'Gemini API key saved successfully',
      masked: `****${api_key.trim().slice(-4)}`,
    });
  } catch (error) {
    console.error('Error saving Gemini API key:', error);
    res.status(500).json({ error: 'Failed to save Gemini API key' });
  }
});

// DELETE /api/user/gemini-key - Remove user's Gemini API key
router.delete('/gemini-key', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const pool = getPool();

    await pool.query(
      'UPDATE user_settings SET user_gemini_api_key = NULL WHERE user_id = ?',
      [userId]
    );

    res.json({ message: 'Gemini API key removed successfully' });
  } catch (error) {
    console.error('Error removing Gemini API key:', error);
    res.status(500).json({ error: 'Failed to remove Gemini API key' });
  }
});

// POST /api/user/gemini-key/test - Test user's Gemini API key
router.post('/gemini-key/test', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { api_key } = req.body;

    if (!api_key) {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Test the API key by making a simple request to Gemini
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: api_key.trim() });

      // Make a simple test request
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Say "API key is valid" if you can read this.',
      });

      if (response.text) {
        res.json({
          valid: true,
          message: 'API key is valid and working',
        });
      } else {
        res.json({
          valid: false,
          message: 'API key may be invalid',
        });
      }
    } catch (testError: any) {
      console.error('Gemini API test error:', testError);
      console.error('Error details:', {
        message: testError.message,
        status: testError.status,
        statusCode: testError.statusCode,
        code: testError.code,
        response: testError.response?.data || testError.response
      });
      
      let errorMessage = testError.message || 'API key test failed';
      
      // Provide specific error messages
      if (testError.status === 403 || testError.statusCode === 403 || testError.code === 'PERMISSION_DENIED') {
        errorMessage = 'Gemini API is not enabled. Please enable the Generative Language API in Google Cloud Console: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview';
      } else if (testError.message?.includes('SERVICE_DISABLED') || testError.message?.includes('not enabled')) {
        errorMessage = 'Gemini API is not enabled. Please enable the Generative Language API in Google Cloud Console: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview';
      } else if (testError.message?.includes('API key') || testError.message?.includes('authentication') || testError.message?.includes('invalid')) {
        errorMessage = 'Invalid API key. Please check that your API key is correct and has not been revoked.';
      } else if (testError.message?.includes('quota') || testError.message?.includes('limit')) {
        errorMessage = 'API quota exceeded. Please check your Google Cloud Console for quota limits.';
      }
      
      res.json({
        valid: false,
        message: errorMessage,
      });
    }
  } catch (error) {
    console.error('Error testing Gemini API key:', error);
    res.status(500).json({ error: 'Failed to test Gemini API key' });
  }
});

export default router;

