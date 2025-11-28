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

export const extractCharacters = async (context: StoryContext, scenes: Scene[] = []): Promise<Array<{ name: string; description?: string; role?: string; appearance?: string; personality?: string }>> => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/gemini/extract-characters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ context, scenes })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to extract characters');
  }
  const data = await response.json();
  return data.characters || [];
};

export const extractLocations = async (context: StoryContext, scenes: Scene[]): Promise<Array<{ name: string; description?: string; location_type?: string; address?: string }>> => {
  const token = getAuthToken();
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

  const response = await fetch(`${API_BASE_URL}/gemini/enhance-scene-prompt`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ rawIdea, context, prevSceneSummary, settings }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to enhance scene prompt' }));
    throw new Error(error.error || 'Failed to enhance scene prompt');
  }
  return response.json();
};

