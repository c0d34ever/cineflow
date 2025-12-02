import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../db/index.js';
import { uploadToImageKit, isImageKitAvailable } from './imagekitService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a composite image of all characters in a project
 * @param projectId - Project ID
 * @returns Path to the generated composite image, or null if failed
 */
export async function generateCharacterComposite(projectId: string): Promise<{ 
  localPath: string; 
  imagekitUrl?: string;
  imagekitThumbnailUrl?: string;
} | null> {
  try {
    const pool = getPool();
    
    // Get all characters with images (check image_url)
    const [characters] = await pool.query(
      `SELECT * FROM characters 
       WHERE project_id = ? 
       AND (image_url IS NOT NULL AND image_url != '')
       ORDER BY name ASC`,
      [projectId]
    ) as [any[], any];

    console.log(`[CharacterComposite] Found ${characters?.length || 0} characters with images for project ${projectId}`);

    if (!characters || characters.length === 0) {
      console.log(`[CharacterComposite] No characters with images found for project ${projectId}`);
      return null; // No characters with images
    }

    // Limit to first 9 characters for grid layout
    const charactersToUse = characters.slice(0, 9);
    const count = charactersToUse.length;
    
    // Calculate grid dimensions
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    // Composite image dimensions
    const cellSize = 200;
    const spacing = 10;
    const width = cols * cellSize + (cols - 1) * spacing;
    const height = rows * cellSize + (rows - 1) * spacing;
    
    // Create base canvas
    const composite = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 18, g: 18, b: 18, alpha: 1 } // Dark background
      }
    });

    // Load and composite character images
    const overlays: any[] = [];
    
    for (let i = 0; i < charactersToUse.length; i++) {
      const char = charactersToUse[i];
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      const x = col * (cellSize + spacing);
      const y = row * (cellSize + spacing);
      
      try {
        // Try to load image from URL
        let imageBuffer: Buffer | null = null;
        
        if (char.image_url) {
          // Check if it's a URL or local path
          if (char.image_url.startsWith('http')) {
            // Fetch from URL
            try {
              const response = await fetch(char.image_url);
              if (response.ok) {
                imageBuffer = Buffer.from(await response.arrayBuffer());
              }
            } catch (fetchError) {
              console.warn(`Failed to fetch image from URL for ${char.name}:`, fetchError);
            }
          } else {
            // Local path - try multiple possible locations
            const possiblePaths = [
              char.image_url.startsWith('/') 
                ? path.join(__dirname, '../../', char.image_url.substring(1))
                : path.join(__dirname, '../../uploads', char.image_url),
              path.join(__dirname, '../../', char.image_url),
              path.join(__dirname, '../../uploads', path.basename(char.image_url)),
            ];
            
            for (const localPath of possiblePaths) {
              if (fs.existsSync(localPath)) {
                imageBuffer = fs.readFileSync(localPath);
                break;
              }
            }
          }
        }
        
        // Also try imagekit_url if available
        if (!imageBuffer && char.imagekit_url) {
          try {
            const response = await fetch(char.imagekit_url);
            if (response.ok) {
              imageBuffer = Buffer.from(await response.arrayBuffer());
            }
          } catch (fetchError) {
            console.warn(`Failed to fetch imagekit URL for ${char.name}:`, fetchError);
          }
        }
        
        if (imageBuffer) {
          // Resize and center character image
          const resized = await sharp(imageBuffer)
            .resize(cellSize, cellSize, {
              fit: 'cover',
              position: 'center'
            })
            .toBuffer();
          
          overlays.push({
            input: resized,
            left: x,
            top: y,
          });
        }
      } catch (error: any) {
        console.warn(`Failed to load image for character ${char.name}:`, error.message);
        // Continue with other characters
      }
    }

    // Composite all images
    const outputPath = path.join(__dirname, '../../uploads', `cover-${projectId}-${Date.now()}.png`);
    await composite
      .composite(overlays)
      .png()
      .toFile(outputPath);

    // Upload to ImageKit if available
    let imagekitUrl: string | undefined;
    let imagekitThumbnailUrl: string | undefined;

    if (isImageKitAvailable()) {
      try {
        const result = await uploadToImageKit(outputPath, `cover-${projectId}.png`, '/cineflow/covers');
        if (result) {
          imagekitUrl = result.url;
          imagekitThumbnailUrl = result.thumbnailUrl;
        }
      } catch (error: any) {
        console.warn('ImageKit upload failed for cover:', error.message);
      }
    }

    return {
      localPath: `/uploads/${path.basename(outputPath)}`,
      imagekitUrl,
      imagekitThumbnailUrl,
    };
  } catch (error: any) {
    console.error('Error generating character composite:', error);
    return null;
  }
}

