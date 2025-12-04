import { Response } from 'express';

export interface SSEConnection {
  id: string;
  response: Response;
  createdAt: Date;
}

class SSEService {
  private connections: Map<string, SSEConnection> = new Map();

  /**
   * Create a new SSE connection
   */
  createConnection(connectionId: string, res: Response): void {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Flush headers immediately to establish connection (prevents Cloudflare 522 timeout)
    res.flushHeaders();

    // Store connection
    this.connections.set(connectionId, {
      id: connectionId,
      response: res,
      createdAt: new Date()
    });

    // Send initial connection event immediately
    this.send(connectionId, 'connected', { message: 'SSE connection established' });

    // Handle client disconnect
    res.on('close', () => {
      this.closeConnection(connectionId);
    });
  }

  /**
   * Send an event to a specific connection
   */
  send(connectionId: string, event: string, data: any): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      connection.response.write(message);
      // Flush the response immediately to prevent buffering
      if (connection.response.flushHeaders) {
        connection.response.flushHeaders();
      }
      return true;
    } catch (error) {
      console.error(`[SSE] Error sending event to ${connectionId}:`, error);
      this.closeConnection(connectionId);
      return false;
    }
  }

  /**
   * Send progress update
   */
  sendProgress(connectionId: string, progress: number, message: string, details?: any): boolean {
    return this.send(connectionId, 'progress', {
      progress,
      message,
      ...details
    });
  }

  /**
   * Send completion event
   */
  sendComplete(connectionId: string, data: any): boolean {
    const sent = this.send(connectionId, 'complete', data);
    this.closeConnection(connectionId);
    return sent;
  }

  /**
   * Send error event
   */
  sendError(connectionId: string, error: string, details?: any): boolean {
    const sent = this.send(connectionId, 'error', {
      error,
      ...details
    });
    this.closeConnection(connectionId);
    return sent;
  }

  /**
   * Close a connection
   */
  closeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        connection.response.end();
      } catch (error) {
        // Connection may already be closed
      }
      this.connections.delete(connectionId);
    }
  }

  /**
   * Check if a connection exists
   */
  hasConnection(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }

  /**
   * Get all active connections
   */
  getConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Clean up stale connections (older than 1 hour)
   */
  cleanupStaleConnections(): void {
    const now = new Date();
    const staleThreshold = 60 * 60 * 1000; // 1 hour

    for (const [id, connection] of this.connections.entries()) {
      const age = now.getTime() - connection.createdAt.getTime();
      if (age > staleThreshold) {
        console.log(`[SSE] Cleaning up stale connection: ${id}`);
        this.closeConnection(id);
      }
    }
  }
}

// Singleton instance
export const sseService = new SSEService();

// Clean up stale connections every 30 minutes
setInterval(() => {
  sseService.cleanupStaleConnections();
}, 30 * 60 * 1000);

