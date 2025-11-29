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
    // Handle 401 Unauthorized - clear token and reload to show login
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.reload();
      throw new Error('Authentication required');
    }
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

// Scene Notes Service
export const sceneNotesService = {
  getByScene: (sceneId: string) => apiCall(`/scene-notes/scene/${sceneId}`),
  create: (data: { scene_id: string; note_type?: 'note' | 'todo' | 'issue' | 'idea'; content: string }) =>
    apiCall('/scene-notes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { content?: string; note_type?: string; is_resolved?: boolean }) =>
    apiCall(`/scene-notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiCall(`/scene-notes/${id}`, { method: 'DELETE' }),
};

// Templates Service
export const templatesService = {
  getAll: () => apiCall('/templates'),
  getById: (id: number) => apiCall(`/templates/${id}`),
  create: (data: {
    name: string;
    description?: string;
    genre?: string;
    plot_summary?: string;
    characters?: string;
    initial_context?: string;
    director_settings?: any;
  }) => apiCall('/templates', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) => apiCall(`/templates/${id}`, { method: 'DELETE' }),
};

// Characters Service
export const charactersService = {
  getByProject: (projectId: string) => apiCall(`/characters/project/${projectId}`),
  getByScene: (sceneId: string) => apiCall(`/characters/scene/${sceneId}`),
  create: (data: {
    project_id: string;
    name: string;
    description?: string;
    role?: string;
    appearance?: string;
    personality?: string;
    backstory?: string;
    image_url?: string;
  }) => apiCall('/characters', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: {
    name?: string;
    description?: string;
    role?: string;
    appearance?: string;
    personality?: string;
    backstory?: string;
    image_url?: string;
  }) => apiCall(`/characters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiCall(`/characters/${id}`, { method: 'DELETE' }),
  addToScene: (sceneId: string, characterId: number, roleInScene?: string) =>
    apiCall(`/characters/scene/${sceneId}`, { method: 'POST', body: JSON.stringify({ character_id: characterId, role_in_scene: roleInScene }) }),
  removeFromScene: (sceneId: string, characterId: number) =>
    apiCall(`/characters/scene/${sceneId}/${characterId}`, { method: 'DELETE' }),
};

// Projects Service - Archive
export const archiveProject = (projectId: string, archived: boolean) =>
  apiCall(`/projects/${projectId}/archive`, { method: 'PUT', body: JSON.stringify({ archived }) });

// Sharing Service
export const sharingService = {
  getByProject: (projectId: string) => apiCall(`/sharing/project/${projectId}`),
  create: (data: {
    project_id: string;
    shared_with_user_id?: number;
    access_level?: 'view' | 'edit' | 'comment';
    expires_at?: string;
  }) => apiCall('/sharing', { method: 'POST', body: JSON.stringify(data) }),
  revoke: (shareId: number) => apiCall(`/sharing/${shareId}`, { method: 'DELETE' }),
  getByToken: (token: string) => {
    const tokenApiCall = async (endpoint: string, options: RequestInit = {}) => {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
      }
      return response.json();
    };
    return tokenApiCall(`/sharing/token/${token}`);
  },
};

// Activity Service
export const activityService = {
  getFeed: (limit?: number) => apiCall(`/activity${limit ? `?limit=${limit}` : ''}`),
  logActivity: (data: {
    project_id?: string;
    activity_type: string;
    activity_description?: string;
    metadata?: any;
  }) => apiCall('/activity', { method: 'POST', body: JSON.stringify(data) }),
  getNotifications: (limit?: number) => apiCall(`/activity/notifications${limit ? `?limit=${limit}` : ''}`),
  markNotificationRead: (id: number) => apiCall(`/activity/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => apiCall('/activity/notifications/read-all', { method: 'PUT' }),
};

// Scene Templates Service
export const sceneTemplatesService = {
  getAll: () => apiCall('/scene-templates'),
  create: (data: {
    name: string;
    description?: string;
    raw_idea: string;
    director_settings?: any;
  }) => apiCall('/scene-templates', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: {
    name?: string;
    description?: string;
    raw_idea?: string;
    director_settings?: any;
  }) => apiCall(`/scene-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiCall(`/scene-templates/${id}`, { method: 'DELETE' }),
};

// Locations Service
export const locationsService = {
  getByProject: (projectId: string) => apiCall(`/locations/project/${projectId}`),
  getByScene: (sceneId: string) => apiCall(`/locations/scene/${sceneId}`),
  create: (data: {
    project_id: string;
    name: string;
    description?: string;
    location_type?: string;
    address?: string;
    image_url?: string;
    notes?: string;
  }) => apiCall('/locations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: {
    name?: string;
    description?: string;
    location_type?: string;
    address?: string;
    image_url?: string;
    notes?: string;
  }) => apiCall(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiCall(`/locations/${id}`, { method: 'DELETE' }),
  addToScene: (sceneId: string, locationId: number) =>
    apiCall(`/locations/scene/${sceneId}`, { method: 'POST', body: JSON.stringify({ location_id: locationId }) }),
  removeFromScene: (sceneId: string, locationId: number) =>
    apiCall(`/locations/scene/${sceneId}/${locationId}`, { method: 'DELETE' }),
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

// Auth Service
export const authService = {
  login: (username: string, password: string) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (data: { username: string; email: string; password: string }) =>
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMe: () => apiCall('/auth/me'),
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
    project_context?: any; // Optional: if provided, automatically generates hashtags and caption
  }) => apiCall('/episodes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: {
    title?: string;
    description?: string;
    duration_seconds?: number;
    air_date?: string;
    status?: string;
    thumbnail_url?: string;
    episode_number?: number;
    hashtags?: string[];
    caption?: string;
  }) => apiCall(`/episodes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiCall(`/episodes/${id}`, { method: 'DELETE' }),
  generateContent: (id: string, projectContext: any) =>
    apiCall(`/episodes/${id}/generate-content`, { method: 'PUT', body: JSON.stringify({ project_context: projectContext }) }),
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

// Media Library Service
export const mediaService = {
  uploadImage: (projectId: string, file: File, sceneId?: string, altText?: string, description?: string, isPrimary?: boolean): Promise<any> => {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('image', file);
    formData.append('project_id', projectId);
    if (sceneId) formData.append('scene_id', sceneId);
    if (altText) formData.append('alt_text', altText);
    if (description) formData.append('description', description);
    if (isPrimary !== undefined) formData.append('is_primary', isPrimary.toString());

    return fetch(`${API_BASE_URL}/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }).then(async (response) => {
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.reload();
          throw new Error('Authentication required');
        }
        const error = await response.json().catch(() => ({ error: 'Failed to upload image' }));
        throw new Error(error.error || 'Failed to upload image');
      }
      return response.json();
    });
  },

  getProjectMedia: (projectId: string, sceneId?: string): Promise<any[]> => {
    const url = sceneId 
      ? `/media/project/${projectId}?scene_id=${sceneId}`
      : `/media/project/${projectId}`;
    return apiCall(url).then((data: any) => data.media || []);
  },

  getSceneMedia: (sceneId: string): Promise<any[]> => {
    return apiCall(`/media/scene/${sceneId}`).then((data: any) => data.media || []);
  },

  updateMedia: (id: string, updates: { alt_text?: string; description?: string; is_primary?: boolean; display_order?: number }): Promise<any> => {
    return apiCall(`/media/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteMedia: (id: string): Promise<void> => {
    return apiCall(`/media/${id}`, { method: 'DELETE' }).then(() => undefined);
  },

  associateMedia: (mediaId: string, sceneId: string | null): Promise<any> => {
    return apiCall(`/media/${mediaId}/associate`, {
      method: 'POST',
      body: JSON.stringify({ scene_id: sceneId }),
    });
  },
};

// Admin Services (use ADMIN_API_URL)
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
    // Handle 401 Unauthorized - clear token and reload to show login
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.reload();
      throw new Error('Authentication required');
    }
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const adminProjectsService = {
  getAll: (params?: { page?: number; limit?: number; userId?: number; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.userId) queryParams.append('userId', params.userId.toString());
    if (params?.search) queryParams.append('search', params.search);
    const query = queryParams.toString();
    return adminApiCall(`/projects${query ? '?' + query : ''}`);
  },
  delete: (id: string) => adminApiCall(`/projects/${id}`, { method: 'DELETE' }),
};

export const adminApiKeysService = {
  getAll: (params?: { page?: number; limit?: number; userId?: number; is_active?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.userId) queryParams.append('userId', params.userId.toString());
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    const query = queryParams.toString();
    return adminApiCall(`/api-keys${query ? '?' + query : ''}`);
  },
  getStats: () => adminApiCall('/api-keys/stats'),
};

// Comics Service
export const comicsService = {
  get: (projectId: string, episodeId?: string) => {
    const params = episodeId ? `?episodeId=${episodeId}` : '';
    return apiCall(`/comics/${projectId}${params}`);
  },
  generate: (data: {
    projectId: string;
    episodeId?: string;
    projectContext: any;
    scenes: any[];
  }) => apiCall('/comics/generate', { method: 'POST', body: JSON.stringify(data) }),
  delete: (projectId: string, episodeId?: string) => {
    const params = episodeId ? `?episodeId=${episodeId}` : '';
    return apiCall(`/comics/${projectId}${params}`, { method: 'DELETE' });
  },
  download: (projectId: string, episodeId?: string) => {
    const params = episodeId ? `?episodeId=${episodeId}` : '';
    return fetch(`${API_BASE_URL}/comics/${projectId}/download${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });
  },
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
  adminProjects: adminProjectsService,
  adminApiKeys: adminApiKeysService,
  media: mediaService,
  comics: comicsService,
};
