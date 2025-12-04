import { StoryContext, Scene } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Helper to call Gemini API for general content generation
// Uses suggest-next-scene endpoint as a template, but with custom prompt
async function generateContent(prompt: string, storyContext?: StoryContext, scenes?: Scene[]): Promise<string> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // Use suggest-next-scene endpoint with our custom prompt
    const response = await fetch(`${API_BASE_URL}/gemini/suggest-next-scene`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        context: storyContext || { title: 'Prompt Generation', genre: 'General', plotSummary: '', characters: '', initialContext: '' },
        recentScenes: scenes || [],
        customPrompt: prompt // We'll need to modify backend to accept this
      }),
    });
    
    if (!response.ok) {
      // Fallback: try to use enhance-scene-prompt
      const fallbackResponse = await fetch(`${API_BASE_URL}/gemini/enhance-scene-prompt`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          rawIdea: prompt.substring(0, 500),
          context: storyContext || { title: 'Prompt Generation', genre: 'General', plotSummary: '', characters: '', initialContext: '' },
          prevSceneSummary: null,
          settings: { style: 'Cinematic' as any, lens: '35mm', angle: 'Eye Level', lighting: 'Natural', movement: 'Static' }
        }),
      });
      
      if (!fallbackResponse.ok) {
        throw new Error('Failed to generate content');
      }
      
      const fallbackData = await fallbackResponse.json();
      return fallbackData.enhancedPrompt || fallbackData.contextSummary || '';
    }
    
    const data = await response.json();
    return data.suggestion || data.content || data.text || '';
  } catch (error) {
    console.error('Error generating content:', error);
    // Return a helpful error message
    throw new Error(`Failed to generate prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates a detailed character creation prompt based on story context
 */
export async function generateCharacterPrompt(
  storyContext: StoryContext,
  existingCharacters: Array<{ name: string; role?: string }> = [],
  characterHints?: {
    name?: string;
    role?: string;
    purpose?: string;
  }
): Promise<string> {
  const existingCharsList = existingCharacters.length > 0
    ? existingCharacters.map(c => `- ${c.name}${c.role ? ` (${c.role})` : ''}`).join('\n')
    : 'None yet';

  const prompt = `You are a professional character development consultant for a ${storyContext.genre || 'film'} project titled "${storyContext.title || 'Untitled'}".

STORY CONTEXT:
- Genre: ${storyContext.genre || 'General'}
- Plot Summary: ${storyContext.plotSummary || 'Not specified'}
- Characters Mentioned: ${storyContext.characters || 'Not specified'}
- Initial Context: ${storyContext.initialContext || 'Not specified'}

EXISTING CHARACTERS:
${existingCharsList}

${characterHints?.name ? `CHARACTER NAME: ${characterHints.name}` : ''}
${characterHints?.role ? `CHARACTER ROLE: ${characterHints.role}` : ''}
${characterHints?.purpose ? `CHARACTER PURPOSE: ${characterHints.purpose}` : ''}

TASK: Generate a comprehensive, detailed character creation prompt that will help a writer create a fully-developed character. The prompt should include:

1. **Character Name** (if not provided, suggest a culturally appropriate name)
2. **Role in Story** (Protagonist, Antagonist, Supporting, etc.)
3. **Physical Appearance** (detailed description: age, build, features, distinctive traits, clothing style)
4. **Personality Traits** (3-5 key traits with brief explanations)
5. **Background/Backstory** (where they come from, key life events, motivations)
6. **Goals and Motivations** (what they want, why they want it)
7. **Internal Conflicts** (inner struggles, fears, contradictions)
8. **Relationships** (how they relate to other characters, if any)
9. **Character Arc** (how they might change throughout the story)
10. **Unique Quirks/Mannerisms** (distinctive behaviors, speech patterns, habits)

Format the output as a detailed, professional character profile that can be used directly to fill in character creation forms. Make it specific to the story's genre and tone.`;

  try {
    const response = await generateContent(prompt, storyContext);
    return response || 'Failed to generate character prompt.';
  } catch (error) {
    console.error('Error generating character prompt:', error);
    return `Error generating prompt: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Generates a detailed scene creation prompt based on story context and recent scenes
 */
export async function generateScenePrompt(
  storyContext: StoryContext,
  scenes: Scene[] = [],
  sceneHints?: {
    purpose?: string;
    location?: string;
    characters?: string[];
    mood?: string;
    action?: string;
  }
): Promise<string> {
  const recentScenes = scenes.slice(-5);
  const recentScenesSummary = recentScenes.length > 0
    ? recentScenes.map((s, idx) => 
        `Scene ${s.sequenceNumber || idx + 1}: ${s.contextSummary || s.rawIdea || 'No description'}`
      ).join('\n')
    : 'No scenes yet. This will be the opening scene.';

  const lastScene = scenes[scenes.length - 1];
  const continuityNote = lastScene
    ? `Last scene ended with: "${lastScene.contextSummary || lastScene.rawIdea || 'Unknown'}"`
    : 'This is the opening scene of the story.';

  const prompt = `You are a professional screenwriter and director for a ${storyContext.genre || 'film'} project titled "${storyContext.title || 'Untitled'}".

STORY CONTEXT:
- Genre: ${storyContext.genre || 'General'}
- Plot Summary: ${storyContext.plotSummary || 'Not specified'}
- Characters: ${storyContext.characters || 'Not specified'}
- Initial Context: ${storyContext.initialContext || 'Not specified'}

RECENT SCENES (for continuity):
${recentScenesSummary}

${continuityNote}

${sceneHints?.purpose ? `SCENE PURPOSE: ${sceneHints.purpose}` : ''}
${sceneHints?.location ? `LOCATION: ${sceneHints.location}` : ''}
${sceneHints?.characters && sceneHints.characters.length > 0 ? `CHARACTERS INVOLVED: ${sceneHints.characters.join(', ')}` : ''}
${sceneHints?.mood ? `DESIRED MOOD: ${sceneHints.mood}` : ''}
${sceneHints?.action ? `KEY ACTION: ${sceneHints.action}` : ''}

TASK: Generate a comprehensive, detailed scene creation prompt that will help create a compelling, well-structured scene. The prompt should include:

1. **Scene Purpose** (what this scene accomplishes in the story: exposition, conflict, character development, plot advancement, etc.)
2. **Visual Description** (detailed visual action: what happens in the frame, character movements, environmental details)
3. **Location/Setting** (specific location, time of day, weather, atmosphere)
4. **Characters Present** (who is in the scene, their emotional states, relationships)
5. **Dialogue Hints** (key lines or conversation topics, if dialogue is needed)
6. **Emotional Tone** (the mood: tense, comedic, dramatic, mysterious, etc.)
7. **Pacing** (fast-paced action, slow contemplative moment, building tension, etc.)
8. **Key Beats** (important story beats or moments within the scene)
9. **Visual Details** (specific visual elements: props, lighting conditions, camera angles suggested by the action)
10. **Transition Notes** (how this scene connects to the previous and sets up the next)

Format the output as a detailed, professional scene description (2-4 paragraphs) that can be used directly as a scene prompt. Make it specific to the story's genre, maintain continuity with previous scenes, and ensure it serves the story's overall narrative arc.`;

  try {
    const response = await generateContent(prompt, storyContext, scenes);
    return response || 'Failed to generate scene prompt.';
  } catch (error) {
    console.error('Error generating scene prompt:', error);
    return `Error generating prompt: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Generates an image-generation-optimized prompt for character creation
 * Designed for DALL-E, Stable Diffusion, Midjourney, Replicate, etc.
 */
export async function generateCharacterImagePrompt(
  storyContext: StoryContext,
  characterHints?: {
    name?: string;
    role?: string;
    appearance?: string;
    personality?: string;
  }
): Promise<string> {
  const prompt = `You are a professional character concept artist and prompt engineer for AI image generation (DALL-E, Stable Diffusion, Midjourney, etc.).

STORY CONTEXT:
- Genre: ${storyContext.genre || 'General'}
- Title: "${storyContext.title || 'Untitled'}"
- Tone: ${storyContext.plotSummary ? 'Derived from plot' : 'Neutral'}

CHARACTER DETAILS:
${characterHints?.name ? `Name: ${characterHints.name}` : ''}
${characterHints?.role ? `Role: ${characterHints.role}` : ''}
${characterHints?.appearance ? `Appearance Notes: ${characterHints.appearance}` : ''}
${characterHints?.personality ? `Personality: ${characterHints.personality}` : ''}

TASK: Generate a detailed, image-generation-optimized prompt for creating a character portrait. The prompt must be:

1. **VISUAL-FOCUSED**: Emphasize visual elements (appearance, clothing, pose, expression)
2. **STYLE-SPECIFIC**: Include art style, rendering quality, lighting
3. **DETAILED**: Specific physical features, clothing details, background
4. **FORMATTED FOR AI IMAGE GENERATORS**: Use keywords and tags that image AI models understand

OUTPUT FORMAT:
Create a single, comprehensive prompt (2-3 sentences) optimized for image generation. Include:
- Character appearance (age, build, facial features, hair, distinctive traits)
- Clothing and accessories (detailed, style-appropriate)
- Pose and expression (what they're doing, emotional state)
- Art style (realistic, cinematic, concept art, etc.)
- Lighting and atmosphere (mood, time of day, environment)
- Technical quality tags (high detail, professional, 4K, etc.)

Example format: "A [age] [build] [character description] with [specific features], wearing [detailed clothing], [pose/expression], [art style], [lighting], [background], highly detailed, professional concept art, 4K, cinematic lighting"

Make it specific to the story's genre and character role.`;

  try {
    const response = await generateContent(prompt, storyContext);
    return response || 'Failed to generate character image prompt.';
  } catch (error) {
    console.error('Error generating character image prompt:', error);
    return `Error generating prompt: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Generates an image-generation-optimized prompt for scene creation
 * Designed for DALL-E, Stable Diffusion, Midjourney, Replicate, etc.
 */
export async function generateSceneImagePrompt(
  storyContext: StoryContext,
  scenes: Scene[] = [],
  sceneHints?: {
    purpose?: string;
    location?: string;
    characters?: string[];
    mood?: string;
    action?: string;
  }
): Promise<string> {
  const lastScene = scenes[scenes.length - 1];
  const continuityNote = lastScene
    ? `Previous scene context: "${lastScene.contextSummary || lastScene.rawIdea || 'Unknown'}"`
    : 'This is the opening scene.';

  const prompt = `You are a professional cinematographer and prompt engineer for AI image generation (DALL-E, Stable Diffusion, Midjourney, etc.).

STORY CONTEXT:
- Genre: ${storyContext.genre || 'General'}
- Title: "${storyContext.title || 'Untitled'}"
- Plot: ${storyContext.plotSummary || 'Not specified'}

SCENE DETAILS:
${continuityNote}
${sceneHints?.purpose ? `Purpose: ${sceneHints.purpose}` : ''}
${sceneHints?.location ? `Location: ${sceneHints.location}` : ''}
${sceneHints?.characters && sceneHints.characters.length > 0 ? `Characters: ${sceneHints.characters.join(', ')}` : ''}
${sceneHints?.mood ? `Mood: ${sceneHints.mood}` : ''}
${sceneHints?.action ? `Action: ${sceneHints.action}` : ''}

TASK: Generate a detailed, image-generation-optimized prompt for creating a scene/storyboard frame. The prompt must be:

1. **VISUAL-FOCUSED**: Describe what's visible in the frame (composition, subjects, environment)
2. **CINEMATIC**: Include camera angle, shot type, framing
3. **ATMOSPHERIC**: Lighting, mood, color palette, time of day
4. **DETAILED**: Specific visual elements, props, environmental details
5. **FORMATTED FOR AI IMAGE GENERATORS**: Use keywords that image AI models understand

OUTPUT FORMAT:
Create a single, comprehensive prompt (2-3 sentences) optimized for image generation. Include:
- Scene composition (what's in frame, subjects, positioning)
- Camera perspective (close-up, wide shot, angle, framing)
- Lighting and atmosphere (time of day, lighting style, mood, color palette)
- Environmental details (location, background, props, weather)
- Art style (cinematic, realistic, storyboard, concept art)
- Technical quality tags (high detail, professional, 4K, etc.)

Example format: "[Shot type] of [scene description], [camera angle], [lighting], [atmosphere], [environmental details], [art style], highly detailed, professional cinematography, 4K, cinematic color grading"

Make it specific to the story's genre and maintain visual continuity with previous scenes.`;

  try {
    const response = await generateContent(prompt, storyContext, scenes);
    return response || 'Failed to generate scene image prompt.';
  } catch (error) {
    console.error('Error generating scene image prompt:', error);
    return `Error generating prompt: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
