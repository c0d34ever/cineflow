import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createConnection } from './db';
import projectsRouter from './routes/projects';
import geminiRouter from './routes/gemini';
import apiKeysRouter from './routes/apiKeys';
import tagsRouter from './routes/tags';
import favoritesRouter from './routes/favorites';
import commentsRouter from './routes/comments';
import settingsRouter from './routes/settings';
import episodesRouter from './routes/episodes';
import clipsRouter from './routes/clips';
import userGeminiKeyRouter from './routes/userGeminiKey';
import { initDatabase } from './db/schema';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/projects', projectsRouter);
app.use('/api/gemini', geminiRouter);
app.use('/api/api-keys', apiKeysRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/episodes', episodesRouter);
app.use('/api/clips', clipsRouter);
app.use('/api/user', userGeminiKeyRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
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
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

