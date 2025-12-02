/**
 * Image Cache Utility
 * Provides caching and optimization for images
 */

interface CachedImage {
  url: string;
  blob: Blob;
  timestamp: number;
  expiresAt: number;
}

class ImageCache {
  private cache: Map<string, CachedImage> = new Map();
  private readonly MAX_CACHE_SIZE = 50; // Maximum number of cached images
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get image from cache or fetch and cache it
   */
  async getImage(url: string): Promise<string> {
    const cached = this.cache.get(url);
    
    // Check if cached and not expired
    if (cached && Date.now() < cached.expiresAt) {
      return URL.createObjectURL(cached.blob);
    }

    // Fetch and cache
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      // Cache the image
      this.cacheImage(url, blob);

      return objectUrl;
    } catch (error) {
      console.error('Failed to load image:', error);
      throw error;
    }
  }

  /**
   * Cache an image
   */
  private cacheImage(url: string, blob: Blob): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      const oldest = this.cache.get(oldestKey);
      if (oldest) {
        URL.revokeObjectURL(URL.createObjectURL(oldest.blob));
      }
      this.cache.delete(oldestKey);
    }

    this.cache.set(url, {
      url,
      blob,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_DURATION
    });
  }

  /**
   * Preload images
   */
  async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.slice(0, 5).map(url => this.getImage(url).catch(() => null));
    await Promise.all(promises);
  }

  /**
   * Clear expired cache entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [url, cached] of this.cache.entries()) {
      if (now >= cached.expiresAt) {
        URL.revokeObjectURL(URL.createObjectURL(cached.blob));
        this.cache.delete(url);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    for (const cached of this.cache.values()) {
      URL.revokeObjectURL(URL.createObjectURL(cached.blob));
    }
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE
    };
  }
}

// Singleton instance
export const imageCache = new ImageCache();

// Clean up expired cache every hour
if (typeof window !== 'undefined') {
  setInterval(() => {
    imageCache.clearExpired();
  }, 60 * 60 * 1000); // 1 hour
}

