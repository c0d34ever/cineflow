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
  lazyConnect?: boolean; // Only connect when explicitly requested
}

// Global connection manager to prevent duplicate connections per scene
interface ConnectionData {
  refCount: number;
  eventSource: EventSource;
  callbacks: Set<{
    onMediaList?: (media: MediaItem[]) => void;
    onMediaAdded?: (media: MediaItem) => void;
    onMediaUpdated?: (media: MediaItem) => void;
    onMediaDeleted?: (mediaId: string) => void;
    setMedia: (updater: (prev: MediaItem[]) => MediaItem[]) => void;
  }>;
}
const sceneConnections = new Map<string, ConnectionData>();

export const useSceneMediaSSE = (options: UseSceneMediaSSEOptions) => {
  const {
    sceneId,
    onMediaList,
    onMediaAdded,
    onMediaUpdated,
    onMediaDeleted,
    autoConnect = true,
    lazyConnect = false
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

    // Check if there's already a connection for this scene
    const existingConnection = sceneConnections.get(sceneId);
    if (existingConnection) {
      // Increment reference count and reuse existing connection
      existingConnection.refCount++;
      eventSourceRef.current = existingConnection.eventSource;
      setIsConnected(true);
      
      // Add this component's callbacks to the existing connection
      existingConnection.callbacks.add({
        onMediaList,
        onMediaAdded,
        onMediaUpdated,
        onMediaDeleted,
        setMedia
      });
      
      console.log(`[useSceneMediaSSE] Reusing existing connection for scene ${sceneId} (refCount: ${existingConnection.refCount})`);
      return;
    }

    if (eventSourceRef.current) {
      console.warn('[useSceneMediaSSE] Already connected, closing existing connection');
      eventSourceRef.current.close();
    }

    const token = localStorage.getItem('auth_token');
    // Pass token in query string (SSE doesn't support custom headers)
    const url = `${API_BASE_URL}/media/scene/${sceneId}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    console.log('[useSceneMediaSSE] Creating new SSE connection for scene:', sceneId);
    
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

    // Store callbacks in the connection so all subscribers get updates
    const connectionData: ConnectionData = { 
      refCount: 1, 
      eventSource, 
      callbacks: new Set() 
    };
    
    // Add this component's callbacks to the connection
    connectionData.callbacks.add({
      onMediaList,
      onMediaAdded,
      onMediaUpdated,
      onMediaDeleted,
      setMedia
    });
    
    sceneConnections.set(sceneId, connectionData);

    eventSource.addEventListener('media_list', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        const mediaList = Array.isArray(data.media) ? data.media : [];
        // Update all subscribers
        connectionData.callbacks.forEach(cb => {
          cb.setMedia(() => mediaList);
          cb.onMediaList?.(mediaList);
        });
      } catch (error) {
        console.error('[useSceneMediaSSE] Error parsing media_list:', error);
      }
    });

    eventSource.addEventListener('media_added', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        const newMedia = data.media;
        // Update all subscribers
        connectionData.callbacks.forEach(cb => {
          cb.setMedia(prev => {
            if (prev.some(m => m.id === newMedia.id)) {
              return prev;
            }
            return [...prev, newMedia].sort((a, b) => 
              (a.display_order || 0) - (b.display_order || 0)
            );
          });
          cb.onMediaAdded?.(newMedia);
        });
      } catch (error) {
        console.error('[useSceneMediaSSE] Error parsing media_added:', error);
      }
    });

    eventSource.addEventListener('media_updated', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        const updatedMedia = data.media;
        // Update all subscribers
        connectionData.callbacks.forEach(cb => {
          cb.setMedia(prev => prev.map(m => m.id === updatedMedia.id ? updatedMedia : m));
          cb.onMediaUpdated?.(updatedMedia);
        });
      } catch (error) {
        console.error('[useSceneMediaSSE] Error parsing media_updated:', error);
      }
    });

    eventSource.addEventListener('media_deleted', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        const mediaId = data.media_id;
        // Update all subscribers
        connectionData.callbacks.forEach(cb => {
          cb.setMedia(prev => prev.filter(m => m.id !== mediaId));
          cb.onMediaDeleted?.(mediaId);
        });
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
  }, [sceneId, API_BASE_URL]); // Removed callbacks from dependencies - they're stored in connectionData

  const disconnect = useCallback(() => {
    if (!sceneId) return;
    
    const existingConnection = sceneConnections.get(sceneId);
    if (existingConnection) {
      // Remove this component's callbacks
      existingConnection.callbacks.forEach(cb => {
        if (cb.setMedia === setMedia) {
          existingConnection.callbacks.delete(cb);
        }
      });
      
      existingConnection.refCount--;
      console.log(`[useSceneMediaSSE] Disconnecting from scene ${sceneId} (refCount: ${existingConnection.refCount})`);
      
      // Only close connection if no more references
      if (existingConnection.refCount <= 0) {
        console.log(`[useSceneMediaSSE] Closing SSE connection for scene ${sceneId} (no more references)`);
        existingConnection.eventSource.close();
        sceneConnections.delete(sceneId);
      }
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, [sceneId, setMedia]);

  // Track connection state with refs to avoid re-renders
  const hasConnectedRef = useRef(false);
  const currentSceneIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const effectSceneId = sceneId; // Capture sceneId for this effect
    
    // Reset connection tracking if sceneId changes
    if (currentSceneIdRef.current !== effectSceneId) {
      // Disconnect from previous scene if it exists
      if (currentSceneIdRef.current && hasConnectedRef.current) {
        const prevSceneId = currentSceneIdRef.current;
        const existingConnection = sceneConnections.get(prevSceneId);
        if (existingConnection) {
          existingConnection.refCount--;
          console.log(`[useSceneMediaSSE] Scene changed, disconnecting from ${prevSceneId} (refCount: ${existingConnection.refCount})`);
          if (existingConnection.refCount <= 0) {
            existingConnection.eventSource.close();
            sceneConnections.delete(prevSceneId);
            console.log(`[useSceneMediaSSE] Closed connection for ${prevSceneId}`);
          }
        }
        hasConnectedRef.current = false;
      }
      currentSceneIdRef.current = effectSceneId;
    }

    if (lazyConnect) {
      // Don't auto-connect if lazy mode is enabled
      return () => {
        isMountedRef.current = false;
      };
    }
    
    if (autoConnect && effectSceneId && !hasConnectedRef.current && isMountedRef.current) {
      console.log(`[useSceneMediaSSE] Effect: Connecting to scene ${effectSceneId}`);
      connect();
      hasConnectedRef.current = true;
    } else if (!effectSceneId && hasConnectedRef.current) {
      console.log(`[useSceneMediaSSE] Effect: Disconnecting (no sceneId)`);
      disconnect();
      hasConnectedRef.current = false;
    }
    
    // Cleanup: only disconnect on unmount or sceneId change
    return () => {
      isMountedRef.current = false;
      // Only disconnect if sceneId matches AND we actually connected
      // This prevents cleanup from running on every render
      if (hasConnectedRef.current && currentSceneIdRef.current === effectSceneId) {
        console.log(`[useSceneMediaSSE] Cleanup: Disconnecting from scene ${effectSceneId}`);
        disconnect();
        hasConnectedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, lazyConnect, sceneId]); // Intentionally omitting connect/disconnect to prevent re-runs

  return { isConnected, media, connect, disconnect };
};

