import { ProjectData } from '../db';
import { getApiBaseUrl } from './uiUtils';

/**
 * Filter criteria for library projects
 */
export interface LibraryFilterCriteria {
  searchTerm?: string;
  genre?: string;
  tags?: string[];
  hasCover?: boolean | null;
  sceneCount?: { min?: number; max?: number } | null;
  favorites?: boolean | null;
  contentType?: string | null;
}

/**
 * Check if a project matches the search term
 */
export const matchesSearchTerm = (project: ProjectData, searchTerm: string): boolean => {
  if (!searchTerm) return true;
  const search = searchTerm.toLowerCase();
  return (
    project.context.title.toLowerCase().includes(search) ||
    project.context.genre?.toLowerCase().includes(search) ||
    project.context.plotSummary?.toLowerCase().includes(search) ||
    project.context.characters?.toLowerCase().includes(search) ||
    project.scenes.some(s => s.rawIdea.toLowerCase().includes(search))
  );
};

/**
 * Check if a project matches all filter criteria
 */
export const matchesFilters = (
  project: ProjectData,
  criteria: LibraryFilterCriteria,
  favoritedProjects: Set<string>
): boolean => {
  // Search term filter
  if (criteria.searchTerm && !matchesSearchTerm(project, criteria.searchTerm)) {
    return false;
  }

  // Genre filter
  if (criteria.genre) {
    const genre = criteria.genre.toLowerCase();
    if (!project.context.genre?.toLowerCase().includes(genre)) {
      return false;
    }
  }

  // Cover image filter
  if (criteria.hasCover !== null && criteria.hasCover !== undefined) {
    const hasCover = !!project.context.coverImageUrl;
    if (criteria.hasCover !== hasCover) {
      return false;
    }
  }

  // Scene count filter
  if (criteria.sceneCount) {
    const sceneCount = project.scenes.length;
    if (criteria.sceneCount.min !== undefined && sceneCount < criteria.sceneCount.min) {
      return false;
    }
    if (criteria.sceneCount.max !== undefined && sceneCount > criteria.sceneCount.max) {
      return false;
    }
  }

  // Favorites filter
  if (criteria.favorites !== null && criteria.favorites !== undefined) {
    const isFavorited = favoritedProjects.has(project.context.id);
    if (criteria.favorites !== isFavorited) {
      return false;
    }
  }

  // Content type filter
  if (criteria.contentType) {
    if (project.context.contentType !== criteria.contentType) {
      return false;
    }
  }

  return true;
};

/**
 * Get filtered project IDs based on criteria
 */
export const getFilteredProjectIds = (
  projects: ProjectData[],
  criteria: LibraryFilterCriteria,
  favoritedProjects: Set<string>
): Set<string> => {
  return new Set(
    projects
      .filter(p => matchesFilters(p, criteria, favoritedProjects))
      .map(p => p.context.id)
  );
};

/**
 * Generate cover image for a project
 */
export const generateProjectCover = async (
  projectId: string,
  apiService: any,
  setProjects: (projects: ProjectData[]) => void,
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/projects/${projectId}/generate-cover`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      const list = await apiService.getProjects();
      setProjects(list);
      showToast('Cover image generated!', 'success');
      return true;
    } else {
      const error = await response.json();
      showToast(error.error || 'Failed to generate cover', 'error');
      return false;
    }
  } catch (error: any) {
    showToast('Failed to generate cover: ' + error.message, 'error');
    return false;
  }
};

/**
 * Toggle favorite status for a project
 */
export const toggleProjectFavorite = async (
  projectId: string,
  isCurrentlyFavorited: boolean,
  favoritesService: any,
  setFavoritedProjects: (projects: Set<string> | ((prev: Set<string>) => Set<string>)) => void,
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
): Promise<void> => {
  try {
    if (isCurrentlyFavorited) {
      await favoritesService.remove(projectId);
      setFavoritedProjects(prev => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
      showToast('Removed from favorites', 'success');
    } else {
      await favoritesService.add(projectId);
      setFavoritedProjects(prev => new Set(prev).add(projectId));
      showToast('Added to favorites', 'success');
    }
  } catch (error: any) {
    showToast('Failed to update favorite: ' + error.message, 'error');
  }
};

/**
 * Batch generate covers for multiple projects
 */
export const batchGenerateCovers = async (
  projectIds: string[],
  apiService: any,
  setProjects: (projects: ProjectData[]) => void,
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void,
  setBatchGeneratingCovers?: (generating: boolean) => void
): Promise<{ successCount: number; failCount: number }> => {
  if (setBatchGeneratingCovers) {
    setBatchGeneratingCovers(true);
  }

  let successCount = 0;
  let failCount = 0;

  for (const projectId of projectIds) {
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/projects/${projectId}/generate-cover`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.ok) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (error) {
      failCount++;
    }
  }

  if (setBatchGeneratingCovers) {
    setBatchGeneratingCovers(false);
  }

  // Reload projects
  const list = await apiService.getProjects();
  setProjects(list);

  if (successCount > 0) {
    showToast(
      `Generated ${successCount} cover image(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
      'success'
    );
  } else {
    showToast('Failed to generate cover images', 'error');
  }

  return { successCount, failCount };
};

