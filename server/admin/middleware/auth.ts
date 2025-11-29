// Re-export from shared middleware location to avoid duplication
export { AuthRequest, authenticateToken, requireAdmin, requireRole } from '../../middleware/auth.js';
