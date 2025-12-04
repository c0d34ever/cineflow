import express, { Response } from 'express';
import { sseService } from '../services/sseService.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

/**
 * GET /api/sse/:connectionId
 * Establish SSE connection for progress updates
 * Note: EventSource doesn't support custom headers, so token is passed via query param
 */
router.get('/:connectionId', async (req: express.Request, res: Response) => {
  const connectionId = req.params.connectionId;
  
  // Extract token from query (EventSource doesn't support custom headers)
  const token = (req.query.token as string) || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Verify token
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;
    
    // Validate connection ID format
    if (!connectionId || connectionId.length < 10) {
      return res.status(400).json({ error: 'Invalid connection ID' });
    }

    // Create SSE connection
    sseService.createConnection(connectionId, res);

    console.error(`[SSE] Connection established: ${connectionId} for user ${userId}`);
    
    // Keep connection alive with periodic ping
    const pingInterval = setInterval(() => {
      if (sseService.hasConnection(connectionId)) {
        sseService.send(connectionId, 'ping', { timestamp: Date.now() });
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds

    // Clean up on disconnect
    res.on('close', () => {
      clearInterval(pingInterval);
    });
  } catch (error: any) {
    console.error('[SSE] Authentication error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;

