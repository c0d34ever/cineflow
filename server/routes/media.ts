import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getPool } from '../db/index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import sharp from 'sharp';
import { uploadToImageKit, deleteFromImageKit, isImageKitAvailable } from '../services/imagekitService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

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

    res.json({
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
    });
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

// Get media for scene
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

    // Debug: Check for media in the same project but without scene_id
    if (rows.length === 0) {
      const [projectMedia] = await pool.query(
        'SELECT id, scene_id, file_name, created_at FROM media WHERE project_id = ? ORDER BY created_at DESC LIMIT 5',
        [sceneProjectId]
      ) as [any[], any];
      console.log(`Debug: Found ${projectMedia.length} recent media items in project ${sceneProjectId}:`, 
        projectMedia.map(m => ({ id: m.id, scene_id: m.scene_id, file: m.file_name, created: m.created_at })));
    }

    // Also check for any media with this scene_id but different format (debugging)
    if (rows.length === 0) {
      const [allMedia] = await pool.query(
        'SELECT id, scene_id, project_id, file_name FROM media WHERE project_id IN (SELECT project_id FROM scenes WHERE id = ?) LIMIT 10',
        [sceneId]
      ) as [any[], any];
      console.log(`Debug: Found ${allMedia.length} media items in same project (first 10):`, allMedia.map(m => ({ id: m.id, scene_id: m.scene_id, file: m.file_name })));
    }

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

    // Delete from database
    await pool.query('DELETE FROM media WHERE id = ?', [id]);

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

export default router;

