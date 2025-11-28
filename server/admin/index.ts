import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createConnection } from '../db';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import projectsRouter from './routes/projects';
import statsRouter from './routes/stats';
import apiKeysRouter from './routes/apiKeys';
import { initDatabase } from '../db/schema';
import { authenticateToken, requireAdmin } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.ADMIN_PORT || 5001;

// CORS Configuration
const corsOptions = {
  origin: process.env.ADMIN_CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'admin',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Public routes
app.use('/api/auth', authRouter);

// Protected routes (require authentication)
app.use('/api/users', authenticateToken, usersRouter);
app.use('/api/projects', authenticateToken, projectsRouter);
app.use('/api/stats', authenticateToken, requireAdmin, statsRouter);
app.use('/api/api-keys', authenticateToken, requireAdmin, apiKeysRouter);

// Admin dashboard info (protected)
app.get('/api/admin/info', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    service: 'CineFlow Admin API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      projects: '/api/projects',
      stats: '/api/stats'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Admin API Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await createConnection();
    await initDatabase();
    console.log('✅ Database connected and initialized');
    
    app.listen(PORT, () => {
      console.log(`🚀 Admin API running on port ${PORT}`);
      console.log(`📊 Admin Dashboard: http://localhost:${PORT}/api/admin/info`);
    });
  } catch (error) {
    console.error('❌ Failed to start admin server:', error);
    process.exit(1);
  }
}

startServer();

