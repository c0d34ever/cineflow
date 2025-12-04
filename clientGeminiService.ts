// Client-side wrapper for Gemini API calls (now goes through backend)
import { StoryContext, DirectorSettings, Scene } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export const generateStoryConcept = async (seed: string): Promise<Partial<StoryContext>> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/gemini/generate-story`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ seed }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to generate story concept' }));
    throw new Error(error.error || 'Failed to generate story concept');
  }
  return response.json();
};

export const suggestNextScene = async (
  context: StoryContext,
  recentScenes: Scene[]
): Promise<string> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/gemini/suggest-next-scene`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ context, recentScenes }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to suggest next scene' }));
    throw new Error(error.error || 'Failed to suggest next scene');
  }
  const data = await response.json();
  return data.suggestion || '';
};

export const suggestDirectorSettings = async (
  rawIdea: string,
  context: StoryContext,
  prevSceneSummary: string | null,
  currentSettings: DirectorSettings
): Promise<DirectorSettings> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/gemini/suggest-director-settings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ rawIdea, context, prevSceneSummary, currentSettings }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to suggest director settings' }));
    throw new Error(error.error || 'Failed to suggest director settings');
  }
  return response.json();
};

export const extractCharacters = async (
  context: StoryContext, 
  scenes: Scene[] = [],
  onProgress?: (progress: number, message: string) => void
): Promise<Array<{ name: string; description?: string; role?: string; appearance?: string; personality?: string }>> => {
  const token = getAuthToken();
  
  // Use SSE for large extractions (30+ scenes) or if progress callback is provided
  const useSSE = scenes.length >= 30 || !!onProgress;
  
  if (useSSE) {
    // Generate connection ID
    const connectionId = `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Set up SSE connection
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`${API_BASE_URL}/sse/${connectionId}?token=${token}`);
      
      let characters: Array<{ name: string; description?: string; role?: string; appearance?: string; personality?: string }> = [];
      
      eventSource.addEventListener('progress', (e) => {
        try {
          const data = JSON.parse(e.data);
          const progress = data.progress || 0;
          const message = data.message || '';
          onProgress?.(progress, message);
        } catch (error) {
          console.error('[extractCharacters] Error parsing progress:', error);
        }
      });
      
      eventSource.addEventListener('complete', (e) => {
        try {
          const data = JSON.parse(e.data);
          characters = data.characters || [];
          eventSource.close();
          resolve(characters);
        } catch (error) {
          console.error('[extractCharacters] Error parsing complete:', error);
          eventSource.close();
          reject(new Error('Failed to parse character extraction result'));
        }
      });
      
      eventSource.addEventListener('error', (e: any) => {
        try {
          const errorData = e.data ? JSON.parse(e.data) : { error: 'Unknown error' };
          eventSource.close();
          reject(new Error(errorData.error || 'Character extraction failed'));
        } catch (error) {
          eventSource.close();
          reject(new Error('Character extraction failed'));
        }
      });
      
      eventSource.onerror = (error) => {
        console.error('[extractCharacters] EventSource error:', error);
        eventSource.close();
        reject(new Error('SSE connection failed'));
      };
      
      // Wait a bit for SSE connection to establish, then send the request
      setTimeout(() => {
        fetch(`${API_BASE_URL}/gemini/extract-characters`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-SSE-Connection-ID': connectionId
          },
          body: JSON.stringify({ context, scenes, sseConnectionId: connectionId })
        }).catch((error) => {
          eventSource.close();
          reject(error);
        });
      }, 500);
    });
  }
  
  // Fallback to regular request for small extractions
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
  
  try {
    const response = await fetch(`${API_BASE_URL}/gemini/extract-characters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ context, scenes }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // Handle timeout errors specifically
      if (response.status === 524 || response.status === 504) {
        throw new Error('Request timed out. The story may be too large. Try with fewer scenes or split the extraction.');
      }
      const error = await response.json().catch(() => ({ error: 'Failed to extract characters' }));
      throw new Error(error.error || 'Failed to extract characters');
    }
    const data = await response.json();
    return data.characters || [];
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 2 minutes. The story may be too large. Try with fewer scenes.');
    }
    throw error;
  }
};

export const extractLocations = async (
  context: StoryContext, 
  scenes: Scene[],
  onProgress?: (progress: number, message: string) => void
): Promise<Array<{ name: string; description?: string; location_type?: string; address?: string }>> => {
  const token = getAuthToken();
  
  // Use SSE for large extractions (30+ scenes) or if progress callback is provided
  const useSSE = scenes.length >= 30 || !!onProgress;
  
  if (useSSE) {
    // Generate connection ID
    const connectionId = `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Set up SSE connection
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`${API_BASE_URL}/sse/${connectionId}?token=${token}`);
      
      let locations: Array<{ name: string; description?: string; location_type?: string; address?: string }> = [];
      
      eventSource.addEventListener('progress', (e) => {
        try {
          const data = JSON.parse(e.data);
          const progress = data.progress || 0;
          const message = data.message || '';
          onProgress?.(progress, message);
        } catch (error) {
          console.error('[extractLocations] Error parsing progress:', error);
        }
      });
      
      eventSource.addEventListener('complete', (e) => {
        try {
          const data = JSON.parse(e.data);
          locations = data.locations || [];
          eventSource.close();
          resolve(locations);
        } catch (error) {
          console.error('[extractLocations] Error parsing complete:', error);
          eventSource.close();
          reject(new Error('Failed to parse location extraction result'));
        }
      });
      
      eventSource.addEventListener('error', (e: any) => {
        try {
          const errorData = e.data ? JSON.parse(e.data) : { error: 'Unknown error' };
          eventSource.close();
          reject(new Error(errorData.error || 'Location extraction failed'));
        } catch (error) {
          eventSource.close();
          reject(new Error('Location extraction failed'));
        }
      });
      
      eventSource.onerror = (error) => {
        console.error('[extractLocations] EventSource error:', error);
        eventSource.close();
        reject(new Error('SSE connection failed'));
      };
      
      // Wait a bit for SSE connection to establish, then send the request
      setTimeout(() => {
        fetch(`${API_BASE_URL}/gemini/extract-locations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-SSE-Connection-ID': connectionId
          },
          body: JSON.stringify({ context, scenes, sseConnectionId: connectionId })
        }).catch((error) => {
          eventSource.close();
          reject(error);
        });
      }, 500);
    });
  }
  
  // Fallback to regular request for small extractions
  const response = await fetch(`${API_BASE_URL}/gemini/extract-locations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ context, scenes })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to extract locations');
  }
  const data = await response.json();
  return data.locations || [];
};

export const generateEpisodeContent = async (
  episodeTitle: string,
  episodeDescription: string,
  projectContext: StoryContext
): Promise<{ hashtags: string[]; caption: string }> => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/gemini/generate-episode-content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ episode_title: episodeTitle, episode_description: episodeDescription, project_context: projectContext })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate episode content');
  }
  return await response.json();
};

export const analyzeCharacterRelationships = async (
  characters: Array<{ name: string }>,
  scenes: Scene[],
  context: StoryContext
): Promise<Array<{
  character1: string;
  character2: string;
  type: 'allies' | 'enemies' | 'neutral' | 'romantic' | 'family';
  strength: number;
  description?: string;
}>> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/gemini/analyze-character-relationships`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ characters, scenes, context }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to analyze character relationships' }));
    throw new Error(error.error || 'Failed to analyze character relationships');
  }
  return response.json();
};

export const analyzeStory = async (
  context: StoryContext,
  scenes: Scene[]
): Promise<{
  pacing: { score: number; issues: string[]; suggestions: string[] };
  characterDevelopment: { score: number; issues: string[]; suggestions: string[] };
  plotHoles: { found: boolean; issues: string[] };
  structure: { score: number; analysis: string; suggestions: string[] };
  dialogue: { score: number; issues: string[]; suggestions: string[] };
}> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/gemini/analyze-story`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ context, scenes }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to analyze story' }));
    throw new Error(error.error || 'Failed to analyze story');
  }
  return response.json();
};

export const enhanceScenePrompt = async (
  rawIdea: string,
  context: StoryContext,
  prevSceneSummary: string | null,
  settings: DirectorSettings
): Promise<{ enhancedPrompt: string; contextSummary: string }> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Validate inputs before sending
  if (!rawIdea || typeof rawIdea !== 'string' || rawIdea.trim().length === 0) {
    throw new Error('rawIdea is required and must be a non-empty string');
  }
  
  if (!context || typeof context !== 'object') {
    throw new Error('context is required and must be an object');
  }
  
  if (!settings || typeof settings !== 'object') {
    throw new Error('settings is required and must be an object');
  }

  const response = await fetch(`${API_BASE_URL}/gemini/enhance-scene-prompt`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ rawIdea, context, prevSceneSummary, settings }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to enhance scene prompt' }));
    const errorMessage = error.error || 'Failed to enhance scene prompt';
    console.error('Enhance scene prompt error:', {
      status: response.status,
      error: errorMessage,
      sentData: {
        hasRawIdea: !!rawIdea,
        rawIdeaLength: rawIdea?.length || 0,
        hasContext: !!context,
        contextKeys: context ? Object.keys(context) : [],
        hasSettings: !!settings,
        settingsKeys: settings ? Object.keys(settings) : [],
      }
    });
    throw new Error(errorMessage);
  }
  return response.json();
};

