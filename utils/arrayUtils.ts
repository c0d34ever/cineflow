import { Scene } from '../types';
import { ProjectData } from '../db';

/**
 * Get count of scenes with a specific status
 */
export const getScenesByStatusCount = (scenes: Scene[], status: string): number => {
  return scenes.filter(s => s.status === status).length;
};

/**
 * Get all scenes with a specific status
 */
export const getScenesByStatus = (scenes: Scene[], status: string): Scene[] => {
  return scenes.filter(s => s.status === status);
};

/**
 * Get completed scenes count
 */
export const getCompletedScenesCount = (scenes: Scene[]): number => {
  return getScenesByStatusCount(scenes, 'completed');
};

/**
 * Check if project has completed scenes
 */
export const hasCompletedScenes = (project: ProjectData): boolean => {
  return getCompletedScenesCount(project.scenes) > 0;
};

/**
 * Get projects without cover images
 */
export const getProjectsWithoutCover = (projects: ProjectData[]): ProjectData[] => {
  return projects.filter(p => !p.context.coverImageUrl);
};

/**
 * Get count of projects without cover images
 */
export const getProjectsWithoutCoverCount = (projects: ProjectData[]): number => {
  return getProjectsWithoutCover(projects).length;
};

/**
 * Update an item in an array by ID
 */
export const updateArrayItemById = <T extends { id: string }>(
  array: T[],
  id: string,
  updater: (item: T) => T
): T[] => {
  return array.map(item => item.id === id ? updater(item) : item);
};

/**
 * Remove an item from an array by ID
 */
export const removeArrayItemById = <T extends { id: string }>(
  array: T[],
  id: string
): T[] => {
  return array.filter(item => item.id !== id);
};

/**
 * Add an item to an array
 */
export const addArrayItem = <T>(array: T[], item: T): T[] => {
  return [...array, item];
};

/**
 * Toggle an item in an array (add if not present, remove if present)
 */
export const toggleArrayItem = <T>(
  array: T[],
  item: T,
  equalityFn?: (a: T, b: T) => boolean
): T[] => {
  const equals = equalityFn || ((a, b) => a === b);
  const index = array.findIndex(x => equals(x, item));
  
  if (index === -1) {
    return [...array, item];
  } else {
    return array.filter((_, i) => i !== index);
  }
};

/**
 * Get plural form of a word based on count
 */
export const pluralize = (word: string, count: number, plural?: string): string => {
  if (count === 1) {
    return word;
  }
  return plural || `${word}s`;
};

/**
 * Format scene count with proper pluralization
 */
export const formatSceneCount = (count: number, terminology?: { scene: string; scenes: string }): string => {
  if (terminology) {
    return count === 1 ? `1 ${terminology.scene}` : `${count} ${terminology.scenes}`;
  }
  return pluralize('Scene', count);
};

/**
 * Filter array items by status
 */
export const filterByStatus = <T extends { status: string }>(
  items: T[],
  status: string
): T[] => {
  return items.filter(item => item.status === status);
};

/**
 * Get count of items with specific status
 */
export const getStatusCount = <T extends { status: string }>(
  items: T[],
  status: string
): number => {
  return filterByStatus(items, status).length;
};

/**
 * Get count of items matching any of the provided statuses
 */
export const getStatusesCount = <T extends { status: string }>(
  items: T[],
  statuses: string[]
): number => {
  return items.filter(item => statuses.includes(item.status)).length;
};

