/**
 * Utility functions for handling image URLs
 * Prefers ImageKit URLs when available, falls back to local paths
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
const baseUrl = API_BASE_URL.replace('/api', '');

/**
 * Get the best available image URL (ImageKit > local)
 * @param mediaItem - Media item with imagekit_url, imagekit_thumbnail_url, file_path, thumbnail_path
 * @param preferThumbnail - Whether to prefer thumbnail URL
 * @param highQuality - If true, prefer full resolution even if preferThumbnail is true (for important displays)
 * @returns Full URL to the image
 */
export function getImageUrl(
  mediaItem: {
    imagekit_url?: string | null;
    imagekit_thumbnail_url?: string | null;
    file_path?: string;
    thumbnail_path?: string;
  },
  preferThumbnail: boolean = true,
  highQuality: boolean = false
): string {
  // If high quality is requested, prefer full images
  if (highQuality) {
    // Prefer ImageKit full image
    if (mediaItem.imagekit_url) {
      return mediaItem.imagekit_url;
    }
    // Fallback to local full image
    if (mediaItem.file_path) {
      const path = mediaItem.file_path.startsWith('/') ? mediaItem.file_path : `/${mediaItem.file_path}`;
      return `${baseUrl}${path}`;
    }
    // Fallback to ImageKit thumbnail
    if (mediaItem.imagekit_thumbnail_url) {
      return mediaItem.imagekit_thumbnail_url;
    }
    // Fallback to local thumbnail
    if (mediaItem.thumbnail_path) {
      const path = mediaItem.thumbnail_path.startsWith('/') ? mediaItem.thumbnail_path : `/${mediaItem.thumbnail_path}`;
      return `${baseUrl}${path}`;
    }
    return ''; // No image available
  }

  // Prefer ImageKit URLs when available
  if (preferThumbnail) {
    if (mediaItem.imagekit_thumbnail_url) {
      return mediaItem.imagekit_thumbnail_url;
    }
    if (mediaItem.imagekit_url) {
      return mediaItem.imagekit_url;
    }
    // Fallback to local thumbnail
    if (mediaItem.thumbnail_path) {
      const path = mediaItem.thumbnail_path.startsWith('/') ? mediaItem.thumbnail_path : `/${mediaItem.thumbnail_path}`;
      return `${baseUrl}${path}`;
    }
    // Fallback to local full image
    if (mediaItem.file_path) {
      const path = mediaItem.file_path.startsWith('/') ? mediaItem.file_path : `/${mediaItem.file_path}`;
      return `${baseUrl}${path}`;
    }
  } else {
    // Prefer full image
    if (mediaItem.imagekit_url) {
      return mediaItem.imagekit_url;
    }
    // Fallback to local full image
    if (mediaItem.file_path) {
      const path = mediaItem.file_path.startsWith('/') ? mediaItem.file_path : `/${mediaItem.file_path}`;
      return `${baseUrl}${path}`;
    }
    // Fallback to ImageKit thumbnail
    if (mediaItem.imagekit_thumbnail_url) {
      return mediaItem.imagekit_thumbnail_url;
    }
    // Fallback to local thumbnail
    if (mediaItem.thumbnail_path) {
      const path = mediaItem.thumbnail_path.startsWith('/') ? mediaItem.thumbnail_path : `/${mediaItem.thumbnail_path}`;
      return `${baseUrl}${path}`;
    }
  }

  return ''; // No image available
}

/**
 * Get thumbnail URL (prefers ImageKit thumbnail)
 */
export function getThumbnailUrl(mediaItem: {
  imagekit_thumbnail_url?: string | null;
  imagekit_url?: string | null;
  thumbnail_path?: string;
  file_path?: string;
}): string {
  return getImageUrl(mediaItem, true);
}

/**
 * Get full image URL (prefers ImageKit full image)
 * @param highQuality - If true, ensures highest quality available
 */
export function getFullImageUrl(mediaItem: {
  imagekit_url?: string | null;
  imagekit_thumbnail_url?: string | null;
  file_path?: string;
  thumbnail_path?: string;
}, highQuality: boolean = true): string {
  return getImageUrl(mediaItem, false, highQuality);
}

/**
 * Get high-quality image URL (always prefers full resolution)
 */
export function getHighQualityImageUrl(mediaItem: {
  imagekit_url?: string | null;
  imagekit_thumbnail_url?: string | null;
  file_path?: string;
  thumbnail_path?: string;
}): string {
  return getImageUrl(mediaItem, false, true);
}

