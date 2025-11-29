import { ProjectData, StoryContext, Scene, DirectorSettings } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiService = {
  // Get all projects
  async getProjects(): Promise<ProjectData[]> {
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
      throw new Error('Failed to fetch projects');
    }
    return response.json();
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
  async saveProject(data: ProjectData): Promise<void> {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to save project');
    }
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

