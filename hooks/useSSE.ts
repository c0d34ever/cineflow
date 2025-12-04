import { useEffect, useRef, useState, useCallback } from 'react';

export interface SSEEvent {
  event: string;
  data: any;
}

export interface UseSSEOptions {
  connectionId: string;
  onMessage?: (event: SSEEvent) => void;
  onProgress?: (progress: number, message: string, details?: any) => void;
  onComplete?: (data: any) => void;
  onError?: (error: string, details?: any) => void;
  onConnect?: () => void;
  autoConnect?: boolean;
}

export const useSSE = (options: UseSSEOptions) => {
  const {
    connectionId,
    onMessage,
    onProgress,
    onComplete,
    onError,
    onConnect,
    autoConnect = true
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);

  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

  const connect = useCallback(() => {
    if (!connectionId) {
      console.warn('[useSSE] No connection ID provided');
      return;
    }

    if (eventSourceRef.current) {
      console.warn('[useSSE] Already connected, closing existing connection');
      eventSourceRef.current.close();
    }

    const token = localStorage.getItem('auth_token');
    // Pass token in query string (SSE doesn't support custom headers)
    const url = `${API_BASE_URL}/sse/${connectionId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    console.log('[useSSE] Connecting to SSE:', url);
    
    // Create EventSource with token in URL (backend will extract it)
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('[useSSE] SSE connection opened');
      setIsConnected(true);
      onConnect?.();
    };

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const event: SSEEvent = {
          event: 'message',
          data
        };
        onMessage?.(event);
      } catch (error) {
        console.error('[useSSE] Error parsing message:', error);
      }
    };

    eventSource.addEventListener('connected', (e) => {
      console.log('[useSSE] Connected event received');
      setIsConnected(true);
      onConnect?.();
    });

    eventSource.addEventListener('progress', (e) => {
      try {
        const data = JSON.parse(e.data);
        const progressValue = data.progress || 0;
        const messageText = data.message || '';
        setProgress(progressValue);
        setMessage(messageText);
        onProgress?.(progressValue, messageText, data);
      } catch (error) {
        console.error('[useSSE] Error parsing progress:', error);
      }
    });

    eventSource.addEventListener('complete', (e) => {
      try {
        const data = JSON.parse(e.data);
        setProgress(100);
        onComplete?.(data);
        disconnect();
      } catch (error) {
        console.error('[useSSE] Error parsing complete:', error);
      }
    });

    eventSource.addEventListener('error', (e: any) => {
      try {
        const errorData = e.data ? JSON.parse(e.data) : { error: 'Unknown error' };
        onError?.(errorData.error || 'SSE error', errorData);
        disconnect();
      } catch (error) {
        console.error('[useSSE] Error parsing error event:', error);
        onError?.('SSE connection error', {});
        disconnect();
      }
    });

    eventSource.onerror = (error) => {
      console.error('[useSSE] EventSource error:', error);
      setIsConnected(false);
      // Don't call onError here as it might be a connection issue
      // The error event listener above will handle actual errors
    };

    eventSourceRef.current = eventSource;
  }, [connectionId, API_BASE_URL, onMessage, onProgress, onComplete, onError, onConnect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('[useSSE] Disconnecting SSE');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (autoConnect && connectionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connectionId, autoConnect, connect, disconnect]);

  return {
    isConnected,
    progress,
    message,
    connect,
    disconnect
  };
};

/**
 * Generate a unique connection ID
 */
export const generateConnectionId = (): string => {
  return `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

