import { flushSync } from 'react-dom';

/**
 * Get the full URL for an image (handles both absolute URLs and relative paths)
 */
export const getImageUrl = (imageUrl: string | undefined | null): string => {
  if (!imageUrl) return '';
  
  // If it's already a full URL, return as-is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // Construct full URL from API base URL
  const apiBaseUrl = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const separator = imageUrl.startsWith('/') ? '' : '/';
  return `${apiBaseUrl}${separator}${imageUrl}`;
};

/**
 * Get the API base URL
 */
export const getApiBaseUrl = (): string => {
  return (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
};

/**
 * Get the API base URL without /api suffix (for image/media URLs)
 */
export const getApiBaseUrlWithoutApi = (): string => {
  const apiUrl = getApiBaseUrl();
  return apiUrl.replace('/api', '');
};

/**
 * Create an immediate handler with flushSync for instant UI updates
 * Useful for state updates that need immediate visual feedback
 */
export const createImmediateHandler = <T extends (...args: any[]) => void>(
  setter: T
) => {
  return (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    flushSync(() => {
      setter();
    });
  };
};

/**
 * Create a handler that sets a boolean state to true
 */
export const createShowHandler = (
  setShow: (show: boolean) => void
) => {
  return (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShow(true);
  };
};

/**
 * Create a handler that sets a boolean state to false
 */
export const createHideHandler = (
  setShow: (show: boolean) => void
) => {
  return (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShow(false);
  };
};

/**
 * Create a handler that toggles a boolean state
 */
export const createToggleHandler = (
  setShow: (show: boolean | ((prev: boolean) => boolean)) => void
) => {
  return (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShow(prev => !prev);
  };
};

/**
 * Stop event propagation and prevent default
 */
export const stopEvent = (e: React.MouseEvent | React.ChangeEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

/**
 * Reload projects from API and update state
 */
export const reloadProjects = async (
  apiService: any,
  setProjects: (projects: any[]) => void
): Promise<void> => {
  const list = await apiService.getProjects();
  setProjects(list);
};

