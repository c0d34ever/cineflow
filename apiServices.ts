// Frontend API Services for all endpoints
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ADMIN_API_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:5001/api';

// Helper function for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// API Keys Service
export const apiKeysService = {
  getAll: () => apiCall('/api-keys'),
  create: (data: { key_name: string; expires_at?: string }) =>
    apiCall('/api-keys', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { key_name?: string; is_active?: boolean }) =>
    apiCall(`/api-keys/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiCall(`/api-keys/${id}`, { method: 'DELETE' }),
  regenerate: (id: number) => apiCall(`/api-keys/${id}/regenerate`, { method: 'POST' }),
};

// Tags Service
export const tagsService = {
  getAll: () => apiCall('/tags'),
  create: (data: { name: string; color?: string }) =>
    apiCall('/tags', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; color?: string }) =>
    apiCall(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiCall(`/tags/${id}`, { method: 'DELETE' }),
  addToProject: (tagId: number, projectId: string) =>
    apiCall(`/tags/${tagId}/projects/${projectId}`, { method: 'POST' }),
  removeFromProject: (tagId: number, projectId: string) =>
    apiCall(`/tags/${tagId}/projects/${projectId}`, { method: 'DELETE' }),
};

// Favorites Service
export const favoritesService = {
  getAll: () => apiCall('/favorites'),
  add: (projectId: string) => apiCall(`/favorites/${projectId}`, { method: 'POST' }),
  remove: (projectId: string) => apiCall(`/favorites/${projectId}`, { method: 'DELETE' }),
  check: (projectId: string) => apiCall(`/favorites/check/${projectId}`),
};

// Comments Service
export const commentsService = {
  getByProject: (projectId: string) => apiCall(`/comments/project/${projectId}`),
  create: (projectId: string, data: { content: string; is_pinned?: boolean }) =>
    apiCall(`/comments/project/${projectId}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { content?: string; is_pinned?: boolean }) =>
    apiCall(`/comments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiCall(`/comments/${id}`, { method: 'DELETE' }),
};

// Settings Service
export const settingsService = {
  get: () => apiCall('/settings'),
  update: (data: {
    theme?: string;
    language?: string;
    timezone?: string;
    notifications_enabled?: boolean;
    email_notifications?: boolean;
    auto_save?: boolean;
    default_project_visibility?: string;
    preferences?: any;
  }) => apiCall('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};

// User Gemini API Key Service
export const userGeminiKeyService = {
  get: () => apiCall('/user/gemini-key'),
  set: (apiKey: string) => apiCall('/user/gemini-key', { method: 'POST', body: JSON.stringify({ api_key: apiKey }) }),
  remove: () => apiCall('/user/gemini-key', { method: 'DELETE' }),
  test: (apiKey: string) => apiCall('/user/gemini-key/test', { method: 'POST', body: JSON.stringify({ api_key: apiKey }) }),
};

// Auth Service (Admin API)
async function adminApiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${ADMIN_API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const authService = {
  login: (username: string, password: string) =>
    adminApiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (data: { username: string; email: string; password: string }) =>
    adminApiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMe: () => adminApiCall('/auth/me'),
};

// Episodes Service
export const episodesService = {
  getByProject: (projectId: string) => apiCall(`/episodes/project/${projectId}`),
  getById: (id: string) => apiCall(`/episodes/${id}`),
  create: (data: {
    project_id: string;
    episode_number: number;
    title?: string;
    description?: string;
    duration_seconds?: number;
    air_date?: string;
    status?: string;
    thumbnail_url?: string;
  }) => apiCall('/episodes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: {
    title?: string;
    description?: string;
    duration_seconds?: number;
    air_date?: string;
    status?: string;
    thumbnail_url?: string;
    episode_number?: number;
  }) => apiCall(`/episodes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiCall(`/episodes/${id}`, { method: 'DELETE' }),
};

// Clips Service
export const clipsService = {
  getByEpisode: (episodeId: string) => apiCall(`/clips/episode/${episodeId}`),
  getById: (id: string) => apiCall(`/clips/${id}`),
  create: (data: {
    episode_id?: string;
    project_id?: string;
    sequence_number: number;
    raw_idea?: string;
    enhanced_prompt?: string;
    context_summary?: string;
    status?: string;
    director_settings?: any;
  }) => apiCall('/clips', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: {
    sequence_number?: number;
    raw_idea?: string;
    enhanced_prompt?: string;
    context_summary?: string;
    status?: string;
    episode_id?: string;
    director_settings?: any;
  }) => apiCall(`/clips/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiCall(`/clips/${id}`, { method: 'DELETE' }),
  move: (id: string, episode_id: string, sequence_number?: number) =>
    apiCall(`/clips/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ episode_id, sequence_number }),
    }),
};

// Export all services
export default {
  apiKeys: apiKeysService,
  tags: tagsService,
  favorites: favoritesService,
  comments: commentsService,
  settings: settingsService,
  auth: authService,
  episodes: episodesService,
  clips: clipsService,
  userGeminiKey: userGeminiKeyService,
};

