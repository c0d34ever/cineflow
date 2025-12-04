import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getPool } from '../db/index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import sharp from 'sharp';
import { uploadToImageKit, deleteFromImageKit, isImageKitAvailable } from '../services/imagekitService.js';
import { removeBackground, removeBackgroundFromBuffer, isBackgroundRemovalAvailable } from '../services/backgroundRemoverService.js';
import { sseService } from '../services/sseService.js';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Store scene media SSE connections: sceneId -> Set of connectionIds
const sceneMediaConnections = new Map<string, Set<string>>();

// Helper to notify all connections watching a scene
function notifySceneMediaUpdate(sceneId: string, event: string, data: any) {
  const connections = sceneMediaConnections.get(sceneId);
  if (connections) {
    connections.forEach(connectionId => {
      sseService.send(connectionId, event, data);
    });
  }
}

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '../../uploads');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

// Create directories with error handling for permission issues
// This is non-fatal - directories may be created by volume mount
// If creation fails, we'll try again on first upload
const ensureDirectories = () => {
  [uploadsDir, thumbnailsDir].forEach(dir => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
        console.log(`✓ Created directory: ${dir}`);
      }
    } catch (error: any) {
      // Non-fatal: directory might be created by volume mount
      // Log warning but don't fail - will try again on first upload
      if (error.code !== 'EACCES' && error.code !== 'EAGAIN') {
        console.warn(`⚠ Could not create directory ${dir}:`, error.message);
      } else {
        console.warn(`⚠ Permission denied creating ${dir} - ensure host directory has correct permissions`);
      }
    }
  });
};

// Try to create directories on module load (non-fatal)
ensureDirectories();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `media-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Configure multer for multiple file uploads
const uploadMultiple = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Generate thumbnail
async function generateThumbnail(inputPath: string, outputPath: string): Promise<void> {
  await sharp(inputPath)
    .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(outputPath);
}

// Get image dimensions
async function getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
  const metadata = await sharp(filePath).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0
  };
}

// Upload image
router.post('/upload', authenticateToken, upload.single('image'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Ensure directories exist before upload (try again in case they weren't created at startup)
  ensureDirectories();
  
  try {
    // Handle multer file size errors
    if (req.file === undefined && req.headers['content-length']) {
      const fileSize = parseInt(req.headers['content-length']);
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (fileSize > maxSize) {
        return res.status(413).json({ 
          error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB. Your file is ${(fileSize / (1024 * 1024)).toFixed(2)}MB.` 
        });
      }
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse form data - multer puts text fields in req.body
    const project_id = req.body.project_id;
    const scene_id = req.body.scene_id;
    const alt_text = req.body.alt_text;
    const description = req.body.description;
    const is_primary = req.body.is_primary;
    const userId = req.user!.id;

    console.log('Upload request:', { 
      project_id, 
      scene_id, 
      scene_id_type: typeof scene_id,
      scene_id_length: scene_id ? scene_id.length : 0,
      file: req.file?.filename,
      body_keys: Object.keys(req.body)
    });

    if (!project_id) {
      // Clean up uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'project_id is required' });
    }

    // Get image dimensions
    const dimensions = await getImageDimensions(req.file.path);

    // Try ImageKit upload first, fallback to local storage
    let imagekitUrl: string | null = null;
    let imagekitThumbnailUrl: string | null = null;
    let imagekitFileId: string | null = null;
    let filePath: string;
    let thumbnailPath: string;

    if (isImageKitAvailable()) {
      try {
        const folder = scene_id ? `/cineflow/projects/${project_id}/scenes/${scene_id}` : `/cineflow/projects/${project_id}`;
        const imagekitResult = await uploadToImageKit(req.file.path, req.file.originalname, folder);
        
        if (imagekitResult) {
          imagekitUrl = imagekitResult.url;
          imagekitThumbnailUrl = imagekitResult.thumbnailUrl || null;
          imagekitFileId = imagekitResult.fileId;
          console.log('✅ Image uploaded to ImageKit:', imagekitUrl);
          
          // Still generate local thumbnail for fallback
          const thumbnailName = `thumb-${path.basename(req.file.filename)}`;
          thumbnailPath = path.join(thumbnailsDir, thumbnailName);
          await generateThumbnail(req.file.path, thumbnailPath);
          filePath = `/uploads/${req.file.filename}`;
          thumbnailPath = `/uploads/thumbnails/${thumbnailName}`;
        } else {
          console.warn('⚠️ ImageKit upload failed, falling back to local storage');
          // Fall through to local storage
          const thumbnailName = `thumb-${path.basename(req.file.filename)}`;
          thumbnailPath = path.join(thumbnailsDir, thumbnailName);
          await generateThumbnail(req.file.path, thumbnailPath);
          filePath = `/uploads/${req.file.filename}`;
          thumbnailPath = `/uploads/thumbnails/${thumbnailName}`;
        }
      } catch (error: any) {
        console.warn('⚠️ ImageKit upload error, falling back to local storage:', error.message);
        // Fall through to local storage
        const thumbnailName = `thumb-${path.basename(req.file.filename)}`;
        thumbnailPath = path.join(thumbnailsDir, thumbnailName);
        await generateThumbnail(req.file.path, thumbnailPath);
        filePath = `/uploads/${req.file.filename}`;
        thumbnailPath = `/uploads/thumbnails/${thumbnailName}`;
      }
    } else {
      // ImageKit not available, use local storage
      const thumbnailName = `thumb-${path.basename(req.file.filename)}`;
      thumbnailPath = path.join(thumbnailsDir, thumbnailName);
      await generateThumbnail(req.file.path, thumbnailPath);
      filePath = `/uploads/${req.file.filename}`;
      thumbnailPath = `/uploads/thumbnails/${thumbnailName}`;
    }

    // Generate unique ID
    const mediaId = `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get display order (max + 1 for this scene/project)
    const pool = getPool();
    const [orderResult] = await pool.query(
      'SELECT MAX(display_order) as max_order FROM media WHERE project_id = ? AND (scene_id = ? OR scene_id IS NULL)',
      [project_id, scene_id || null]
    ) as [any[], any];
    const displayOrder = ((orderResult[0]?.max_order || 0) as number) + 1;

    // Save to database (with ImageKit URLs if available)
    const [result] = await pool.query(
      `INSERT INTO media (id, project_id, scene_id, user_id, file_name, file_path, file_size, mime_type, width, height, thumbnail_path, imagekit_url, imagekit_thumbnail_url, imagekit_file_id, alt_text, description, is_primary, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mediaId,
        project_id,
        scene_id || null,
        userId,
        req.file.originalname,
        filePath,
        req.file.size,
        req.file.mimetype,
        dimensions.width,
        dimensions.height,
        thumbnailPath,
        imagekitUrl,
        imagekitThumbnailUrl,
        imagekitFileId,
        alt_text || null,
        description || null,
        is_primary === 'true' ? 1 : 0,
        displayOrder
      ]
    ) as [any, any];

    console.log('Media saved:', { 
      mediaId, 
      project_id, 
      scene_id: scene_id || null, 
      file_path: filePath,
      imagekit_url: imagekitUrl,
      storage: imagekitUrl ? 'ImageKit' : 'Local'
    });

    // If this is marked as primary, unset others and update scene thumbnail
    if (is_primary === 'true') {
      await pool.query(
        'UPDATE media SET is_primary = 0 WHERE project_id = ? AND (scene_id = ? OR scene_id IS NULL) AND id != ?',
        [project_id, scene_id || null, mediaId]
      );
      
      // Update scene thumbnail_url if this is for a scene (prefer ImageKit URL)
      if (scene_id) {
        const thumbnailUrl = imagekitThumbnailUrl || thumbnailPath;
        await pool.query(
          'UPDATE scenes SET thumbnail_url = ? WHERE id = ?',
          [thumbnailUrl, scene_id]
        );
      }
    }

    const mediaResponse = {
      id: mediaId,
      project_id,
      scene_id: scene_id || null,
      file_name: req.file.originalname,
      file_path: filePath,
      thumbnail_path: thumbnailPath,
      imagekit_url: imagekitUrl,
      imagekit_thumbnail_url: imagekitThumbnailUrl,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      width: dimensions.width,
      height: dimensions.height,
      alt_text: alt_text || null,
      description: description || null,
      is_primary: is_primary === 'true',
      display_order: displayOrder
    };

    // Notify SSE connections if this is for a scene
    if (scene_id) {
      notifySceneMediaUpdate(scene_id, 'media_added', {
        scene_id,
        media: mediaResponse
      });
    }

    res.json(mediaResponse);
  } catch (error: any) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }
    
    console.error('Error uploading media:', error);
    
    // Handle multer errors specifically
    if (error.name === 'MulterError') {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          error: `File too large. Maximum size is 50MB. Please compress your image or use a smaller file.` 
        });
      }
      return res.status(400).json({ error: `Upload error: ${error.message}` });
    }
    
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// Get media for project
router.get('/project/:projectId', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { scene_id } = req.query;

    const pool = getPool();
    let query = 'SELECT * FROM media WHERE project_id = ?';
    const params: any[] = [projectId];

    if (scene_id) {
      query += ' AND scene_id = ?';
      params.push(scene_id);
    } else {
      query += ' AND scene_id IS NULL';
    }

    query += ' ORDER BY display_order ASC, created_at ASC';

    const [rows] = await pool.query(query, params) as [any[], any];

    res.json({ media: rows });
  } catch (error: any) {
    console.error('Error fetching media:', error);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// SSE endpoint for scene media updates (MUST be before /scene/:sceneId to avoid route conflict)
// Note: EventSource doesn't support custom headers, so token is passed via query param
router.get('/scene/:sceneId/stream', async (req: express.Request, res: Response) => {
  // Extract token from query (EventSource doesn't support custom headers)
  let token = (req.query.token as string) || req.headers.authorization?.replace('Bearer ', '');
  
  // Decode token if it's URL encoded
  if (token) {
    try {
      token = decodeURIComponent(token);
    } catch (e) {
      // Token might not be encoded, continue with original
    }
  }
  
  if (!token) {
    console.error('[Media SSE] No token provided');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { sceneId } = req.params;

  // Verify token
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;
    
    // Verify user still exists and is active
    const pool = getPool();
    const [usersResult] = await pool.query(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ?',
      [userId]
    ) as [any[], any];

    const users = Array.isArray(usersResult) ? usersResult : [];
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = users[0] as any;
    if (!user.is_active) {
      return res.status(403).json({ error: 'User account is inactive' });
    }
    
    // Verify scene exists and user has access
    const [sceneCheck] = await pool.query(
      'SELECT id, project_id FROM scenes WHERE id = ?',
      [sceneId]
    ) as [any[], any];

    if (sceneCheck.length === 0) {
      return res.status(404).json({ error: 'Scene not found' });
    }
    
    const connectionId = `scene-media-${sceneId}-${userId}-${Date.now()}`;
    
    // Store connection for this scene
    if (!sceneMediaConnections.has(sceneId)) {
      sceneMediaConnections.set(sceneId, new Set());
    }
    sceneMediaConnections.get(sceneId)!.add(connectionId);
    
    // Create SSE connection (this sets headers and sends initial 'connected' event)
    sseService.createConnection(connectionId, res);
    
    console.error(`[Media SSE] Connection established: ${connectionId} for scene ${sceneId}, user ${userId}`);
    
    // Send initial media list immediately (don't await - send async)
    pool.query(
      'SELECT * FROM media WHERE scene_id = ? ORDER BY display_order ASC, created_at ASC',
      [sceneId]
    ).then(([rows]: any) => {
      sseService.send(connectionId, 'media_list', {
        scene_id: sceneId,
        media: Array.isArray(rows) ? rows : []
      });
    }).catch((error) => {
      console.error('Error sending initial media list:', error);
      // Send empty list on error
      sseService.send(connectionId, 'media_list', {
        scene_id: sceneId,
        media: []
      });
    });
    
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
      const connections = sceneMediaConnections.get(sceneId);
      if (connections) {
        connections.delete(connectionId);
        if (connections.size === 0) {
          sceneMediaConnections.delete(sceneId);
        }
      }
      sseService.closeConnection(connectionId);
    });
  } catch (error: any) {
    console.error('[Media SSE] Authentication error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired', expiredAt: error.expiredAt });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token', details: error.message });
    }
    return res.status(401).json({ error: 'Token verification failed', details: error.message });
  }
});

// Get media for scene (regular API endpoint - still used for initial load)
// NOTE: This route must come AFTER /scene/:sceneId/stream to avoid route conflicts
router.get('/scene/:sceneId', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { sceneId } = req.params;
    const pool = getPool();

    console.log('Fetching media for scene:', sceneId);

    // First, check if scene exists
    const [sceneCheck] = await pool.query(
      'SELECT id, project_id FROM scenes WHERE id = ?',
      [sceneId]
    ) as [any[], any];

    if (sceneCheck.length === 0) {
      console.log(`⚠️ Scene ${sceneId} does not exist in database`);
      return res.json({ media: [] });
    }

    const sceneProjectId = sceneCheck[0].project_id;
    console.log(`Scene ${sceneId} exists, belongs to project ${sceneProjectId}`);

    const [rows] = await pool.query(
      'SELECT * FROM media WHERE scene_id = ? ORDER BY display_order ASC, created_at ASC',
      [sceneId]
    ) as [any[], any];

    console.log(`Found ${rows.length} media items for scene ${sceneId}`);

    res.json({ media: rows });
  } catch (error: any) {
    console.error('Error fetching scene media:', error);
    res.status(500).json({ error: 'Failed to fetch scene media' });
  }
});

// Update media metadata
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { alt_text, description, is_primary, display_order } = req.body;

    const pool = getPool();

    // Get current media to check project_id and scene_id
    const [currentMedia] = await pool.query(
      'SELECT project_id, scene_id FROM media WHERE id = ?',
      [id]
    ) as [any[], any];

    if (currentMedia.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const { project_id, scene_id } = currentMedia[0];

    // If setting as primary, unset others and update scene thumbnail
    if (is_primary === true) {
      await pool.query(
        'UPDATE media SET is_primary = 0 WHERE project_id = ? AND (scene_id = ? OR scene_id IS NULL) AND id != ?',
        [project_id, scene_id || null, id]
      );
      
      // Get the media item to update scene thumbnail
      const [mediaItem] = await pool.query(
        'SELECT thumbnail_path FROM media WHERE id = ?',
        [id]
      ) as [any[], any];
      
      // Update scene thumbnail_url if this is for a scene
      if (scene_id && mediaItem && mediaItem.length > 0 && mediaItem[0].thumbnail_path) {
        await pool.query(
          'UPDATE scenes SET thumbnail_url = ? WHERE id = ?',
          [mediaItem[0].thumbnail_path, scene_id]
        );
      }
    }

    // Update media
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (alt_text !== undefined) {
      updateFields.push('alt_text = ?');
      updateValues.push(alt_text);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (is_primary !== undefined) {
      updateFields.push('is_primary = ?');
      updateValues.push(is_primary ? 1 : 0);
    }
    if (display_order !== undefined) {
      updateFields.push('display_order = ?');
      updateValues.push(display_order);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(id);

    await pool.query(
      `UPDATE media SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const [updated] = await pool.query('SELECT * FROM media WHERE id = ?', [id]) as [any[], any];

    // Notify SSE connections if this is for a scene
    if (scene_id) {
      notifySceneMediaUpdate(scene_id, 'media_updated', {
        scene_id,
        media: updated[0]
      });
    }

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Error updating media:', error);
    res.status(500).json({ error: 'Failed to update media' });
  }
});

// Delete media
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Get file paths and ImageKit info before deleting
    const [media] = await pool.query(
      'SELECT file_path, thumbnail_path, imagekit_file_id FROM media WHERE id = ?',
      [id]
    ) as [any[], any];

    if (media.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const mediaItem = media[0];

    // Delete from ImageKit if available
    if (mediaItem.imagekit_file_id) {
      try {
        await deleteFromImageKit(mediaItem.imagekit_file_id);
        console.log('✅ Deleted from ImageKit:', mediaItem.imagekit_file_id);
      } catch (error: any) {
        console.warn('⚠️ Failed to delete from ImageKit:', error.message);
        // Continue with local file deletion
      }
    }

    // Get scene_id before deleting
    const [mediaBeforeDelete] = await pool.query(
      'SELECT scene_id FROM media WHERE id = ?',
      [id]
    ) as [any[], any];
    const scene_id = mediaBeforeDelete[0]?.scene_id;

    // Delete from database
    await pool.query('DELETE FROM media WHERE id = ?', [id]);

    // Notify SSE connections if this was for a scene
    if (scene_id) {
      notifySceneMediaUpdate(scene_id, 'media_deleted', {
        scene_id,
        media_id: id
      });
    }

    // Delete local files (if they exist)
    const filePath = path.join(__dirname, '../..', mediaItem.file_path);
    const thumbPath = path.join(__dirname, '../..', mediaItem.thumbnail_path);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error: any) {
        console.warn('⚠️ Failed to delete local file:', error.message);
      }
    }
    if (fs.existsSync(thumbPath)) {
      try {
        fs.unlinkSync(thumbPath);
      } catch (error: any) {
        console.warn('⚠️ Failed to delete local thumbnail:', error.message);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

// Associate media with scene
router.post('/:id/associate', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { scene_id } = req.body;

    const pool = getPool();
    await pool.query(
      'UPDATE media SET scene_id = ? WHERE id = ?',
      [scene_id || null, id]
    );

    const [updated] = await pool.query('SELECT * FROM media WHERE id = ?', [id]) as [any[], any];

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Error associating media:', error);
    res.status(500).json({ error: 'Failed to associate media' });
  }
});

// Remove background from image
router.post('/remove-background', authenticateToken, upload.single('image'), async (req: AuthRequest, res: Response) => {
  ensureDirectories();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!isBackgroundRemovalAvailable()) {
      return res.status(503).json({ error: 'Background removal service not available.' });
    }

    const result = await removeBackground(req.file.path);
    
    if (!result) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: 'Failed to remove background' });
    }

    // Upload processed image to ImageKit if available
    let imagekitUrl: string | null = null;
    let imagekitThumbnailUrl: string | null = null;
    let imagekitFileId: string | null = null;

    if (isImageKitAvailable()) {
      try {
        const imagekitResult = await uploadToImageKit(result.processedPath, 'nobg-' + req.file.originalname, '/cineflow/processed');
        if (imagekitResult) {
          imagekitUrl = imagekitResult.url;
          imagekitThumbnailUrl = imagekitResult.thumbnailUrl || null;
          imagekitFileId = imagekitResult.fileId;
        }
      } catch (error: any) {
        console.warn('ImageKit upload failed for processed image:', error.message);
      }
    }

    // Generate thumbnail
    const thumbnailName = `thumb-${path.basename(result.processedPath)}`;
    const thumbnailPath = path.join(thumbnailsDir, thumbnailName);
    await generateThumbnail(result.processedPath, thumbnailPath);

    res.json({
      success: true,
      processedPath: `/uploads/${path.basename(result.processedPath)}`,
      thumbnailPath: `/uploads/thumbnails/${thumbnailName}`,
      imagekit_url: imagekitUrl,
      imagekit_thumbnail_url: imagekitThumbnailUrl,
      imagekit_file_id: imagekitFileId,
    });
  } catch (error: any) {
    console.error('Background removal error:', error);
    res.status(500).json({ error: error.message || 'Failed to remove background' });
  }
});

// Bulk upload images
router.post('/bulk-upload', authenticateToken, uploadMultiple.array('images', 20), async (req: AuthRequest, res: Response) => {
  ensureDirectories();
  
  try {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const files = Array.isArray(req.files) ? req.files : [req.files];
    const project_id = req.body.project_id;
    const scene_id = req.body.scene_id;
    const remove_bg = req.body.remove_bg === 'true' || req.body.remove_bg === true;
    const userId = req.user!.id;

    if (!project_id) {
      // Clean up uploaded files
      files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {}
      });
      return res.status(400).json({ error: 'project_id is required' });
    }

    const results = [];
    const pool = getPool();

    for (const file of files) {
      try {
        let processedPath = file.path;
        let processedBuffer: Buffer | undefined;

        // Remove background if requested
        if (remove_bg && isBackgroundRemovalAvailable()) {
          const bgResult = await removeBackground(file.path);
          if (bgResult) {
            processedPath = bgResult.processedPath;
            processedBuffer = bgResult.buffer;
            // Clean up original
            try {
              fs.unlinkSync(file.path);
            } catch (e) {}
          }
        }

        // Get image dimensions
        const dimensions = await getImageDimensions(processedPath);

        // Try ImageKit upload
        let imagekitUrl: string | null = null;
        let imagekitThumbnailUrl: string | null = null;
        let imagekitFileId: string | null = null;
        let filePath: string;
        let thumbnailPath: string;

        if (isImageKitAvailable()) {
          try {
            const folder = scene_id ? `/cineflow/projects/${project_id}/scenes/${scene_id}` : `/cineflow/projects/${project_id}`;
            const imagekitResult = await uploadToImageKit(processedPath, file.originalname, folder);
            
            if (imagekitResult) {
              imagekitUrl = imagekitResult.url;
              imagekitThumbnailUrl = imagekitResult.thumbnailUrl || null;
              imagekitFileId = imagekitResult.fileId;
            }
          } catch (error: any) {
            console.warn('ImageKit upload failed:', error.message);
          }
        }

        // Generate thumbnail
        const thumbnailName = `thumb-${path.basename(processedPath)}`;
        const thumbnailPathFull = path.join(thumbnailsDir, thumbnailName);
        await generateThumbnail(processedPath, thumbnailPathFull);
        filePath = `/uploads/${path.basename(processedPath)}`;
        thumbnailPath = `/uploads/thumbnails/${thumbnailName}`;

        // Save to database
        const [result] = await pool.query(
          `INSERT INTO media (project_id, scene_id, user_id, file_path, thumbnail_path, imagekit_url, imagekit_thumbnail_url, imagekit_file_id, width, height, alt_text, description, is_primary)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            project_id,
            scene_id || null,
            userId,
            filePath,
            thumbnailPath,
            imagekitUrl,
            imagekitThumbnailUrl,
            imagekitFileId,
            dimensions.width,
            dimensions.height,
            req.body.alt_text || null,
            req.body.description || null,
            req.body.is_primary === 'true' || req.body.is_primary === true ? 1 : 0,
          ]
        ) as [any, any];

        results.push({
          id: (result as any).insertId,
          file_path: filePath,
          thumbnail_path: thumbnailPath,
          imagekit_url: imagekitUrl,
          imagekit_thumbnail_url: imagekitThumbnailUrl,
          width: dimensions.width,
          height: dimensions.height,
          original_name: file.originalname,
        });
      } catch (error: any) {
        console.error(`Error processing file ${file.originalname}:`, error);
        results.push({
          error: error.message,
          original_name: file.originalname,
        });
      }
    }

    res.json({
      success: true,
      uploaded: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length,
      results,
    });
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload images' });
  }
});

export default router;

