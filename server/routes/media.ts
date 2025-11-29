import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getPool } from '../db/index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '../../uploads');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

[uploadsDir, thumbnailsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

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
    fileSize: 10 * 1024 * 1024, // 10MB limit
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
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { project_id, scene_id, alt_text, description, is_primary } = req.body;
    const userId = req.user!.id;

    if (!project_id) {
      // Clean up uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'project_id is required' });
    }

    // Get image dimensions
    const dimensions = await getImageDimensions(req.file.path);

    // Generate thumbnail
    const thumbnailName = `thumb-${path.basename(req.file.filename)}`;
    const thumbnailPath = path.join(thumbnailsDir, thumbnailName);
    await generateThumbnail(req.file.path, thumbnailPath);

    // Generate unique ID
    const mediaId = `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get display order (max + 1 for this scene/project)
    const pool = getPool();
    const [orderResult] = await pool.query(
      'SELECT MAX(display_order) as max_order FROM media WHERE project_id = ? AND (scene_id = ? OR scene_id IS NULL)',
      [project_id, scene_id || null]
    ) as [any[], any];
    const displayOrder = ((orderResult[0]?.max_order || 0) as number) + 1;

    // Save to database
    const [result] = await pool.query(
      `INSERT INTO media (id, project_id, scene_id, user_id, file_name, file_path, file_size, mime_type, width, height, thumbnail_path, alt_text, description, is_primary, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mediaId,
        project_id,
        scene_id || null,
        userId,
        req.file.originalname,
        `/uploads/${req.file.filename}`,
        req.file.size,
        req.file.mimetype,
        dimensions.width,
        dimensions.height,
        `/uploads/thumbnails/${thumbnailName}`,
        alt_text || null,
        description || null,
        is_primary === 'true' ? 1 : 0,
        displayOrder
      ]
    ) as [any, any];

    // If this is marked as primary, unset other primary images for this scene/project
    if (is_primary === 'true') {
      await pool.query(
        'UPDATE media SET is_primary = 0 WHERE project_id = ? AND (scene_id = ? OR scene_id IS NULL) AND id != ?',
        [project_id, scene_id || null, mediaId]
      );
    }

    res.json({
      id: mediaId,
      project_id,
      scene_id: scene_id || null,
      file_name: req.file.originalname,
      file_path: `/uploads/${req.file.filename}`,
      thumbnail_path: `/uploads/thumbnails/${thumbnailName}`,
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
      fs.unlinkSync(req.file.path);
    }
    console.error('Error uploading media:', error);
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

    const [rows] = await pool.query(
      'SELECT * FROM media WHERE scene_id = ? ORDER BY display_order ASC, created_at ASC',
      [sceneId]
    ) as [any[], any];

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

    // If setting as primary, unset others
    if (is_primary === true) {
      await pool.query(
        'UPDATE media SET is_primary = 0 WHERE project_id = ? AND (scene_id = ? OR scene_id IS NULL) AND id != ?',
        [project_id, scene_id || null, id]
      );
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

    // Get file paths before deleting
    const [media] = await pool.query(
      'SELECT file_path, thumbnail_path FROM media WHERE id = ?',
      [id]
    ) as [any[], any];

    if (media.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Delete from database
    await pool.query('DELETE FROM media WHERE id = ?', [id]);

    // Delete files
    const filePath = path.join(__dirname, '../..', media[0].file_path);
    const thumbPath = path.join(__dirname, '../..', media[0].thumbnail_path);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
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

