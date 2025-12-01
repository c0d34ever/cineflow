import { GoogleGenAI, Type } from "@google/genai";
import { StoryContext, DirectorSettings, TechnicalStyle, Scene } from '../../types.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../db/index.js';

// Load .env file - try multiple locations
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading from server/.env first, then fallback to root .env
dotenv.config({ path: path.join(__dirname, '.env') });
// Also try root .env (for Docker/local development)
dotenv.config({ path: path.join(__dirname, '../../.env') });
// Also load from process.env (Docker passes env vars directly)
dotenv.config();

/**
 * Get user's Gemini API key from database
 */
async function getUserGeminiApiKey(userId?: number): Promise<string | null> {
  if (!userId) return null;

  try {
    const pool = getPool();
    const [settings] = await pool.query(
      'SELECT user_gemini_api_key FROM user_settings WHERE user_id = ?',
      [userId]
    );

    if (Array.isArray(settings) && settings.length > 0) {
      const userSettings = settings[0] as any;
      return userSettings.user_gemini_api_key || null;
    }
  } catch (error) {
    console.error('Error fetching user Gemini API key:', error);
  }

  return null;
}

/**
 * Standard client initialization using user's API key or fallback to environment.
 */
const getAIClient = async (userId?: number) => {
  // Try user's API key first
  const userApiKey = userId ? await getUserGeminiApiKey(userId) : null;
  
  // Fallback to environment variable
  const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const apiKey = userApiKey || envKey;
  
  // Debug logging
  console.log('[Gemini] API Key Debug:', {
    hasUserId: !!userId,
    hasUserApiKey: !!userApiKey,
    hasEnvKey: !!envKey,
    envKeyLength: envKey ? envKey.length : 0,
    finalApiKeyLength: apiKey ? apiKey.length : 0,
    envKeys: Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('API_KEY'))
  });
  
  if (!apiKey) {
    const errorMsg = 'Gemini API key is not set. Please set your API key in user settings or configure GEMINI_API_KEY in environment variables.';
    console.error('[Gemini]', errorMsg);
    console.error('[Gemini] Environment check:', {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `Set (${process.env.GEMINI_API_KEY.length} chars)` : 'NOT SET',
      API_KEY: process.env.API_KEY ? `Set (${process.env.API_KEY.length} chars)` : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    });
    throw new Error(errorMsg);
  }
  
  // Trim whitespace (common issue with .env files)
  const trimmedKey = apiKey.trim();
  if (trimmedKey !== apiKey) {
    console.warn('[Gemini] API key had leading/trailing whitespace, trimmed it');
  }
  
  // Log which key source is being used (masked for security)
  const keySource = userApiKey ? 'user settings' : 'environment variable';
  const maskedKey = trimmedKey.length > 12 
    ? trimmedKey.substring(0, 8) + '...' + trimmedKey.substring(trimmedKey.length - 4)
    : '****';
  console.log(`[Gemini] Using API key from ${keySource}: ${maskedKey}`);
  console.log(`[Gemini] API key length: ${trimmedKey.length} characters`);
  
  // Validate API key format (Google AI Studio keys typically start with "AIza")
  if (!trimmedKey.startsWith('AIza')) {
    console.warn('[Gemini] API key format warning: Expected to start with "AIza". Key starts with:', trimmedKey.substring(0, 4));
  }
  
  if (trimmedKey.length < 30) {
    console.warn('[Gemini] API key seems too short. Expected ~39 characters, got:', trimmedKey.length);
  }
  
  try {
    const client = new GoogleGenAI({ apiKey: trimmedKey });
    console.log('[Gemini] Client initialized successfully');
    return client;
  } catch (error: any) {
    console.error('[Gemini] Error initializing client:', error);
    console.error('[Gemini] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 200)
    });
    throw new Error(`Failed to initialize Gemini client: ${error.message}`);
  }
};

/**
 * Helper to safely parse JSON from AI response.
 * Handles markdown code blocks and parsing errors.
 */
const safeParseJSON = <T>(text: string | undefined, fallback: T): T => {
  if (!text) return fallback;
  try {
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // For arrays, find first [ and last ]
    if (cleanText.trim().startsWith('[')) {
      const firstBracket = cleanText.indexOf('[');
      let bracketCount = 0;
      let lastBracket = -1;
      for (let i = firstBracket; i < cleanText.length; i++) {
        if (cleanText[i] === '[') bracketCount++;
        if (cleanText[i] === ']') {
          bracketCount--;
          if (bracketCount === 0) {
            lastBracket = i;
            break;
          }
        }
      }
      if (firstBracket !== -1 && lastBracket !== -1) {
        cleanText = cleanText.substring(firstBracket, lastBracket + 1);
      }
    } else {
      // For objects, find matching braces
      const firstBrace = cleanText.indexOf('{');
      if (firstBrace !== -1) {
        let braceCount = 0;
        let lastBrace = -1;
        for (let i = firstBrace; i < cleanText.length; i++) {
          if (cleanText[i] === '{') braceCount++;
          if (cleanText[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              lastBrace = i;
              break;
            }
          }
        }
        if (lastBrace !== -1) {
          cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }
      }
    }
    
    return JSON.parse(cleanText) as T;
  } catch (e) {
    console.warn("JSON Parse Warning: output might be truncated or malformed.", e);
    console.warn("Text that failed to parse:", text?.substring(0, 500));
    return fallback;
  }
};

/**
 * Generates a full story concept (Title, Genre, Plot, Characters) from a short seed idea.
 */
export const generateStoryConcept = async (seed: string, userId?: number): Promise<Partial<StoryContext>> => {
  const ai = await getAIClient(userId);
  
  const systemInstruction = `You are a professional screenwriter and creative director. 
  Create a compelling movie concept based on the user's seed idea.
  If the seed is empty, invent a unique, high-concept story (Sci-Fi, Thriller, Fantasy, or Noir).
  
  LANGUAGE NOTE:
  - If the user's seed is in Hindi or mixed Hindi/English (Hinglish), you should process it but GENERATE the output primarily in English.
  - Use Hindi (Devanagari) ONLY for specific character dialogue snippets or culturally specific terms if absolutely necessary.
  
  CRITICAL REQUIREMENTS:
  - You MUST return ALL fields: title, genre, plotSummary, characters, and initialContext.
  - Do NOT leave any field empty or null.
  - If the user provides a very long description, extract the key elements:
    * Title: Extract or create a concise, memorable title (max 100 characters)
    * Genre: Identify the primary genre (e.g., "Sci-Fi Thriller", "Action Adventure", "Superhero Drama")
    * Plot Summary: Create a concise summary (100-200 words) of the main story arc
    * Characters: List the main characters with brief descriptions (e.g., "Protagonist: An alien discovering his origins; Antagonist: Tech billionaire exploiting alien powers")
    * Initial Context: A vivid visual description of an opening or climactic scene (50-100 words)
  
  IMPORTANT: 
  - Keep the plot summary concise (100-200 words).
  - Keep the initial context vivid but brief (50-100 words).
  - Extract genre from the seed if mentioned (e.g., "sci-fi", "thriller", "superhero")
  - Identify main characters from the seed description
  
  Return a JSON object with ALL fields populated:
  - title: A concise, memorable movie title
  - genre: The primary genre (e.g., "Sci-Fi Thriller", "Superhero Action")
  - plotSummary: A 100-200 word summary of the story arc
  - characters: Main characters with brief descriptions
  - initialContext: A vivid, visual description of an opening or climactic scene (50-100 words)`;

  // Truncate seed to avoid context issues
  const safeSeed = (seed || "Surprise me with a unique, cinematic story concept.").substring(0, 500);
  const prompt = `Seed Idea: "${safeSeed}"`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            genre: { type: Type.STRING },
            plotSummary: { type: Type.STRING },
            characters: { type: Type.STRING },
            initialContext: { type: Type.STRING, description: "Visual description of the last scene to resume from" }
          }
        }
      }
    });

    // Log raw response for debugging
    console.log('[Gemini] Raw response:', {
      text: response.text,
      textLength: response.text?.length,
      textPreview: response.text?.substring(0, 500),
      fullText: response.text
    });

    // Try to parse the response
    let parsed: Partial<StoryContext>;
    try {
      parsed = safeParseJSON<Partial<StoryContext>>(response.text, {
        title: "Untitled Project",
        genre: "Unknown",
        plotSummary: "Could not generate plot.",
        characters: "Unknown",
        initialContext: ""
      });
    } catch (parseError) {
      console.error('[Gemini] JSON parsing error:', parseError);
      console.error('[Gemini] Raw response that failed to parse:', response.text);
      parsed = {
        title: "Untitled Project",
        genre: "Unknown",
        plotSummary: "Could not generate plot.",
        characters: "Unknown",
        initialContext: ""
      };
    }
    
    // Log the parsed response for debugging
    console.log('[Gemini] Parsed story concept:', {
      parsed: JSON.stringify(parsed, null, 2),
      hasTitle: !!parsed.title,
      hasGenre: !!parsed.genre,
      hasPlotSummary: !!parsed.plotSummary,
      hasCharacters: !!parsed.characters,
      hasInitialContext: !!parsed.initialContext,
      titleValue: parsed.title,
      genreValue: parsed.genre,
      plotValue: parsed.plotSummary?.substring(0, 100),
      charactersValue: parsed.characters
    });
    
    // Check if we got fallback values (indicating parsing failed or fields are missing)
    const hasValidTitle = parsed.title && parsed.title !== "Untitled Project";
    const hasValidGenre = parsed.genre && parsed.genre !== "Unknown";
    const hasValidPlot = parsed.plotSummary && parsed.plotSummary !== "Could not generate plot." && parsed.plotSummary !== "Could not generate plot summary.";
    const hasValidCharacters = parsed.characters && parsed.characters !== "Unknown";
    
    if (!hasValidTitle || !hasValidGenre || !hasValidPlot || !hasValidCharacters) {
      console.warn('[Gemini] Missing required fields:', {
        hasTitle: hasValidTitle,
        hasGenre: hasValidGenre,
        hasPlot: hasValidPlot,
        hasCharacters: hasValidCharacters,
        rawResponse: response.text
      });
    }
    
    // Ensure all required fields are present, fill with defaults if missing
    const result = {
      title: hasValidTitle ? parsed.title! : "Untitled Project",
      genre: hasValidGenre ? parsed.genre! : "Superhero Action", // Better default for "Superman and Ironman"
      plotSummary: hasValidPlot ? parsed.plotSummary! : `A superhero story combining elements of ${seed.substring(0, 50)}. The protagonist discovers their true origins while facing a powerful antagonist who seeks to exploit their abilities.`,
      characters: hasValidCharacters ? parsed.characters! : `Hero: A powerful being discovering their origins; Villain: A tech mogul seeking to weaponize alien technology`,
      initialContext: parsed.initialContext || `Opening scene: The hero stands at the edge of a futuristic city, their powers awakening as they realize they are not who they thought they were.`
    };
    
    console.log('[Gemini] Final result:', result);
    
    return result;
  } catch (error: any) {
    console.error("Error generating story:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      statusCode: error.statusCode,
      code: error.code,
      response: error.response?.data || error.response
    });
    
    // Provide more helpful error messages
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      throw new Error('Invalid Gemini API key. Please check your API key in settings or environment variables.');
    }
    if (error.status === 403 || error.statusCode === 403 || error.code === 'PERMISSION_DENIED') {
      throw new Error('Gemini API is not enabled. Please enable the Generative Language API in Google Cloud Console: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview');
    }
    if (error.message?.includes('SERVICE_DISABLED') || error.message?.includes('not enabled')) {
      throw new Error('Gemini API is not enabled. Please enable the Generative Language API in Google Cloud Console: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview');
    }
    
    // Re-throw the error so the route handler can return proper error response
    throw error;
  }
};

/**
 * Suggests the immediate next scene idea (visual description) based on context history.
 */
export const suggestNextScene = async (
  context: StoryContext,
  recentScenes: Scene[],
  userId?: number
): Promise<string> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a master Screenwriter and Continuity Director.
  Your task is to conceive the NEXT 8-second shot in a film sequence.
  
  INPUT ANALYSIS:
  - Review the "Story Context" for the overall arc.
  - Review "Recent Scenes" to understand the immediate action trajectory (escalation, reaction, revelation).
  - Review "Last Scene Summary" to ensure perfect spatial and temporal continuity.
  
  LANGUAGE PROTOCOLS:
  - **VISUAL DESCRIPTION**: Output MUST be in **ENGLISH**.
  - **DIALOGUE**: Only if the scene includes spoken lines, you may write the dialogue in the character's native language (e.g. Hindi in Devanagari).
  - Use proper script format (Hindi words in Hindi script, English words in English script).
  
  OUTPUT REQUIREMENT:
  - Provide a SINGLE, VIVID paragraph (2-3 sentences) describing the visual action.
  - Do NOT include technical camera jargon here (that comes later). Focus on what happens IN THE FRAME.
  - The transition from the last scene must be seamless.
  `;

  // Build a rich history string
  let historyPrompt = "";
  if (recentScenes.length === 0) {
    historyPrompt = `OPENING CONTEXT: ${context.initialContext || "The story begins here."}`;
  } else {
    historyPrompt = recentScenes.map(s => 
      `SCENE ${s.sequenceNumber}: ${s.contextSummary}`
    ).join('\n');
  }

  const lastScene = recentScenes[recentScenes.length - 1];
  const lastSummary = lastScene ? lastScene.contextSummary : context.initialContext;

  const prompt = `
    PROJECT: ${context.title}
    GENRE: ${context.genre}
    PLOT: ${context.plotSummary.substring(0, 400)}
    
    SEQUENCE HISTORY (Last 5 shots):
    ${historyPrompt.substring(0, 1500)}
    
    IMMEDIATE PREVIOUS ACTION:
    "${lastSummary || 'None'}"
    
    TASK: Write the visual description for the next 8-second clip (Scene ${recentScenes.length + 1}). 
    Maintain strict continuity with the previous action.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    return response.text?.trim() || "";
  } catch (error: any) {
    console.error("Error suggesting next scene:", error);
    // Re-throw the error so the route handler can return proper error response
    throw error;
  }
};

/**
 * Analyzes context and input to suggest the best technical director settings automatically.
 */
export const suggestDirectorSettings = async (
  rawIdea: string,
  context: StoryContext,
  prevSceneSummary: string | null,
  currentSettings: DirectorSettings,
  userId?: number
): Promise<DirectorSettings> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are an expert Cinematographer and Director. 
  Your task is to determine the best technical camera, lighting, sound, and physics settings for the next scene in a movie.
  
  Analyze the Genre, Plot, Previous Context, and the User's rough idea for the next shot.
  Select the most impactful settings that enhance the storytelling.
  
  **CRITICAL: YOU MUST FILL IN ALL FIELDS. DO NOT LEAVE ANY FIELD EMPTY.**
  
  **CRITICAL LANGUAGE RULES**:
  1. **INPUT HANDLING**: The user's idea might be in **Hindi**, **Hinglish** (Hindi in English script), or **English**. You must understand all three.
  2. **TECHNICAL OUTPUT (Lens, Angle, Lighting, Movement, Sound)**: MUST be in **ENGLISH**.
  3. **DIALOGUE OUTPUT**:
     - If the user's idea contains dialogue, or if the character context implies it, output the dialogue.
     - **FORMAT MANDATORY**: "Character Name: 'Dialogue'" (e.g., Aryan: "Wait here.", Ghost: "I cannot.")
     - **LANGUAGE**: Use **Hindi (Devanagari)** for Hindi lines. Use English for English lines.
     - Example: Aryan: "हम कहाँ हैं?", Creatures: "Tum quantum state mein ho..."
  
  **MANDATORY FIELD REQUIREMENTS** (ALL must be filled):
  - customSceneId: Generate a scene identifier (e.g. "SCENE_001", "INT_OFFICE_02")
  - lens: REQUIRED - Suggest specific focal lengths (e.g. "24mm Wide", "50mm Anamorphic", "85mm Portrait", "35mm Prime"). NEVER leave empty.
  - angle: REQUIRED - Camera angle (e.g. "Eye Level", "Low Angle", "High Angle", "Dutch Angle", "Bird's Eye"). NEVER leave empty.
  - lighting: REQUIRED - Be descriptive (e.g. "Chiaroscuro high contrast", "Neon-noir rim light", "Overcast soft diffusion", "Natural Cinematic"). NEVER leave empty.
  - movement: REQUIRED - Suggest specific gear (e.g. "Steadicam", "Dolly Zoom", "Handheld shaky", "Crane down", "Static"). NEVER leave empty.
  - zoom: REQUIRED - Zoom intensity (e.g. "Slow Push In", "Crash Zoom", "No Zoom", "Slow Pull Out"). Use "No Zoom" if no zoom is needed. NEVER leave empty.
  - sound: REQUIRED - Sound layers (e.g. "Heartbeat thumping + Distant sirens", "Wind howling + Crunching snow", "Atmospheric ambient", "Silence"). NEVER leave empty.
  - dialogue: If characters are interacting or the scene suggests dialogue, provide it. Otherwise use empty string "".
  - stuntInstructions: If action/stunts are implied, specify mechanics (e.g. "Wire-assisted fall", "Squib impact", "High-speed collision"). Otherwise use empty string "".
  - physicsFocus: Boolean - true if scene requires high physics detail (action, explosions, water, etc.), false otherwise.
  - style: Must be one of: "Cinematic", "Documentary", "Experimental", "Commercial", "Music Video"
  - transition: Transition type (e.g. "Cut", "Fade", "Dissolve", "Wipe", "Match Cut")
  
  Return a JSON object matching the DirectorSettings interface exactly. ALL REQUIRED FIELDS MUST HAVE VALUES.`;

  const prompt = `
    MOVIE PROJECT:
    Title: ${context.title || 'Untitled'}
    Genre: ${context.genre || 'General'}
    Characters: ${context.characters || 'Unknown'}
    
    STORY CONTEXT:
    ${(prevSceneSummary || context.plotSummary || 'No previous context').substring(0, 500)}
    
    USER'S IDEA FOR NEXT SCENE:
    "${(rawIdea || "Continue the story naturally from the previous context.").substring(0, 300)}"
    
    CURRENT STYLE: ${currentSettings.style || 'Cinematic'}
    
    YOUR TASK:
    Based on the user's idea above, generate COMPLETE technical settings for this scene.
    - Analyze what type of shot this is (action, dialogue, establishing, etc.)
    - Determine appropriate camera settings (lens, angle, movement, zoom)
    - Determine lighting style that matches the mood
    - Determine sound design that enhances the scene
    - If dialogue is present or implied, include it
    - If action/stunts are present, include stunt instructions
    
    CRITICAL: Fill in EVERY field with appropriate values. Do not leave any field as an empty string unless it truly doesn't apply (like dialogue in a silent scene).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customSceneId: { 
              type: Type.STRING,
              description: "Scene identifier like 'SCENE_001' or 'INT_OFFICE_02'. REQUIRED."
            },
            lens: { 
              type: Type.STRING,
              description: "Camera lens specification. Examples: '24mm Wide', '50mm Anamorphic', '85mm Portrait', '35mm Prime'. REQUIRED - must provide a value."
            },
            angle: { 
              type: Type.STRING,
              description: "Camera angle. Examples: 'Eye Level', 'Low Angle', 'High Angle', 'Dutch Angle'. REQUIRED - must provide a value."
            },
            lighting: { 
              type: Type.STRING,
              description: "Lighting style. Examples: 'Chiaroscuro high contrast', 'Neon-noir rim light', 'Natural Cinematic'. REQUIRED - must provide a value."
            },
            movement: { 
              type: Type.STRING,
              description: "Camera movement. Examples: 'Steadicam', 'Dolly Zoom', 'Handheld shaky', 'Static', 'Crane down'. REQUIRED - must provide a value."
            },
            zoom: { 
              type: Type.STRING,
              description: "Zoom operation. Examples: 'Slow Push In', 'Crash Zoom', 'No Zoom', 'Slow Pull Out'. REQUIRED - must provide a value."
            },
            sound: { 
              type: Type.STRING,
              description: "Sound design. Examples: 'Heartbeat thumping + Distant sirens', 'Atmospheric ambient', 'Wind howling'. REQUIRED - must provide a value."
            },
            dialogue: { 
              type: Type.STRING,
              description: "Spoken lines if present. Format: Character: 'Line'. Leave empty if no dialogue."
            },
            stuntInstructions: { 
              type: Type.STRING,
              description: "Stunt/action mechanics if applicable. Examples: 'Wire-assisted fall', 'Squib impact'. Leave empty if no stunts."
            },
            physicsFocus: { 
              type: Type.BOOLEAN,
              description: "Whether scene requires high physics detail (true for action/explosions/water, false otherwise)."
            },
            style: { 
              type: Type.STRING,
              enum: Object.values(TechnicalStyle),
              description: "Visual style. Must be one of: Cinematic, Documentary, Experimental, Commercial, Music Video."
            },
            transition: { 
              type: Type.STRING,
              description: "Transition type. Examples: 'Cut', 'Fade', 'Dissolve', 'Wipe'. REQUIRED - must provide a value."
            }
          },
          required: ['lens', 'angle', 'lighting', 'movement', 'zoom', 'sound', 'transition', 'style', 'physicsFocus']
        }
      }
    });

    // Log the raw response for debugging
    console.log('Raw Gemini response:', response.text);
    
    const json = safeParseJSON<Partial<DirectorSettings>>(response.text, {});
    
    // Log parsed JSON for debugging
    console.log('Parsed JSON:', JSON.stringify(json, null, 2));
    
    // Merge with defaults to ensure safety - use empty string check, not just falsy
    return {
      ...currentSettings,
      ...json,
      // Ensure specific fields are strings and valid - check for empty strings explicitly
      customSceneId: json.customSceneId || `SCENE_${Date.now().toString().slice(-6)}`,
      lens: (json.lens && json.lens.trim()) ? json.lens : '35mm Prime',
      angle: (json.angle && json.angle.trim()) ? json.angle : 'Eye Level',
      lighting: (json.lighting && json.lighting.trim()) ? json.lighting : 'Natural Cinematic',
      movement: (json.movement && json.movement.trim()) ? json.movement : 'Static',
      zoom: (json.zoom && json.zoom.trim()) ? json.zoom : 'No Zoom',
      sound: (json.sound && json.sound.trim()) ? json.sound : 'Atmospheric ambient',
      stuntInstructions: json.stuntInstructions || '',
      dialogue: json.dialogue || '',
      physicsFocus: json.physicsFocus ?? currentSettings.physicsFocus ?? false,
      style: json.style || currentSettings.style || TechnicalStyle.CINEMATIC,
      transition: (json.transition && json.transition.trim()) ? json.transition : 'Cut'
    };
  } catch (error: any) {
    console.error("Error predicting settings:", error);
    // Re-throw the error so the route handler can return proper error response
    throw error;
  }
};

/**
 * Uses Gemini Flash to act as a "Director AI".
 * It takes a simple user idea and expands it into a highly detailed, physically accurate prompt.
 */
export const enhanceScenePrompt = async (
  rawIdea: string,
  context: StoryContext,
  prevSceneSummary: string | null,
  settings: DirectorSettings,
  userId?: number
): Promise<{ enhancedPrompt: string; contextSummary: string }> => {
  const ai = await getAIClient(userId);

  // Updated System Instruction for strict language separation
  const systemInstruction = `You are a legendary Film Director, Cinematographer, VFX Supervisor, and Stunt Coordinator combined.
  
  Your task is to generate the **ULTIMATE PRODUCTION PROMPT** for a high-end AI video generator (like Veo or Sora). 
  The output must be an extremely dense, technical, and visually evocative description of an 8-second clip.
  
  **STRICT LANGUAGE PROTOCOLS**:
  1. **VISUAL ACTION, LIGHTING, PHYSICS, CAMERA, AUDIO**: MUST be in **ENGLISH**. Even if the user input is in Hindi, you must TRANSLATE the visual description to English.
  2. **DIALOGUE**: If provided, include the dialogue exactly as given (respecting the Character: "Line" format and native script).
  3. **NO TRANSLITERATION**: Do not write Hindi in English letters (No Hinglish) in the output UNLESS the user explicitly provided it that way.
  4. **INPUT**: Accept Hindi, Hinglish, or English input.
  
  You must NOT return a simple summary. You must return a STRUCTURED TECHNICAL BREAKDOWN string.
  
  Output Format for 'enhancedPrompt' string (Use line breaks):
  
  **VISUAL ACTION (8s)**: [Detailed frame-by-frame description of the action, actors, expressions, and environment evolution in ENGLISH.]
  
  **CAMERA & LENS**: [Specific camera model, lens focal length, T-stop, shutter angle, specific movement type, damping, framing, zoom operations in ENGLISH]
  
  **LIGHTING & ATMOSPHERE**: [Key light position, ratios, volumetric fog density, color palette hex codes or names, exposure value, light texture in ENGLISH]
  
  **PHYSICS, VFX & STUNTS**: [Fluid dynamics, cloth simulation weight/drag, particle emission rates, impact velocity, skin texture scattering (sweat/pores), destruction physics, wirework specs in ENGLISH]
  
  **AUDIO LANDSCAPE**: [Specific foley stems, ambience layers, music intensity, mixing notes in ENGLISH]
  
  INSTRUCTIONS:
  - Populate every section with high-fidelity details.
  - If the user provided 'stuntInstructions', expand on them with physics (velocity, gravity).
  - If 'physicsFocus' is true, obsess over textures (skin, water, debris).
  - Ensure the 'contextSummary' field is a simple 1-sentence narrative bridge for the next scene (in ENGLISH).
  `;

  // Updated Prompt Construction to include ALL settings
  const prompt = `
    PROJECT DATA:
    Movie Title: ${context.title}
    Genre: ${context.genre}
    Previous Context: ${(prevSceneSummary || "Start of sequence").substring(0, 500)}
    
    DIRECTOR'S BEAT: "${rawIdea}"
    
    TECHNICAL INPUTS (MANDATORY INCLUSION):
    - Lens/Angle: ${settings.lens}, ${settings.angle}
    - Lighting: ${settings.lighting}
    - Camera Movement: ${settings.movement}
    - Camera Zoom: ${settings.zoom || "None"}
    - Physics Level: ${settings.physicsFocus ? "ULTRA-HIGH FIDELITY (Soft-body, Fluid, Particle)" : "Standard Cinematic"}
    - Stunt Specifics: ${settings.stuntInstructions || "Realistic motion"}
    - Sound Design: ${settings.sound || "Cinematic atmosphere"}
    - Dialogue Context: ${settings.dialogue || "No dialogue"}
    - Next Transition: ${settings.transition}
    
    EXECUTE: Generate the structured 8-second production prompt now. Invent details where missing.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enhancedPrompt: { type: Type.STRING },
            contextSummary: { type: Type.STRING }
          }
        }
      }
    });

    const json = safeParseJSON(response.text, { 
      enhancedPrompt: rawIdea, 
      contextSummary: rawIdea 
    });

    return {
      enhancedPrompt: json.enhancedPrompt || rawIdea,
      contextSummary: json.contextSummary || rawIdea
    };
  } catch (error: any) {
    console.error("Error enhancing prompt:", error);
    // Re-throw the error so the route handler can return proper error response
    throw error;
  }
};

/**
 * Extracts characters from story context and all scenes, returns structured character data
 */
export const extractCharacters = async (
  context: StoryContext,
  scenes: Scene[] = [],
  userId?: number
): Promise<Array<{ name: string; description?: string; role?: string; appearance?: string; personality?: string }>> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a professional script analyst. Extract all characters mentioned in the ENTIRE story, including all scenes.
  Return a JSON array of character objects with:
  - name: Character's name (required)
  - description: Brief character description
  - role: Character's role (e.g., "Protagonist", "Antagonist", "Supporting")
  - appearance: Physical appearance description
  - personality: Personality traits
  
  Extract ALL characters mentioned throughout the entire story, including all scenes. Analyze the complete narrative to identify every character, even minor ones.`;

  // Build scenes content summary - limit to prevent timeout
  // Truncate long content and limit number of scenes if too many
  const MAX_SCENES = 50; // Limit to first 50 scenes to prevent timeout
  const MAX_CONTENT_LENGTH = 500; // Limit each field to 500 chars
  
  const truncate = (text: string | undefined, maxLength: number): string => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  
  const scenesToProcess = scenes.slice(0, MAX_SCENES);
  const scenesContent = scenesToProcess.length > 0 
    ? scenesToProcess.map((scene, idx) => `
      Scene ${scene.sequenceNumber || idx + 1}:
      - Raw Idea: ${truncate(scene.rawIdea, MAX_CONTENT_LENGTH)}
      - Enhanced Prompt: ${truncate(scene.enhancedPrompt, MAX_CONTENT_LENGTH)}
      - Context Summary: ${truncate(scene.contextSummary, MAX_CONTENT_LENGTH)}
    `).join('\n')
    : 'No scenes generated yet.';
  
  if (scenes.length > MAX_SCENES) {
    console.warn(`Character extraction: Processing only first ${MAX_SCENES} of ${scenes.length} scenes to prevent timeout`);
  }

  const prompt = `
    COMPLETE STORY ANALYSIS:
    
    STORY CONTEXT:
    Title: ${context.title || 'Untitled'}
    Genre: ${context.genre || 'General'}
    Plot Summary: ${context.plotSummary || ''}
    Initial Characters Mentioned: ${context.characters || ''}
    Initial Context: ${context.initialContext || ''}
    
    ALL SCENES IN THE STORY:
    ${scenesContent}
    
    Analyze the ENTIRE story above, including all scenes, and extract ALL characters that appear throughout the complete narrative. Consider character development, relationships, and appearances across all scenes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              role: { type: Type.STRING },
              appearance: { type: Type.STRING },
              personality: { type: Type.STRING }
            },
            required: ['name']
          }
        }
      }
    });

    return safeParseJSON<Array<{ name: string; description?: string; role?: string; appearance?: string; personality?: string }>>(
      response.text,
      []
    );
  } catch (error: any) {
    console.error("Error extracting characters:", error);
    throw error;
  }
};

/**
 * Suggests scenes using AI based on story context
 */
export const suggestScenes = async (
  storyContext: StoryContext,
  scenes: Scene[],
  prompt: string,
  suggestionType: 'next' | 'improve' | 'transition',
  selectedSceneId?: string,
  userId?: number
): Promise<Array<{
  suggestion: string;
  reasoning: string;
  confidence: number;
  type: 'continuation' | 'improvement' | 'transition' | 'climax' | 'resolution';
}>> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a professional screenwriter and story consultant. Analyze the story and provide creative, compelling scene suggestions.

Return a JSON array of suggestion objects with:
- suggestion: A detailed scene idea (2-3 sentences)
- reasoning: Why this scene would work well (1-2 sentences)
- confidence: Confidence score (0-1)
- type: One of: "continuation", "improvement", "transition", "climax", "resolution"

Provide 3-5 diverse suggestions that offer different creative directions.`;

  // Build context from recent scenes
  const MAX_SCENES = 10;
  const MAX_CONTENT_LENGTH = 200;
  
  const truncate = (text: string | undefined, maxLength: number): string => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const scenesToProcess = scenes.slice(-MAX_SCENES);
  const scenesContent = scenesToProcess.length > 0 
    ? scenesToProcess.map((scene, idx) => `
      Scene ${scene.sequenceNumber || idx + 1}:
      - Idea: ${truncate(scene.rawIdea, MAX_CONTENT_LENGTH)}
      - Context: ${truncate(scene.contextSummary, MAX_CONTENT_LENGTH)}
      - Dialogue: ${truncate(scene.directorSettings?.dialogue, MAX_CONTENT_LENGTH)}
    `).join('\n')
    : 'No scenes yet.';

  const selectedScene = selectedSceneId ? scenes.find(s => s.id === selectedSceneId) : null;
  const selectedSceneContent = selectedScene ? `
    SELECTED SCENE TO IMPROVE:
    Scene ${selectedScene.sequenceNumber}:
    - Idea: ${truncate(selectedScene.rawIdea, MAX_CONTENT_LENGTH)}
    - Enhanced: ${truncate(selectedScene.enhancedPrompt, MAX_CONTENT_LENGTH)}
    - Context: ${truncate(selectedScene.contextSummary, MAX_CONTENT_LENGTH)}
  ` : '';

  const fullPrompt = `
    STORY CONTEXT:
    Title: ${storyContext.title || 'Untitled'}
    Genre: ${storyContext.genre || 'General'}
    Plot Summary: ${storyContext.plotSummary || ''}
    Characters: ${storyContext.characters || ''}
    
    ${selectedSceneContent}
    
    RECENT SCENES:
    ${scenesContent}
    
    REQUEST: ${prompt}
    
    Provide ${suggestionType === 'next' ? 'next scene' : suggestionType === 'improve' ? 'improvement' : 'transition'} suggestions that are creative, compelling, and fit the story's tone and progression.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              suggestion: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              type: {
                type: Type.STRING,
                enum: ['continuation', 'improvement', 'transition', 'climax', 'resolution']
              }
            },
            required: ['suggestion', 'reasoning', 'confidence', 'type']
          }
        }
      }
    });

    return safeParseJSON<Array<{
      suggestion: string;
      reasoning: string;
      confidence: number;
      type: 'continuation' | 'improvement' | 'transition' | 'climax' | 'resolution';
    }>>(
      response.text,
      []
    );
  } catch (error: any) {
    console.error("Error suggesting scenes:", error);
    throw error;
  }
};

/**
 * Analyzes character relationships using AI
 */
export const analyzeCharacterRelationships = async (
  characters: Array<{ name: string }>,
  scenes: Scene[],
  context: StoryContext,
  userId?: number
): Promise<Array<{
  character1: string;
  character2: string;
  type: 'allies' | 'enemies' | 'neutral' | 'romantic' | 'family';
  strength: number;
  description?: string;
}>> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a professional story analyst specializing in character relationships. Analyze the relationships between characters based on their interactions in scenes.

Return a JSON array of relationship objects with:
- character1: First character name
- character2: Second character name
- type: Relationship type - one of: "allies", "enemies", "neutral", "romantic", "family"
- strength: Relationship strength (0-1, where 1 is strongest)
- description: Brief description of their relationship (optional)

Analyze the actual content, dialogue, and interactions to determine relationship types accurately.`;

  // Build scenes content summary - limit to prevent timeout
  const MAX_SCENES = 30;
  const MAX_CONTENT_LENGTH = 300;
  
  const truncate = (text: string | undefined, maxLength: number): string => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const scenesToProcess = scenes.slice(0, MAX_SCENES);
  const scenesContent = scenesToProcess.length > 0 
    ? scenesToProcess.map((scene, idx) => `
      Scene ${scene.sequenceNumber || idx + 1}:
      - Raw Idea: ${truncate(scene.rawIdea, MAX_CONTENT_LENGTH)}
      - Enhanced Prompt: ${truncate(scene.enhancedPrompt, MAX_CONTENT_LENGTH)}
      - Context Summary: ${truncate(scene.contextSummary, MAX_CONTENT_LENGTH)}
      - Dialogue: ${truncate(scene.directorSettings?.dialogue, MAX_CONTENT_LENGTH)}
    `).join('\n')
    : 'No scenes generated yet.';

  const characterNames = characters.map(c => c.name).join(', ');

  const prompt = `
    STORY CONTEXT:
    Title: ${context.title || 'Untitled'}
    Genre: ${context.genre || 'General'}
    Plot Summary: ${context.plotSummary || ''}
    
    CHARACTERS TO ANALYZE:
    ${characterNames}
    
    SCENES:
    ${scenesContent}
    
    Analyze the relationships between all pairs of characters listed above. Consider:
    - Their interactions in dialogue
    - Their actions toward each other
    - The context and tone of their scenes together
    - Whether they cooperate, conflict, or are neutral
    - Any romantic or familial connections
    
    Return relationships for ALL character pairs that appear together in scenes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              character1: { type: Type.STRING },
              character2: { type: Type.STRING },
              type: { 
                type: Type.STRING,
                enum: ['allies', 'enemies', 'neutral', 'romantic', 'family']
              },
              strength: { type: Type.NUMBER },
              description: { type: Type.STRING }
            },
            required: ['character1', 'character2', 'type', 'strength']
          }
        }
      }
    });

    return safeParseJSON<Array<{
      character1: string;
      character2: string;
      type: 'allies' | 'enemies' | 'neutral' | 'romantic' | 'family';
      strength: number;
      description?: string;
    }>>(
      response.text,
      []
    );
  } catch (error: any) {
    console.error("Error analyzing character relationships:", error);
    throw error;
  }
};

/**
 * Extracts locations from story context and all scenes, returns structured location data
 */
export const extractLocations = async (
  context: StoryContext,
  scenes: Scene[] = [],
  userId?: number
): Promise<Array<{ name: string; description?: string; location_type?: string; address?: string }>> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a location scout. Extract all locations mentioned in the ENTIRE story, including all scenes.
  Return a JSON array of location objects with:
  - name: Location name (required)
  - description: Brief location description
  - location_type: Type of location (e.g., "Interior", "Exterior", "Studio", "Real Location")
  - address: Physical address or description if mentioned
  
  Extract ALL locations mentioned throughout the entire story, including all scenes. Analyze the complete narrative to identify every location, even minor ones.`;

  // Build scenes content summary with full details
  const scenesContent = scenes.length > 0 
    ? scenes.map((scene, idx) => `
      Scene ${scene.sequenceNumber || idx + 1}:
      - Raw Idea: ${scene.rawIdea || ''}
      - Enhanced Prompt: ${scene.enhancedPrompt || ''}
      - Context Summary: ${scene.contextSummary || ''}
    `).join('\n')
    : 'No scenes generated yet.';

  const prompt = `
    COMPLETE STORY ANALYSIS:
    
    STORY CONTEXT:
    Title: ${context.title || 'Untitled'}
    Genre: ${context.genre || 'General'}
    Plot Summary: ${context.plotSummary || ''}
    Initial Context: ${context.initialContext || ''}
    
    ALL SCENES IN THE STORY:
    ${scenesContent}
    
    Analyze the ENTIRE story above, including all scenes, and extract ALL locations that appear throughout the complete narrative. Consider location descriptions, settings, and any physical addresses or location details mentioned across all scenes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              location_type: { type: Type.STRING },
              address: { type: Type.STRING }
            },
            required: ['name']
          }
        }
      }
    });

    return safeParseJSON<Array<{ name: string; description?: string; location_type?: string; address?: string }>>(
      response.text,
      []
    );
  } catch (error: any) {
    console.error("Error extracting locations:", error);
    throw error;
  }
};

/**
 * Analyzes a complete story for pacing, character development, plot holes, structure, and dialogue
 */
export const analyzeStory = async (
  context: StoryContext,
  scenes: Scene[],
  userId?: number
): Promise<{
  pacing: { score: number; issues: string[]; suggestions: string[] };
  characterDevelopment: { score: number; issues: string[]; suggestions: string[] };
  plotHoles: { found: boolean; issues: string[] };
  structure: { score: number; analysis: string; suggestions: string[] };
  dialogue: { score: number; issues: string[]; suggestions: string[] };
}> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a professional story analyst and script consultant. Analyze storyboard projects and provide comprehensive feedback on pacing, character development, plot structure, and dialogue quality.

Return a JSON object with the following structure:
{
  "pacing": {
    "score": 0-100,
    "issues": ["issue1", "issue2"],
    "suggestions": ["suggestion1", "suggestion2"]
  },
  "characterDevelopment": {
    "score": 0-100,
    "issues": ["issue1"],
    "suggestions": ["suggestion1"]
  },
  "plotHoles": {
    "found": true/false,
    "issues": ["hole1", "hole2"]
  },
  "structure": {
    "score": 0-100,
    "analysis": "detailed analysis text",
    "suggestions": ["suggestion1"]
  },
  "dialogue": {
    "score": 0-100,
    "issues": ["issue1"],
    "suggestions": ["suggestion1"]
  }
}

Focus on:
1. Pacing - Are scenes well-paced? Too fast/slow? Transitions smooth?
2. Character Development - Are characters well-developed? Consistent? Growth arcs?
3. Plot Holes - Any inconsistencies or missing connections?
4. Structure - Does it follow good story structure (three-act, etc.)?
5. Dialogue - Is dialogue natural and character-appropriate?

Provide specific, actionable feedback.`;

  // Limit scenes to prevent timeout
  const MAX_SCENES = 50;
  const MAX_CONTENT_LENGTH = 300;
  
  const truncate = (text: string | undefined, maxLength: number): string => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const scenesToProcess = scenes.slice(0, MAX_SCENES);
  const scenesContent = scenesToProcess.length > 0
    ? scenesToProcess.map((scene, idx) => `
      Scene ${scene.sequenceNumber || idx + 1}:
      - Prompt: ${truncate(scene.enhancedPrompt, MAX_CONTENT_LENGTH)}
      - Dialogue: ${truncate(scene.directorSettings?.dialogue, MAX_CONTENT_LENGTH) || 'None'}
      - Context: ${truncate(scene.contextSummary, MAX_CONTENT_LENGTH) || 'None'}
    `).join('\n')
    : 'No scenes generated yet.';

  if (scenes.length > MAX_SCENES) {
    console.warn(`Story analysis: Processing only first ${MAX_SCENES} of ${scenes.length} scenes`);
  }

  const prompt = `
    STORY CONTEXT:
    Title: ${context.title || 'Untitled'}
    Genre: ${context.genre || 'General'}
    Plot Summary: ${context.plotSummary || ''}
    Characters: ${context.characters || ''}
    
    SCENES (${scenesToProcess.length} of ${scenes.length} total):
    ${scenesContent}
    
    Analyze this storyboard project comprehensively. Provide detailed feedback on pacing, character development, plot structure, and dialogue quality.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pacing: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['score', 'issues', 'suggestions']
            },
            characterDevelopment: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['score', 'issues', 'suggestions']
            },
            plotHoles: {
              type: Type.OBJECT,
              properties: {
                found: { type: Type.BOOLEAN },
                issues: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['found', 'issues']
            },
            structure: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                analysis: { type: Type.STRING },
                suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['score', 'analysis', 'suggestions']
            },
            dialogue: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER },
                issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['score', 'issues', 'suggestions']
            }
          },
          required: ['pacing', 'characterDevelopment', 'plotHoles', 'structure', 'dialogue']
        }
      }
    });

    return safeParseJSON<{
      pacing: { score: number; issues: string[]; suggestions: string[] };
      characterDevelopment: { score: number; issues: string[]; suggestions: string[] };
      plotHoles: { found: boolean; issues: string[] };
      structure: { score: number; analysis: string; suggestions: string[] };
      dialogue: { score: number; issues: string[]; suggestions: string[] };
    }>(
      response.text,
      {
        pacing: { score: 0, issues: [], suggestions: [] },
        characterDevelopment: { score: 0, issues: [], suggestions: [] },
        plotHoles: { found: false, issues: [] },
        structure: { score: 0, analysis: 'Analysis failed', suggestions: [] },
        dialogue: { score: 0, issues: [], suggestions: [] }
      }
    );
  } catch (error: any) {
    console.error("Error analyzing story:", error);
    throw error;
  }
};

/**
 * Generates hashtags and captions for an episode
 */
export const generateEpisodeContent = async (
  episodeTitle: string,
  episodeDescription: string,
  projectContext: StoryContext,
  userId?: number
): Promise<{ hashtags: string[]; caption: string }> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a social media content creator for film/TV projects.
  Generate engaging hashtags and captions for an episode.
  
  Return:
  - hashtags: Array of 10-15 relevant hashtags (mix of genre, themes, episode-specific)
  - caption: Engaging 2-3 sentence caption for social media (Instagram/Twitter style)
  
  Make it engaging, use emojis appropriately, and include relevant film/TV hashtags.`;

  const prompt = `
    PROJECT:
    Title: ${projectContext.title || 'Untitled'}
    Genre: ${projectContext.genre || 'General'}
    
    EPISODE:
    Title: ${episodeTitle}
    Description: ${episodeDescription}
    
    Generate hashtags and caption for this episode.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            caption: { type: Type.STRING }
          },
          required: ['hashtags', 'caption']
        }
      }
    });

    return safeParseJSON<{ hashtags: string[]; caption: string }>(
      response.text,
      { hashtags: [], caption: '' }
    );
  } catch (error: any) {
    console.error("Error generating episode content:", error);
    throw error;
  }
};

/**
 * Generate simplified comic book content from scenes
 * Removes technical details, focuses on dialogues, tone, and visual storytelling
 */
export const generateComicContent = async (
  projectContext: StoryContext,
  scenes: Scene[],
  userId?: number,
  coverImageId?: string
): Promise<{ comicContent: string; htmlContent: string }> => {
  const ai = await getAIClient(userId);

  const systemInstruction = `You are a professional comic book writer and artist.
  Transform film/TV scenes into comic book format.
  
  CRITICAL FORMATTING RULES - FOLLOW EXACTLY:
  1. NEVER write "comic-panel-number", "SFX:", "NARRATION:", ">", or any formatting markers as literal text
  2. REMOVE all technical camera details (lens, angle, movement, zoom, etc.)
  3. REMOVE all production notes and technical specifications
  4. FOCUS on:
     - Dialogue with emotional tone indicators (whispered, shouted, sarcastic, etc.)
     - Visual descriptions that paint a picture
     - Character emotions and expressions
     - Action and movement in simple terms
     - Panel-by-panel storytelling
  
  5. Format each scene EXACTLY like this example (NO extra text, NO markers, NO prefixes):
     
     Scene 1 (SEQ #01):
     
     PANEL 1
     The hero stands at the edge of the rooftop, city lights twinkling below. Rain streaks down his face.
     
     Hero (determined): "This ends tonight."
     
     WHOOSH!
     
     PANEL 2
     The hero leaps into action, cape billowing behind him.
     
     BANG!
     
     And so, the legend begins...
     
     Scene 2 (SEQ #02):
     PANEL 1
     [Next scene content]
  
  6. FORMATTING RULES - STRICTLY FOLLOW:
     - Scene headers: "Scene [number] ([Scene ID]):" on its own line - NO other text
     - Panel markers: "PANEL [number]" on its own line - NO quotes, NO ">", NO other text
     - Sound effects: Just the effect in ALL CAPS on its own line (e.g., "WHOOSH!" "BANG!") - NO "SFX:" prefix
     - Narration: Plain descriptive text, no prefix, on its own line - NO "NARRATION:" prefix
     - Dialogue: "[Character] (tone): \"[dialogue]\""
     - Visual descriptions: Plain text describing what we see
  
  7. ABSOLUTELY FORBIDDEN - DO NOT WRITE:
     - "comic-panel-number" as text anywhere
     - "SFX:" before sound effects
     - "NARRATION:" before narration
     - ">" symbols anywhere
     - Quotes around panel numbers
     - Any formatting markers or prefixes
  
  8. Keep it engaging and visual, like a real comic book page.
  9. Each scene should have 2-5 panels depending on complexity.
  10. Be descriptive but concise - paint the picture with words.
  11. Write clean, simple text - no formatting markers, no prefixes, just content.`;

  // Prepare scene data (simplified, no technical details)
  const scenesData = scenes.map((scene, index) => ({
    sequence: index + 1,
    sceneId: scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`,
    visualDirection: scene.enhancedPrompt,
    dialogue: scene.directorSettings.dialogue || '',
    context: scene.contextSummary || ''
  }));

  const prompt = `
    PROJECT:
    Title: ${projectContext.title || 'Untitled'}
    Genre: ${projectContext.genre || 'General'}
    Plot: ${projectContext.plotSummary || ''}
    Characters: ${projectContext.characters || ''}
    
    SCENES TO CONVERT:
    ${scenesData.map(s => `
      Scene ${s.sequence} (${s.sceneId}):
      Visual: ${s.visualDirection.substring(0, 500)}
      ${s.dialogue ? `Dialogue: "${s.dialogue}"` : ''}
      ${s.context ? `Context: ${s.context}` : ''}
    `).join('\n---\n')}
    
    Convert these scenes into comic book format. Remove all technical details.
    Focus on visual storytelling, dialogue with tone, and comic book conventions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8, // More creative
        maxOutputTokens: 8000
      }
    });

    const comicContent = response.text;
    
    // Generate HTML version with comic styling
    const htmlContent = await generateComicHTML(projectContext, comicContent, scenes, coverImageId);

    return { comicContent, htmlContent };
  } catch (error: any) {
    console.error("Error generating comic content:", error);
    throw error;
  }
};

/**
 * Generate HTML version of comic content with DC/Marvel styling
 * Includes scene images and proper scene organization
 */
async function generateComicHTML(
  projectContext: StoryContext,
  comicContent: string,
  scenes: Scene[],
  coverImageId?: string
): Promise<string> {
  const { getPool } = await import('../db/index.js');
  const pool = getPool();
  // Use CORS_ORIGIN for frontend URL, or construct from API_URL
  // CORS_ORIGIN can be comma-separated, so take the first one
  let API_BASE_URL = process.env.CORS_ORIGIN || process.env.API_URL || 'http://localhost:5000';
  if (API_BASE_URL.includes(',')) {
    // Take the first origin if multiple are provided
    API_BASE_URL = API_BASE_URL.split(',')[0].trim();
  }
  const baseUrl = API_BASE_URL.replace('/api', '').replace(/\/$/, ''); // Remove trailing slash
  
  // Fetch images for all scenes
  const sceneImagesMap = new Map<string, any[]>();
  for (const scene of scenes) {
    try {
      const [media] = await pool.query(
        'SELECT * FROM media WHERE scene_id = ? ORDER BY is_primary DESC, display_order ASC, created_at ASC',
        [scene.id]
      ) as [any[], any];
      if (Array.isArray(media) && media.length > 0) {
        sceneImagesMap.set(scene.id, media);
      }
    } catch (error) {
      console.error(`Failed to fetch media for scene ${scene.id}:`, error);
    }
  }
  
  // Clean and convert comic content to HTML
  let html = comicContent;
  
  // Remove unwanted markers and text patterns
  html = html.replace(/"comic-panel-number"/gi, '');
  html = html.replace(/">/g, '');
  html = html.replace(/^">/gm, '');
  html = html.replace(/SFX:\s*/gi, '');
  html = html.replace(/NARRATION:\s*/gi, '');
  html = html.replace(/S\s*cene/gi, 'Scene');
  html = html.replace(/S\s*cene/gi, 'Scene'); // Fix broken scene headers
  html = html.replace(/\s+Scene/gi, ' Scene'); // Fix spacing issues
  
  // Remove standalone "SFX:" or "NARRATION:" lines
  html = html.replace(/^SFX:\s*$/gim, '');
  html = html.replace(/^NARRATION:\s*$/gim, '');
  
  // Fix duplicated scene headers (SSCCEENNEE -> Scene)
  html = html.replace(/S{2,}C{2,}E{2,}N{2,}E{2,}/gi, 'Scene');
  html = html.replace(/([SCEN])\1{2,}/gi, '$1'); // Remove duplicate letters in scene headers
  
  // Remove scene headers that appear in the middle of content (they should only be at the start)
  // This handles cases where Gemini outputs scene headers in the wrong places
  html = html.replace(/\n(Scene\s+\d+\s*\([^)]+\):)\s*\n(?=PANEL)/gi, '\n');
  
  // Split into scenes
  const sceneSections = html.split(/(?=Scene\s+\d+)/i);
  let finalHTML = '';
  
  for (let sceneIdx = 0; sceneIdx < sceneSections.length; sceneIdx++) {
    const sceneSection = sceneSections[sceneIdx].trim();
    if (!sceneSection) continue;
    
    // Extract scene number and ID from the FIRST occurrence only
    const sceneMatch = sceneSection.match(/Scene\s+(\d+)\s*\(([^)]+)\)/i);
    if (!sceneMatch) continue;
    
    const sceneNum = sceneMatch[1];
    const sceneId = sceneMatch[2].trim();
    const sceneIndex = parseInt(sceneNum) - 1;
    const currentScene = sceneIndex >= 0 && sceneIndex < scenes.length ? scenes[sceneIndex] : null;
    
    // Start scene section
    finalHTML += `<div class="comic-scene-section">`;
    finalHTML += `<div class="comic-scene-header">Scene ${sceneNum} (${sceneId})</div>`;
    
    // Get scene image for integration into panels (prefer ImageKit)
    let sceneImageUrl: string | null = null;
    if (currentScene) {
      const sceneMedia = sceneImagesMap.get(currentScene.id);
      if (sceneMedia && sceneMedia.length > 0) {
        const primaryImage = sceneMedia.find(img => img.is_primary) || sceneMedia[0];
        // Prefer ImageKit URLs, fallback to local
        if (primaryImage.imagekit_url) {
          sceneImageUrl = primaryImage.imagekit_url;
        } else if (primaryImage.imagekit_thumbnail_url) {
          sceneImageUrl = primaryImage.imagekit_thumbnail_url;
        } else {
          // Fallback to local path
          let localPath = primaryImage.file_path || primaryImage.thumbnail_path;
          if (localPath && !localPath.startsWith('http')) {
            const filePath = localPath.startsWith('/') ? localPath : `/${localPath}`;
            sceneImageUrl = `${baseUrl}${filePath}`;
          }
        }
      }
    }
    
    // Remove the scene header from the content (we already added it above)
    let cleanedSection = sceneSection.replace(/Scene\s+\d+\s*\([^)]+\):\s*/i, '');
    
    // Process panels in this scene - organize into comic book pages
    const panelSections = cleanedSection.split(/(?=PANEL\s*\d+)/i);
    const panels: Array<{ num: number; content: string; hasImage: boolean }> = [];
    
    for (const panelSection of panelSections) {
      const panelMatch = panelSection.match(/PANEL\s*(\d+)/i);
      if (!panelMatch) continue;
      
      const panelNum = parseInt(panelMatch[1]);
      // Extract content after panel marker
      let panelContent = panelSection.replace(/PANEL\s*\d+/i, '').trim();
      
      // Remove scene headers that appear in panel content (they shouldn't be there)
      panelContent = panelContent.replace(/Scene\s+\d+\s*\([^)]+\):\s*/gi, '');
      panelContent = panelContent.replace(/SSCCEENNEE\s+\d+/gi, ''); // Remove duplicated scene headers
      panelContent = panelContent.replace(/\(\([^)]+\)\)/g, ''); // Remove duplicate scene IDs like ((SCENE_003))
      
      // Remove any remaining unwanted markers (aggressive cleaning)
      panelContent = panelContent.replace(/"comic-panel-number"/gi, '');
      panelContent = panelContent.replace(/comic-panel-number/gi, '');
      panelContent = panelContent.replace(/SFX:\s*/gi, '');
      panelContent = panelContent.replace(/NARRATION:\s*/gi, '');
      panelContent = panelContent.replace(/^">/gm, '');
      panelContent = panelContent.replace(/">/g, '');
      panelContent = panelContent.replace(/^SFX:\s*$/gim, '');
      panelContent = panelContent.replace(/^NARRATION:\s*$/gim, '');
      panelContent = panelContent.replace(/^SFX:\s*SILENCE$/gim, '');
      panelContent = panelContent.replace(/^SILENCE$/gim, '');
      
      // Fix broken dialogue patterns like "speech-bubble data-tone="
      panelContent = panelContent.replace(/"speech-bubble\s+data-tone="\s*"([^"]*)"\s*([^"]*)/gi, '');
      panelContent = panelContent.replace(/"speech-bubble\s+data-tone="\s*([^"]*)"\s*([^"]*)/gi, '');
      panelContent = panelContent.replace(/speech-bubble\s+data-tone="\s*([^"]*)"\s*([^"]*)/gi, '');
      
      // Process dialogue with tone (handle multiline and broken formats)
      // First, handle the broken format like: "whispering, chilling>Kaalak:" "dialogue"
      panelContent = panelContent.replace(/"([^"]+)\s*>\s*([A-Z][a-zA-Z\s]+):"\s*"([^"]*)"([^"]*)/g, 
        (match, tone, char, dialogue, rest) => {
          const fullDialogue = dialogue + (rest ? rest.replace(/"/g, '').trim() : '');
          return `<div class="speech-bubble" data-tone="${tone.trim()}"><strong>${char.trim()}</strong>: "${fullDialogue.trim()}"</div>`;
        });
      
      // Then handle normal format: Character (tone): "dialogue"
      panelContent = panelContent.replace(/([A-Z][a-zA-Z\s]+)\s*\(([^)]+)\):\s*"([^"]*)"([^"]*)/g, 
        (match, char, tone, dialogue, rest) => {
          // Handle broken dialogue that might be split
          const fullDialogue = dialogue + (rest && !rest.includes('"') ? rest.replace(/"/g, '').trim() : '');
          if (fullDialogue.trim()) {
            return `<div class="speech-bubble" data-tone="${tone.trim()}"><strong>${char.trim()}</strong>: "${fullDialogue.trim()}"</div>`;
          }
          return match;
        });
      
      // Handle dialogue that's split across lines like: "whispering, chilling>Kaalak:" on one line, then dialogue on next
      const lines = panelContent.split('\n');
      let processedLines: string[] = [];
      let pendingDialogue: { tone: string; char: string } | null = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if this line has a dialogue start pattern
        const dialogueStartMatch = line.match(/"([^"]+)\s*>\s*([A-Z][a-zA-Z\s]+):"\s*$/);
        if (dialogueStartMatch) {
          pendingDialogue = { tone: dialogueStartMatch[1], char: dialogueStartMatch[2] };
          continue; // Skip this line, we'll use the next one
        }
        
        // If we have pending dialogue and this line looks like dialogue content
        if (pendingDialogue && line.match(/^"[^"]*"/)) {
          const dialogueMatch = line.match(/"([^"]*)"/);
          if (dialogueMatch) {
            processedLines.push(`<div class="speech-bubble" data-tone="${pendingDialogue.tone.trim()}"><strong>${pendingDialogue.char.trim()}</strong>: "${dialogueMatch[1].trim()}"</div>`);
            pendingDialogue = null;
            continue;
          }
        }
        
        // Reset pending dialogue if we hit a new panel or scene marker
        if (line.match(/^(PANEL|Scene)/i)) {
          pendingDialogue = null;
        }
        
        processedLines.push(line);
      }
      
      panelContent = processedLines.join('\n');
      
      // Process simple dialogue (quoted text) - handle broken quotes, but skip if already processed
      panelContent = panelContent.replace(/"([^"]*)"([^"]*)/g, (match, part1, part2) => {
        // Skip if it's already in a speech bubble
        if (match.includes('speech-bubble')) return match;
        // Skip if it's a sound effect (all caps)
        if (part1.match(/^[A-Z\s!.,-]+$/)) return match;
        if (part1.length > 5 && !part1.includes('(') && !part1.match(/^[A-Z\s!]+$/)) {
          const fullDialogue = part1 + (part2 ? part2.replace(/"/g, '').trim() : '');
          if (fullDialogue.length > 5 && !panelContent.includes(`<div class="speech-bubble">"${fullDialogue}"</div>`)) {
            return `<div class="speech-bubble">"${fullDialogue.trim()}"</div>`;
          }
        }
        return match;
      });
      
      // Process sound effects - handle patterns like ">WHOOSH!" or standalone caps
      panelContent = panelContent.replace(/>([A-Z][A-Z\s!.,-]{2,20}[!?.]?)/g, '<div class="sound-effect">$1</div>');
      panelContent = panelContent.replace(/\b([A-Z]{3,}[A-Z\s!.,-]{0,20}[!?.]?)\b/g, (match) => {
        const trimmed = match.trim();
        // Skip if already processed or if it's a word like "PANEL", "SCENE", etc.
        if (trimmed.length >= 3 && trimmed.length <= 25 && 
            /^[A-Z\s!.,?-]+$/.test(trimmed) && 
            !trimmed.match(/^(PANEL|SCENE|SFX|NARRATION)$/i) &&
            !panelContent.includes(`<div class="sound-effect">${trimmed}</div>`)) {
          return `<div class="sound-effect">${trimmed}</div>`;
        }
        return match;
      });
      
      // Process lines to identify narration and captions
      const contentLines = panelContent.split('\n');
      const finalProcessedLines: string[] = [];
      
      for (const line of contentLines) {
        const trimmed = line.trim();
        
        // Skip empty lines
        if (!trimmed) {
          finalProcessedLines.push('');
          continue;
        }
        
        // Skip if already converted to HTML
        if (trimmed.startsWith('<div') || trimmed.startsWith('</div>')) {
          finalProcessedLines.push(line);
          continue;
        }
        
        // Skip if it's dialogue, sound effect, or panel marker
        if (trimmed.includes('speech-bubble') || trimmed.includes('sound-effect') || trimmed.match(/^PANEL/i)) {
          finalProcessedLines.push(line);
          continue;
        }
        
        // Remove scene headers that appear in panel content
        if (trimmed.match(/^Scene\s+\d+/i) || trimmed.match(/^SSCCEENNEE/i)) {
          continue; // Skip scene headers in panel content
        }
        
        // Skip if it's just "SILENCE" or similar standalone text
        if (trimmed.match(/^(SILENCE|Silence|silence)$/i)) {
          continue;
        }
        
        // Skip if it starts with unwanted patterns
        if (trimmed.match(/^(SFX|NARRATION|comic-panel-number)/i)) {
          continue;
        }
        
        // Remove broken HTML attributes that appear as text
        if (trimmed.match(/^(speech-bubble|data-tone=)/i)) {
          continue;
        }
        
        // Identify narration (long descriptive text, often at end of panels)
        if (trimmed.length > 40 && !trimmed.includes('"') && !trimmed.match(/^[A-Z][a-z]+\s*\(/)) {
          // Check if it's descriptive/narrative text
          if (!trimmed.match(/^[A-Z][A-Z\s!]+$/) && 
              !trimmed.match(/^[A-Z][a-z]+\s+(is|stands|looks|sees|does|goes)/i) &&
              (trimmed.match(/[.!?]$/) || trimmed.length > 60)) {
            finalProcessedLines.push(`<div class="comic-narration">${trimmed}</div>`);
            continue;
          }
        }
        
        // Convert long descriptive lines to captions
        if (trimmed.length > 25 && !trimmed.includes('"') && !trimmed.includes('<div')) {
          if (!trimmed.match(/^[A-Z][a-z]+\s*\(/) && 
              !trimmed.match(/^[A-Z]{2,}[A-Z\s!]+$/) &&
              !trimmed.match(/^(PANEL|SCENE)/i)) {
            finalProcessedLines.push(`<div class="comic-caption">${trimmed}</div>`);
            continue;
          }
        }
        
        // Keep other lines as-is (but clean them)
        const cleanedLine = trimmed
          .replace(/"comic-panel-number"/gi, '')
          .replace(/comic-panel-number/gi, '')
          .replace(/SFX:\s*/gi, '')
          .replace(/NARRATION:\s*/gi, '')
          .replace(/^">/g, '')
          .replace(/">/g, '');
        
        if (cleanedLine.trim()) {
          finalProcessedLines.push(cleanedLine);
        }
      }
      
      panelContent = finalProcessedLines.join('\n');
      
      // Final cleanup pass
      panelContent = panelContent.replace(/"comic-panel-number"/gi, '');
      panelContent = panelContent.replace(/comic-panel-number/gi, '');
      panelContent = panelContent.replace(/SFX:\s*/gi, '');
      panelContent = panelContent.replace(/NARRATION:\s*/gi, '');
      panelContent = panelContent.replace(/\n{3,}/g, '\n\n'); // Remove excessive blank lines
      
      // Store panel for page layout
      panels.push({
        num: panelNum,
        content: panelContent,
        hasImage: sceneImageUrl !== null && panelNum === 1 // Use image in first panel
      });
    }
    
    // Organize panels into comic book pages (Marvel/DC style)
    // Each page has 2-6 panels in a grid layout
    const panelsPerPage = 4; // 2x2 grid
    for (let pageStart = 0; pageStart < panels.length; pageStart += panelsPerPage) {
      const pagePanels = panels.slice(pageStart, pageStart + panelsPerPage);
      
      // Determine grid layout based on number of panels
      let gridClass = 'comic-page-grid-4'; // Default 2x2
      if (pagePanels.length === 1) {
        gridClass = 'comic-page-grid-1'; // Full page splash
      } else if (pagePanels.length === 2) {
        gridClass = 'comic-page-grid-2'; // 2 columns
      } else if (pagePanels.length === 3) {
        gridClass = 'comic-page-grid-3'; // 2+1 layout
      } else if (pagePanels.length === 5) {
        gridClass = 'comic-page-grid-5'; // 3+2 layout
      } else if (pagePanels.length === 6) {
        gridClass = 'comic-page-grid-6'; // 3x2 layout
      }
      
      finalHTML += `<div class="comic-page ${gridClass}">`;
      
      pagePanels.forEach((panel, idx) => {
        const isFirstPanelOfScene = pageStart === 0 && idx === 0;
        const panelImageUrl = (isFirstPanelOfScene && panel.hasImage && sceneImageUrl) ? sceneImageUrl : null;
        
        finalHTML += `<div class="comic-panel-frame">`;
        
        // Add image if available (integrated into panel, not separate)
        if (panelImageUrl) {
          finalHTML += `<div class="comic-panel-image">
            <img src="${panelImageUrl}" alt="Panel ${panel.num}" class="comic-panel-img" />
          </div>`;
        }
        
        // Panel content
        finalHTML += `<div class="comic-panel-content">${panel.content}</div>`;
        finalHTML += `</div>`; // Close panel-frame
      });
      
      finalHTML += `</div>`; // Close comic-page
    }
    
    finalHTML += `</div>`; // Close scene section
  }
  
  html = finalHTML;
  
  // Final global cleanup
  html = html.replace(/"comic-panel-number"/gi, '');
  html = html.replace(/comic-panel-number/gi, '');
  html = html.replace(/SFX:\s*/gi, '');
  html = html.replace(/NARRATION:\s*/gi, '');
  html = html.replace(/\n{3,}/g, '\n\n');

  // Get cover image - use selected coverImageId if provided, otherwise use first scene's primary image
  let coverImageUrl = '';
  if (coverImageId) {
    // Fetch the specific cover image by ID
    try {
      const [coverMedia] = await pool.query(
        'SELECT * FROM media WHERE id = ? LIMIT 1',
        [coverImageId]
      ) as [any[], any];
      if (Array.isArray(coverMedia) && coverMedia.length > 0) {
        const coverImage = coverMedia[0];
        // Prefer ImageKit URL, fallback to local
        if (coverImage.imagekit_url) {
          coverImageUrl = coverImage.imagekit_url;
        } else if (coverImage.imagekit_thumbnail_url) {
          coverImageUrl = coverImage.imagekit_thumbnail_url;
        } else {
          const localPath = coverImage.file_path || coverImage.thumbnail_path;
          if (localPath) {
            const filePath = localPath.startsWith('/') ? localPath : `/${localPath}`;
            coverImageUrl = `${baseUrl}${filePath}`;
          }
        }
      }
    } catch (error) {
      console.error(`Failed to fetch cover image ${coverImageId}:`, error);
    }
  }
  
  // Fallback to first scene's primary image if no cover image selected or found
  if (!coverImageUrl && scenes.length > 0) {
    const firstScene = scenes[0];
    const firstSceneMedia = sceneImagesMap.get(firstScene.id);
    if (firstSceneMedia && firstSceneMedia.length > 0) {
      const coverImage = firstSceneMedia.find(img => img.is_primary) || firstSceneMedia[0];
      // Prefer ImageKit URL, fallback to local
      if (coverImage.imagekit_url) {
        coverImageUrl = coverImage.imagekit_url;
      } else if (coverImage.imagekit_thumbnail_url) {
        coverImageUrl = coverImage.imagekit_thumbnail_url;
      } else {
        const localPath = coverImage.file_path || coverImage.thumbnail_path;
        if (localPath) {
          const filePath = localPath.startsWith('/') ? localPath : `/${localPath}`;
          coverImageUrl = `${baseUrl}${filePath}`;
        }
      }
    }
  }
  
  
  // Generate cover page HTML
  const coverPage = `
    <div class="comic-cover-page">
      <div class="cover-image-container">
        ${coverImageUrl ? `<img src="${coverImageUrl}" alt="Cover" class="cover-image" />` : ''}
        <div class="cover-overlay"></div>
      </div>
      <div class="cover-content">
        <div class="cover-title">${projectContext.title || 'Untitled'}</div>
        ${projectContext.genre ? `<div class="cover-genre">${projectContext.genre}</div>` : ''}
        ${projectContext.plotSummary ? `<div class="cover-tagline">${projectContext.plotSummary.substring(0, 150)}${projectContext.plotSummary.length > 150 ? '...' : ''}</div>` : ''}
      </div>
    </div>
  `;
  
  // Wrap in comic book HTML structure
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${projectContext.title} - Comic Book</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&family=Creepster&display=swap');
    
    @media print {
      @page {
        margin: 0;
        size: A4;
      }
      .comic-cover-page {
        page-break-after: always;
        height: 100vh;
      }
      .comic-page {
        page-break-after: always;
      }
      .comic-scene-section {
        page-break-inside: avoid;
      }
    }
    
    * {
      box-sizing: border-box;
    }
    
    /* 90s Comic Book Paper Texture */
    @keyframes paperGrain {
      0%, 100% { background-position: 0% 0%; }
      50% { background-position: 100% 100%; }
    }
    
    body {
      font-family: 'Comic Neue', cursive, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background: #e8d5b7; /* Newsprint tan */
      background-image: 
        radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0),
        radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 0);
      background-size: 20px 20px, 40px 40px;
      background-position: 0 0, 10px 10px;
      animation: paperGrain 20s linear infinite;
      position: relative;
    }
    
    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        repeating-linear-gradient(
          0deg,
          rgba(0,0,0,0.03) 0px,
          transparent 1px,
          transparent 2px,
          rgba(0,0,0,0.03) 3px
        ),
        repeating-linear-gradient(
          90deg,
          rgba(0,0,0,0.03) 0px,
          transparent 1px,
          transparent 2px,
          rgba(0,0,0,0.03) 3px
        );
      pointer-events: none;
      z-index: 1000;
      opacity: 0.4;
    }
    
    /* COVER PAGE STYLING - 90s Style */
    .comic-cover-page {
      width: 100%;
      min-height: 100vh;
      position: relative;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #8B0000 0%, #DC143C 30%, #FF4500 60%, #FF6347 100%);
      overflow: hidden;
      border: 8px solid #000;
      box-shadow: 
        inset 0 0 100px rgba(0,0,0,0.5),
        0 0 50px rgba(0,0,0,0.8),
        0 20px 60px rgba(0,0,0,0.6);
      /* Halftone dot pattern overlay */
      background-image: 
        radial-gradient(circle, rgba(0,0,0,0.2) 1px, transparent 1px),
        linear-gradient(135deg, #8B0000 0%, #DC143C 30%, #FF4500 60%, #FF6347 100%);
      background-size: 8px 8px, 100% 100%;
    }
    
    .cover-image-container {
      position: relative;
      width: 100%;
      height: 70vh;
      overflow: hidden;
    }
    
    .cover-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: 
        brightness(0.85) 
        contrast(1.4) 
        saturate(1.3)
        sepia(0.1);
      /* Add halftone effect */
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      position: relative;
    }
    
    .cover-image::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 2px 2px, rgba(0,0,0,0.15) 1px, transparent 0),
        radial-gradient(circle at 6px 6px, rgba(0,0,0,0.1) 1px, transparent 0);
      background-size: 4px 4px, 12px 12px;
      pointer-events: none;
      mix-blend-mode: multiply;
    }
    
    .cover-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%);
    }
    
    .cover-content {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 40px;
      background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 100%);
      z-index: 10;
    }
    
    .cover-title {
      font-family: 'Bangers', cursive;
      font-size: 5.5em;
      text-transform: uppercase;
      letter-spacing: 8px;
      color: #FFD700;
      text-shadow: 
        6px 6px 0px #000, 
        8px 8px 0px #8B0000,
        12px 12px 0px rgba(0,0,0,0.8),
        0 0 30px rgba(255,215,0,0.6),
        0 0 60px rgba(255,215,0,0.3);
      margin-bottom: 20px;
      line-height: 1.1;
      transform: rotate(-1deg);
      filter: drop-shadow(4px 4px 0px #000);
      -webkit-text-stroke: 2px #000;
      text-stroke: 2px #000;
    }
    
    .cover-genre {
      font-family: 'Bangers', cursive;
      font-size: 2em;
      color: #FF6B6B;
      text-shadow: 2px 2px 0px #000;
      margin-bottom: 15px;
      letter-spacing: 3px;
    }
    
    .cover-tagline {
      font-family: 'Comic Neue', cursive;
      font-size: 1.3em;
      color: #fff;
      text-shadow: 2px 2px 0px #000;
      font-style: italic;
      line-height: 1.4;
    }
    
    /* MAIN CONTENT - 90s Comic Style */
    .comic-content {
      max-width: 1000px;
      margin: 0 auto;
      padding: 30px 20px;
      background: #f5e6d3; /* Slightly off-white newsprint */
      background-image: 
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0,0,0,0.02) 2px,
          rgba(0,0,0,0.02) 4px
        );
      border-left: 3px solid #000;
      border-right: 3px solid #000;
      box-shadow: 
        inset 0 0 50px rgba(0,0,0,0.1),
        0 0 20px rgba(0,0,0,0.3);
      position: relative;
    }
    
    .comic-content::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 1px 1px, rgba(0,0,0,0.08) 1px, transparent 0);
      background-size: 3px 3px;
      pointer-events: none;
      opacity: 0.6;
    }
    
    .comic-panel-number {
      font-family: 'Bangers', cursive;
      font-size: 1.8em;
      color: #1E88E5;
      text-shadow: 2px 2px 0px #000;
      margin: 30px 0 15px;
      border-bottom: 4px solid #000;
      padding-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    /* AUTHENTIC 90s SPEECH BUBBLES */
    .speech-bubble {
      background: #FFFFFF;
      border: 5px solid #000;
      border-radius: 30px;
      padding: 18px 25px;
      margin: 20px auto;
      position: relative;
      font-family: 'Comic Neue', cursive;
      font-size: 1.4em;
      font-weight: bold;
      color: #000;
      box-shadow: 
        5px 5px 0px rgba(0,0,0,0.4),
        inset 0 0 0 3px #fff,
        0 0 10px rgba(0,0,0,0.2);
      max-width: 75%;
      line-height: 1.5;
      word-wrap: break-word;
      transform: rotate(-0.5deg);
      filter: drop-shadow(2px 2px 0px #000);
      /* Halftone effect */
      background-image: 
        radial-gradient(circle at 2px 2px, rgba(0,0,0,0.05) 1px, transparent 0);
      background-size: 4px 4px;
    }
    
    .speech-bubble::before {
      content: '';
      position: absolute;
      bottom: -20px;
      left: 25%;
      width: 0;
      height: 0;
      border: 20px solid transparent;
      border-top-color: #000;
      border-bottom: none;
      z-index: 1;
    }
    
    .speech-bubble::after {
      content: '';
      position: absolute;
      bottom: -16px;
      left: 25%;
      width: 0;
      height: 0;
      border: 18px solid transparent;
      border-top-color: #FFFFFF;
      border-bottom: none;
      z-index: 2;
    }
    
    .thought-bubble {
      background: #fff;
      border: 3px dashed #000;
      border-radius: 50px;
      padding: 15px 20px;
      margin: 15px auto;
      font-style: italic;
      color: #333;
      position: relative;
      max-width: 70%;
    }
    
    .thought-bubble::before {
      content: '○ ○ ○';
      position: absolute;
      bottom: -25px;
      left: 20%;
      font-size: 0.8em;
      color: #000;
    }
    
    .sound-effect {
      font-family: 'Bangers', cursive;
      font-size: 5em;
      color: #FF0000;
      text-shadow: 
        6px 6px 0px #000,
        8px 8px 0px #8B0000,
        10px 10px 0px rgba(0,0,0,0.5),
        0 0 20px rgba(255,0,0,0.5);
      text-align: center;
      margin: 30px 0;
      transform: rotate(-12deg) scale(1.2) skewX(-5deg);
      display: inline-block;
      letter-spacing: 5px;
      font-weight: normal;
      -webkit-text-stroke: 3px #000;
      text-stroke: 3px #000;
      filter: drop-shadow(4px 4px 0px #000) brightness(1.2);
      position: relative;
      z-index: 10;
    }
    
    .comic-caption {
      font-family: 'Comic Neue', cursive;
      font-size: 1.1em;
      color: #333;
      font-style: italic;
      margin: 15px 0;
      padding: 10px 20px;
      background: rgba(255,255,255,0.9);
      border-left: 5px solid #000;
      box-shadow: 2px 2px 0px rgba(0,0,0,0.2);
    }
    
    .comic-narration {
      font-family: 'Comic Neue', cursive;
      font-size: 1.2em;
      color: #1a1a1a;
      font-style: italic;
      margin: 20px 0;
      padding: 15px 20px;
      background: rgba(255, 255, 255, 0.95);
      border: 3px solid #000;
      border-left: 6px solid #DC143C;
      box-shadow: 4px 4px 0px rgba(0,0,0,0.2);
      border-radius: 5px;
    }
    
    .comic-scene-section {
      margin: 50px 0;
      page-break-inside: avoid;
    }
    
    .comic-scene-header {
      font-family: 'Bangers', cursive;
      font-size: 3em;
      text-transform: uppercase;
      letter-spacing: 5px;
      background: linear-gradient(135deg, #DC143C 0%, #FF4500 50%, #FF6347 100%);
      color: #FFD700;
      text-shadow: 
        5px 5px 0px #000,
        7px 7px 0px #8B0000,
        10px 10px 0px rgba(0,0,0,0.8);
      margin: 50px 0 35px;
      padding: 25px 35px;
      border: 8px solid #000;
      border-top: 10px solid #FFD700;
      border-bottom: 10px solid #FFD700;
      box-shadow: 
        12px 12px 0px rgba(0,0,0,0.6),
        inset 0 0 0 3px rgba(255,215,0,0.4),
        0 0 30px rgba(255,69,0,0.4);
      text-align: center;
      position: relative;
      transform: rotate(-0.5deg);
      -webkit-text-stroke: 2px #000;
      text-stroke: 2px #000;
      /* Halftone overlay */
      background-image: 
        radial-gradient(circle, rgba(0,0,0,0.2) 1px, transparent 1px),
        linear-gradient(135deg, #DC143C 0%, #FF4500 50%, #FF6347 100%);
      background-size: 6px 6px, 100% 100%;
    }
    
    /* COMIC BOOK PAGE LAYOUTS - 90s Style */
    .comic-page {
      width: 100%;
      min-height: 100vh;
      display: grid;
      gap: 20px;
      padding: 25px;
      background: #f5e6d3; /* Newsprint color */
      background-image: 
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0,0,0,0.03) 2px,
          rgba(0,0,0,0.03) 4px
        ),
        radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0);
      background-size: 100% 100%, 4px 4px;
      page-break-after: always;
      margin-bottom: 25px;
      border: 4px solid #000;
      box-shadow: 
        inset 0 0 60px rgba(0,0,0,0.15),
        0 0 30px rgba(0,0,0,0.4);
      position: relative;
    }
    
    .comic-page::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 0);
      background-size: 5px 5px;
      pointer-events: none;
      opacity: 0.5;
    }
    
    .comic-page-grid-1 {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr;
    }
    
    .comic-page-grid-2 {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr;
    }
    
    .comic-page-grid-3 {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
    }
    
    .comic-page-grid-3 .comic-panel-frame:first-child {
      grid-column: 1 / -1;
    }
    
    .comic-page-grid-4 {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
    }
    
    .comic-page-grid-5 {
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-rows: 1fr 1fr;
    }
    
    .comic-page-grid-5 .comic-panel-frame:first-child {
      grid-column: 1 / -1;
    }
    
    .comic-page-grid-6 {
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-rows: 1fr 1fr;
    }
    
    /* PANEL FRAMES - 90s Authentic Comic Style */
    .comic-panel-frame {
      position: relative;
      background: #fff;
      border: 6px solid #000;
      border-radius: 0;
      padding: 8px;
      overflow: hidden;
      box-shadow: 
        6px 6px 0px rgba(0,0,0,0.5),
        inset 0 0 0 2px rgba(255,255,255,0.3),
        0 0 15px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      transform: rotate(0.3deg);
      /* Halftone texture */
      background-image: 
        radial-gradient(circle at 1px 1px, rgba(0,0,0,0.08) 1px, transparent 0);
      background-size: 3px 3px;
    }
    
    .comic-panel-frame:nth-child(even) {
      transform: rotate(-0.3deg);
    }
    
    .comic-panel-image {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 0;
      overflow: hidden;
    }
    
    .comic-panel-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.95;
      filter: 
        contrast(1.3) 
        saturate(1.2) 
        brightness(0.95)
        sepia(0.05);
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      position: relative;
    }
    
    .comic-panel-img::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        radial-gradient(circle at 2px 2px, rgba(0,0,0,0.12) 1px, transparent 0);
      background-size: 4px 4px;
      pointer-events: none;
      mix-blend-mode: multiply;
      opacity: 0.7;
    }
    
    .comic-panel-content {
      position: relative;
      z-index: 1;
      padding: 12px;
      background: rgba(255, 255, 255, 0.92);
      border-radius: 0;
      border: 2px solid rgba(0,0,0,0.2);
      min-height: 100px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
      /* Subtle halftone */
      background-image: 
        radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0);
      background-size: 2px 2px;
    }
    
    .comic-image-panel {
      margin: 30px 0;
      page-break-inside: avoid;
      background: #FFFFFF;
      border: 6px solid #000;
      border-top: 10px solid #FFD700;
      border-radius: 5px;
      box-shadow: 12px 12px 0px rgba(0,0,0,0.5), 
                  18px 18px 0px rgba(0,0,0,0.2),
                  0 0 0 3px #FFD700;
      overflow: hidden;
      position: relative;
      padding: 0;
    }
    
    .comic-image {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
    }
    
    .comic-panel-content p {
      margin: 10px 0;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  ${coverPage}
  <div class="comic-content">
    ${html}
  </div>
</body>
</html>
  `;
}

