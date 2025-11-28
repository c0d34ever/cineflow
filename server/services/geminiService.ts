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
  } catch (error) {
    console.error("Error generating story:", error);
    return {
      title: "Untitled Project",
      genre: "Unknown",
      plotSummary: "Could not generate plot.",
      characters: "Unknown",
      initialContext: ""
    };
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
  } catch (error) {
    console.error("Error suggesting next scene:", error);
    return "";
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
  
  **CRITICAL LANGUAGE RULES**:
  1. **INPUT HANDLING**: The user's idea might be in **Hindi**, **Hinglish** (Hindi in English script), or **English**. You must understand all three.
  2. **TECHNICAL OUTPUT (Lens, Angle, Lighting, Movement, Sound)**: MUST be in **ENGLISH**.
  3. **DIALOGUE OUTPUT**:
     - If the user's idea contains dialogue, or if the character context implies it, output the dialogue.
     - **FORMAT MANDATORY**: "Character Name: 'Dialogue'" (e.g., Aryan: "Wait here.", Ghost: "I cannot.")
     - **LANGUAGE**: Use **Hindi (Devanagari)** for Hindi lines. Use English for English lines.
     - Example: Aryan: "हम कहाँ हैं?", Creatures: "Tum quantum state mein ho..."
  
  SPECIFIC INSTRUCTIONS:
  - Lens: Suggest specific focal lengths (e.g. 24mm, 50mm Anamorphic, 85mm Portrait).
  - Lighting: Be descriptive (e.g. "Chiaroscuro high contrast", "Neon-noir rim light", "Overcast soft diffusion").
  - Movement: Suggest specific gear (e.g. "Steadicam", "Dolly Zoom", "Handheld shaky", "Crane down").
  - Zoom: Suggest zoom intensity (e.g. "Slow Push In", "Crash Zoom", "No Zoom").
  - Sound: Suggest layers (e.g. "Heartbeat thumping + Distant sirens", "Wind howling + Crunching snow").
  - Stunts: If action is implied, specify the mechanics (e.g. "Wire-assisted fall", "Squib impact", "High-speed collision").
  - Dialogue: BE PROACTIVE. If characters are interacting, provide the dialogue in the requested format.
  
  Return a JSON object matching the DirectorSettings interface exactly.`;

  const prompt = `
    Movie: ${context.title} (${context.genre})
    Characters: ${context.characters}
    Context so far: ${(prevSceneSummary || context.plotSummary).substring(0, 500)}
    
    User's Idea for Next Scene: "${(rawIdea || "Continue the story naturally from the previous context.").substring(0, 300)}"
    
    Current Style Preference: ${currentSettings.style}
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
            customSceneId: { type: Type.STRING },
            lens: { type: Type.STRING },
            angle: { type: Type.STRING },
            lighting: { type: Type.STRING },
            movement: { type: Type.STRING },
            zoom: { type: Type.STRING },
            sound: { type: Type.STRING },
            dialogue: { type: Type.STRING, description: "Spoken lines. Format: Character: 'Line'." },
            stuntInstructions: { type: Type.STRING },
            physicsFocus: { type: Type.BOOLEAN },
            style: { type: Type.STRING, enum: Object.values(TechnicalStyle) },
            transition: { type: Type.STRING }
          }
        }
      }
    });

    const json = safeParseJSON<Partial<DirectorSettings>>(response.text, {});
    
    // Merge with defaults to ensure safety
    return {
      ...currentSettings,
      ...json,
      // Ensure specific fields are strings and valid
      lens: json.lens || '35mm Prime',
      angle: json.angle || 'Eye Level',
      lighting: json.lighting || 'Cinematic',
      movement: json.movement || 'Static',
      zoom: json.zoom || '',
      sound: json.sound || 'Ambient',
      stuntInstructions: json.stuntInstructions || '',
      dialogue: json.dialogue || '',
      physicsFocus: json.physicsFocus ?? false,
      style: json.style || TechnicalStyle.CINEMATIC,
      transition: json.transition || 'Cut'
    };
  } catch (error) {
    console.error("Error predicting settings:", error);
    return currentSettings;
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
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    return { enhancedPrompt: rawIdea, contextSummary: rawIdea };
  }
};

