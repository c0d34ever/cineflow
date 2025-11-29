const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Media Library API
export const mediaService = {
  async uploadImage(projectId: string, file: File, sceneId?: string, altText?: string, description?: string, isPrimary?: boolean): Promise<any> {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('image', file);
    formData.append('project_id', projectId);
    if (sceneId) formData.append('scene_id', sceneId);
    if (altText) formData.append('alt_text', altText);
    if (description) formData.append('description', description);
    if (isPrimary !== undefined) formData.append('is_primary', isPrimary.toString());

    const response = await fetch(`${API_BASE_URL}/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    return response.json();
  },

  async getProjectMedia(projectId: string, sceneId?: string): Promise<any[]> {
    const token = getAuthToken();
    const url = sceneId 
      ? `${API_BASE_URL}/media/project/${projectId}?scene_id=${sceneId}`
      : `${API_BASE_URL}/media/project/${projectId}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch media');
    }

    const data = await response.json();
    return data.media || [];
  },

  async getSceneMedia(sceneId: string): Promise<any[]> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/media/scene/${sceneId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch scene media');
    }

    const data = await response.json();
    return data.media || [];
  },

  async updateMedia(id: string, updates: { alt_text?: string; description?: string; is_primary?: boolean; display_order?: number }): Promise<any> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/media/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update media');
    }

    return response.json();
  },

  async deleteMedia(id: string): Promise<void> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/media/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete media');
    }
  },

  async associateMedia(mediaId: string, sceneId: string | null): Promise<any> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/media/${mediaId}/associate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ scene_id: sceneId })
    });

    if (!response.ok) {
      throw new Error('Failed to associate media');
    }

    return response.json();
  }
};
