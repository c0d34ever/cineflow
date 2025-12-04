import { ProjectData, StoryContext, Scene, DirectorSettings } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiService = {
  // Get all projects
  async getProjects(): Promise<ProjectData[]> {
    try {
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${API_BASE_URL}/projects`, { headers });
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.reload();
          throw new Error('Authentication required');
        }
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Failed to fetch projects:', response.status, errorText);
        throw new Error(`Failed to fetch projects: ${response.status} ${errorText}`);
      }
      return response.json();
    } catch (error: any) {
      console.error('Error in getProjects:', error);
      if (error.message && error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to server. Please check your connection.');
      }
      throw error;
    }
  },

  // Get single project
  async getProject(id: string): Promise<ProjectData> {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/projects/${id}`, { headers });
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.reload();
        throw new Error('Authentication required');
      }
      throw new Error('Failed to fetch project');
    }
    return response.json();
  },

  // Save project (create or update)
  async saveProject(data: ProjectData, sseConnectionId?: string): Promise<void> {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (sseConnectionId) {
      headers['X-SSE-Connection-ID'] = sseConnectionId;
    }
    
    const body: any = { ...data };
    if (sseConnectionId) {
      body.sseConnectionId = sseConnectionId;
    }
    
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to save project';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      console.error('Save project error:', response.status, errorMessage);
      throw new Error(errorMessage);
    }
  },

  // Duplicate project
  async duplicateProject(id: string, options?: {
    includeScenes?: boolean;
    includeMedia?: boolean;
    newTitle?: string;
  }): Promise<{ id: string; message: string }> {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/projects/${id}/duplicate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(options || { includeScenes: true, includeMedia: false }),
    });
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.reload();
        throw new Error('Authentication required');
      }
      const error = await response.json();
      throw new Error(error.error || 'Failed to duplicate project');
    }
    return response.json();
  },

  // Delete project
  async deleteProject(id: string): Promise<void> {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.reload();
        throw new Error('Authentication required');
      }
      throw new Error('Failed to delete project');
    }
  },
};

// Fallback to IndexedDB if API is not available
let useIndexedDB = false;

export const checkApiAvailability = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    return response.ok;
  } catch (error) {
    console.warn('API not available, falling back to IndexedDB');
    useIndexedDB = true;
    return false;
  }
};

// Initialize on module load
checkApiAvailability();

