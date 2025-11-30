import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
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
import mediaRouter from './routes/media.js';
import comicsRouter from './routes/comics.js';
import emailsRouter from './routes/emails.js';
import emailSettingsRouter from './routes/emailSettings.js';
import { initDatabase } from './db/schema.js';
import { authenticateToken } from './middleware/auth.js';

// Ensure we load .env from multiple locations
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading .env from multiple locations (for Docker and local dev)
dotenv.config({ path: path.join(__dirname, '.env') }); // server/.env
dotenv.config({ path: path.join(__dirname, '../.env') }); // root .env
dotenv.config(); // Also load from process.env (Docker passes env vars directly)

// Log environment variable status on startup
console.log('[Server] Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `Set (${process.env.GEMINI_API_KEY.length} chars, starts with: ${process.env.GEMINI_API_KEY.substring(0, 8)}...)` : 'NOT SET',
  DB_HOST: process.env.DB_HOST,
  JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'NOT SET',
});

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure uploads directory exists before serving
const uploadsPath = path.join(__dirname, '../uploads');
const thumbnailsPath = path.join(uploadsPath, 'thumbnails');

console.log(`[Server] Uploads directory: ${uploadsPath}`);
console.log(`[Server] Thumbnails directory: ${thumbnailsPath}`);
console.log(`[Server] Uploads directory exists: ${fs.existsSync(uploadsPath)}`);

try {
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true, mode: 0o755 });
    console.log(`[Server] Created uploads directory: ${uploadsPath}`);
  }
  if (!fs.existsSync(thumbnailsPath)) {
    fs.mkdirSync(thumbnailsPath, { recursive: true, mode: 0o755 });
    console.log(`[Server] Created thumbnails directory: ${thumbnailsPath}`);
  }
} catch (error: any) {
  console.warn('Warning: Could not create uploads directory:', error.message);
  console.warn('Directory may be created by volume mount or needs manual creation');
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    // Log file requests for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Static] Serving file: ${filePath}`);
    }
  },
  fallthrough: false // Don't fall through to next middleware if file not found
}));

// Debug endpoint to check uploads directory
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug/uploads', (req, res) => {
    try {
      const files = fs.readdirSync(uploadsPath);
      const thumbnails = fs.readdirSync(thumbnailsPath);
      res.json({
        uploadsPath,
        thumbnailsPath,
        uploadsExists: fs.existsSync(uploadsPath),
        thumbnailsExists: fs.existsSync(thumbnailsPath),
        uploadFiles: files,
        thumbnailFiles: thumbnails
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, uploadsPath, thumbnailsPath });
    }
  });
}

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
    environment: process.env.NODE_ENV || 'development',
    geminiApiKey: process.env.GEMINI_API_KEY ? 'configured' : 'not configured'
  });
});

// Diagnostic endpoint for API key status (for debugging)
app.get('/api/debug/env', (req, res) => {
  res.json({
    geminiApiKey: {
      exists: !!process.env.GEMINI_API_KEY,
      length: process.env.GEMINI_API_KEY?.length || 0,
      startsWith: process.env.GEMINI_API_KEY?.substring(0, 8) || 'N/A',
      masked: process.env.GEMINI_API_KEY 
        ? process.env.GEMINI_API_KEY.substring(0, 8) + '...' + process.env.GEMINI_API_KEY.substring(process.env.GEMINI_API_KEY.length - 4)
        : 'NOT SET'
    },
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('API_KEY'))
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
app.use('/api/media', mediaRouter);
app.use('/api/comics', authenticateToken, comicsRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/email-settings', emailSettingsRouter);

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
    
    // Seed email settings from environment if available
    try {
      const { seedEmailSettings } = await import('./db/migrations/seedEmailSettings.js');
      await seedEmailSettings();
    } catch (error) {
      console.warn('⚠️  Could not seed email settings (this is OK if migration 024 not run yet):', error);
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

