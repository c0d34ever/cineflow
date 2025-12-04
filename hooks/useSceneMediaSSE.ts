import { useState, useEffect, useRef, useCallback } from 'react';

export interface MediaItem {
  id: string;
  project_id: string;
  scene_id: string | null;
  file_name: string;
  file_path: string;
  thumbnail_path: string;
  imagekit_url?: string | null;
  imagekit_thumbnail_url?: string | null;
  file_size: number;
  mime_type: string;
  width: number;
  height: number;
  alt_text?: string | null;
  description?: string | null;
  is_primary: boolean;
  display_order: number;
  created_at?: string;
}

export interface UseSceneMediaSSEOptions {
  sceneId: string | null;
  onMediaList?: (media: MediaItem[]) => void;
  onMediaAdded?: (media: MediaItem) => void;
  onMediaUpdated?: (media: MediaItem) => void;
  onMediaDeleted?: (mediaId: string) => void;
  autoConnect?: boolean;
}

export const useSceneMediaSSE = (options: UseSceneMediaSSEOptions) => {
  const {
    sceneId,
    onMediaList,
    onMediaAdded,
    onMediaUpdated,
    onMediaDeleted,
    autoConnect = true
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

  const connect = useCallback(() => {
    if (!sceneId) {
      console.warn('[useSceneMediaSSE] No scene ID provided');
      return;
    }

    if (eventSourceRef.current) {
      console.warn('[useSceneMediaSSE] Already connected, closing existing connection');
      eventSourceRef.current.close();
    }

    const token = localStorage.getItem('auth_token');
    // Pass token in query string (SSE doesn't support custom headers)
    const url = `${API_BASE_URL}/media/scene/${sceneId}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    console.log('[useSceneMediaSSE] Connecting to SSE:', url);
    
    // Create EventSource with token in URL
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('[useSceneMediaSSE] SSE connection opened');
      setIsConnected(true);
    };

    eventSource.addEventListener('connected', () => {
      console.log('[useSceneMediaSSE] Connected event received');
      setIsConnected(true);
    });

    eventSource.addEventListener('media_list', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        const mediaList = Array.isArray(data.media) ? data.media : [];
        setMedia(mediaList);
        onMediaList?.(mediaList);
      } catch (error) {
        console.error('[useSceneMediaSSE] Error parsing media_list:', error);
      }
    });

    eventSource.addEventListener('media_added', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        const newMedia = data.media;
        setMedia(prev => {
          // Check if media already exists (avoid duplicates)
          if (prev.some(m => m.id === newMedia.id)) {
            return prev;
          }
          // Add new media and sort by display_order
          const updated = [...prev, newMedia].sort((a, b) => 
            (a.display_order || 0) - (b.display_order || 0)
          );
          return updated;
        });
        onMediaAdded?.(newMedia);
      } catch (error) {
        console.error('[useSceneMediaSSE] Error parsing media_added:', error);
      }
    });

    eventSource.addEventListener('media_updated', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        const updatedMedia = data.media;
        setMedia(prev => prev.map(m => m.id === updatedMedia.id ? updatedMedia : m));
        onMediaUpdated?.(updatedMedia);
      } catch (error) {
        console.error('[useSceneMediaSSE] Error parsing media_updated:', error);
      }
    });

    eventSource.addEventListener('media_deleted', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        const mediaId = data.media_id;
        setMedia(prev => prev.filter(m => m.id !== mediaId));
        onMediaDeleted?.(mediaId);
      } catch (error) {
        console.error('[useSceneMediaSSE] Error parsing media_deleted:', error);
      }
    });

    eventSource.addEventListener('ping', () => {
      // Keep-alive ping, no action needed
    });

    eventSource.onerror = (error) => {
      console.error('[useSceneMediaSSE] SSE Error:', error);
      setIsConnected(false);
      // EventSource will automatically try to reconnect
    };

    eventSourceRef.current = eventSource;
  }, [sceneId, onMediaList, onMediaAdded, onMediaUpdated, onMediaDeleted, API_BASE_URL]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('[useSceneMediaSSE] Disconnecting from SSE');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (autoConnect && sceneId && !isConnected) {
      connect();
    } else if (!sceneId && isConnected) {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, sceneId, isConnected, connect, disconnect]);

  return { isConnected, media, connect, disconnect };
};

