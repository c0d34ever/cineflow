import { useState, useEffect } from 'react';
import { ProjectData } from '../db';
import { apiService, checkApiAvailability } from '../apiService';
import { getProjectsFromDB } from '../db';
import { activityService, favoritesService } from '../apiServices';

interface UseDataLoadingProps {
  isAuthenticated: boolean;
  setProjects: (projects: ProjectData[]) => void;
  setFavoritedProjects: (projects: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setNotifications: (notifications: any[]) => void;
  setUnreadNotificationCount: (count: number) => void;
}

export const useDataLoading = ({
  isAuthenticated,
  setProjects,
  setFavoritedProjects,
  setNotifications,
  setUnreadNotificationCount
}: UseDataLoadingProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const loadFavorites = async () => {
    if (!isAuthenticated) return;
    try {
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        const favorites = await favoritesService.getAll();
        const favoriteIds = new Set<string>();
        if (Array.isArray(favorites)) {
          favorites.forEach((f: any) => {
            if (f.id || f.project_id) favoriteIds.add(f.id || f.project_id);
          });
        } else if (favorites && (favorites as any).favorites) {
          ((favorites as any).favorites as any[]).forEach((f: any) => {
            if (f.id || f.project_id) favoriteIds.add(f.id || f.project_id);
          });
        }
        setFavoritedProjects(favoriteIds);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const loadLibrary = async () => {
    // Don't load if not authenticated
    if (!isAuthenticated) {
      return;
    }
    setIsLoading(true);
    try {
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        const list = await apiService.getProjects();
        setProjects(list);
      } else {
        const list = await getProjectsFromDB();
        setProjects(list);
      }
    } catch (e: any) {
      console.error("Failed to load library", e);
      // If it's an auth error, clear token - caller should handle state updates
      if (e.message && (e.message.includes('Authentication required') || e.message.includes('401'))) {
        localStorage.removeItem('auth_token');
        // Note: Caller should handle setIsAuthenticated and setCurrentUser
        return;
      }
      // Fallback to IndexedDB
      try {
        const list = await getProjectsFromDB();
        setProjects(list);
      } catch (fallbackError) {
        console.error("IndexedDB fallback also failed:", fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        const data = await activityService.getNotifications(50);
        setNotifications((data as any)?.notifications || []);
        setUnreadNotificationCount((data as any)?.unread_count || 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  return {
    isLoading,
    loadLibrary,
    loadFavorites,
    loadNotifications
  };
};

