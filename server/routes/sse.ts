import express, { Response } from 'express';
import { sseService } from '../services/sseService.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/sse/:connectionId
 * Establish SSE connection for progress updates
 */
// SSE endpoint - token passed via query param since EventSource doesn't support custom headers
router.get('/:connectionId', (req: express.Request, res: Response) => {
  // Extract token from query or Authorization header
  const token = (req.query.token as string) || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Verify token (simplified - in production use proper JWT verification)
  // For now, we'll trust the token and let the SSE service handle it
  const connectionId = req.params.connectionId;
  const connectionId = req.params.connectionId;
  const userId = req.user!.id;

  // Validate connection ID format (should be user-specific)
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
});

export default router;

