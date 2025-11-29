import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createConnection } from './db/index.js';
import authRouter from './routes/auth.js';
import projectsRouter from './routes/projects.js';
import geminiRouter from './routes/gemini.js';
import apiKeysRouter from './routes/apiKeys.js';
import tagsRouter from './routes/tags.js';
import favoritesRouter from './routes/favorites.js';
import commentsRouter from './routes/comments.js';
import settingsRouter from './routes/settings.js';
import episodesRouter from './routes/episodes.js';
import clipsRouter from './routes/clips.js';
import userGeminiKeyRouter from './routes/userGeminiKey.js';
import exportsRouter from './routes/exports.js';
import sceneNotesRouter from './routes/sceneNotes.js';
import templatesRouter from './routes/templates.js';
import charactersRouter from './routes/characters.js';
import sharingRouter from './routes/sharing.js';
import locationsRouter from './routes/locations.js';
import analyticsRouter from './routes/analytics.js';
import sceneTemplatesRouter from './routes/sceneTemplates.js';
import activityRouter from './routes/activity.js';
import { initDatabase } from './db/schema.js';
import { authenticateToken } from './middleware/auth.js';

// Ensure we load .env from the server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

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
// Authentication (available to all users)
app.use('/api/auth', authRouter);
// Regular user operations (require authentication)
app.use('/api/projects', authenticateToken, projectsRouter);
app.use('/api/gemini', geminiRouter);
app.use('/api/api-keys', apiKeysRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/episodes', episodesRouter);
app.use('/api/clips', clipsRouter);
app.use('/api/user', userGeminiKeyRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/scene-notes', sceneNotesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/characters', charactersRouter);
app.use('/api/sharing', sharingRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/scene-templates', sceneTemplatesRouter);
app.use('/api/activity', activityRouter);

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

