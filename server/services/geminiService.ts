import { GoogleGenAI, Type } from "@google/genai";
import { StoryContext, DirectorSettings, TechnicalStyle, Scene } from '../../types';
import dotenv from 'dotenv';
import { getPool } from '../db';

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
  const apiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API key is not set. Please set your API key in user settings or configure GEMINI_API_KEY in environment variables.');
  }
  
  return new GoogleGenAI({ apiKey });
};

/**
 * Helper to safely parse JSON from AI response.
 * Handles markdown code blocks and parsing errors.
 */
const safeParseJSON = <T>(text: string | undefined, fallback: T): T => {
  if (!text) return fallback;
  try {
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Attempt to extract JSON object if surrounded by text
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
       cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleanText) as T;
  } catch (e) {
    console.warn("JSON Parse Warning: output might be truncated or malformed.", e);
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
  
  IMPORTANT: 
  - Keep the plot summary concise (under 150 words).
  - Keep the initial context vivid but brief (under 100 words).
  
  Return a JSON object with:
  - title
  - genre
  - plotSummary
  - characters
  - initialContext: A vivid, visual description of a specific climactic scene or cliffhanger from this story. This allows the user to 'resume' production immediately from this point.`;

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

    return safeParseJSON<Partial<StoryContext>>(response.text, {
      title: "Untitled Project",
      genre: "Unknown",
      plotSummary: "Could not generate plot.",
      characters: "Unknown",
      initialContext: ""
    });
  } catch (error: any) {
    console.error("Error generating story:", error);
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

  // Build scenes content summary
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

