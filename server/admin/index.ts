import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createConnection } from '../db/index.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import projectsRouter from './routes/projects.js';
import statsRouter from './routes/stats.js';
import apiKeysRouter from './routes/apiKeys.js';
import { initDatabase } from '../db/schema.js';
import { authenticateToken, requireAdmin } from './middleware/auth.js';

// Ensure we load .env from the server directory (parent of admin)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

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

// Error handler - MUST be last middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Admin API Error:', err);
  
  // Ensure we always send JSON, not HTML
  if (!res.headersSent) {
    res.status(err.status || 500).json({ 
      error: err.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Initialize database and start server
async function startServer() {
  try {
    // Retry database connection with timeout handling
    let retries = 3;
    let lastError: any = null;
    
    while (retries > 0) {
      try {
        await createConnection();
        await initDatabase();
        console.log('✅ Database connected and initialized');
        break;
      } catch (error: any) {
        lastError = error;
        retries--;
        if (retries > 0) {
          console.log(`⚠️  Database connection attempt failed, retrying in 2 seconds... (${3 - retries}/3)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (retries === 0) {
      console.error('❌ Failed to connect to database after 3 attempts:', lastError);
      // Still start the server - it might recover later
      console.log('⚠️  Starting admin server anyway - database connection may recover');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Admin API running on port ${PORT}`);
      console.log(`📊 Admin Dashboard: http://localhost:${PORT}/api/admin/info`);
    });
  } catch (error) {
    console.error('❌ Failed to start admin server:', error);
    process.exit(1);
  }
}

startServer();

