import fs from 'fs';
import sharp from 'sharp';
import path from 'path';

/**
 * In-house background removal using image processing techniques
 * Uses edge detection, color analysis, and masking to remove backgrounds
 */

/**
 * Remove background from image using in-house algorithm
 * @param imagePath - Path to the image file
 * @returns Path to the processed image with background removed, or null if failed
 */
export async function removeBackground(
  imagePath: string
): Promise<{ processedPath: string; buffer?: Buffer } | null> {
  try {
    // Read image metadata
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const { width, height } = metadata;

    if (!width || !height) {
      throw new Error('Invalid image dimensions');
    }

    // Get image data as raw buffer
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Process image to create mask
    const mask = await createBackgroundMask(data, width, height, info.channels);

    // Apply mask to create transparent background
    const processedBuffer = await applyMask(data, mask, width, height, info.channels);

    // Save processed image
    const processedPath = imagePath.replace(/\.(jpg|jpeg|png|webp)$/i, '_nobg.png');
    
    await sharp(processedBuffer, {
      raw: {
        width,
        height,
        channels: info.channels,
      },
    })
      .png()
      .toFile(processedPath);

    return {
      processedPath,
      buffer: processedBuffer,
    };
  } catch (error: any) {
    console.error('Background removal error:', error.message);
    return null;
  }
}

/**
 * Remove background from image buffer (for direct processing)
 * @param imageBuffer - Image buffer
 * @returns Processed image buffer with background removed, or null if failed
 */
export async function removeBackgroundFromBuffer(
  imageBuffer: Buffer
): Promise<Buffer | null> {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const { width, height } = metadata;

    if (!width || !height) {
      throw new Error('Invalid image dimensions');
    }

    // Get image data as raw buffer
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Process image to create mask
    const mask = await createBackgroundMask(data, width, height, info.channels);

    // Apply mask to create transparent background
    const processedBuffer = await applyMask(data, mask, width, height, info.channels);

    // Convert to PNG with transparency
    const pngBuffer = await sharp(processedBuffer, {
      raw: {
        width,
        height,
        channels: info.channels,
      },
    })
      .png()
      .toBuffer();

    return pngBuffer;
  } catch (error: any) {
    console.error('Background removal error:', error.message);
    return null;
  }
}

/**
 * Create a mask to identify background pixels
 * Uses advanced edge detection, color clustering, and flood fill
 */
async function createBackgroundMask(
  data: Buffer,
  width: number,
  height: number,
  channels: number
): Promise<boolean[]> {
  const mask: boolean[] = new Array(width * height).fill(false);
  const edgeThreshold = Math.min(width, height) * 0.08; // 8% of smaller dimension

  // Step 1: Comprehensive edge sampling
  const edgeSamples: number[][] = [];
  const corners: number[][] = [];
  
  // Sample all four corners (most likely to be background)
  const cornerSize = Math.max(5, Math.floor(Math.min(width, height) * 0.05));
  for (let dy = 0; dy < cornerSize; dy++) {
    for (let dx = 0; dx < cornerSize; dx++) {
      // Top-left corner
      const idx1 = (dy * width + dx) * channels;
      corners.push([data[idx1], data[idx1 + 1], data[idx1 + 2]]);
      
      // Top-right corner
      const idx2 = (dy * width + (width - 1 - dx)) * channels;
      corners.push([data[idx2], data[idx2 + 1], data[idx2 + 2]]);
      
      // Bottom-left corner
      const idx3 = ((height - 1 - dy) * width + dx) * channels;
      corners.push([data[idx3], data[idx3 + 1], data[idx3 + 2]]);
      
      // Bottom-right corner
      const idx4 = ((height - 1 - dy) * width + (width - 1 - dx)) * channels;
      corners.push([data[idx4], data[idx4 + 1], data[idx4 + 2]]);
    }
  }

  // Sample edges more systematically
  const edgeStep = Math.max(1, Math.floor(Math.min(width, height) / 50));
  
  // Top and bottom edges
  for (let x = 0; x < width; x += edgeStep) {
    const topIdx = x * channels;
    edgeSamples.push([data[topIdx], data[topIdx + 1], data[topIdx + 2]]);
    
    const bottomIdx = ((height - 1) * width + x) * channels;
    edgeSamples.push([data[bottomIdx], data[bottomIdx + 1], data[bottomIdx + 2]]);
  }
  
  // Left and right edges
  for (let y = 0; y < height; y += edgeStep) {
    const leftIdx = (y * width) * channels;
    edgeSamples.push([data[leftIdx], data[leftIdx + 1], data[leftIdx + 2]]);
    
    const rightIdx = (y * width + (width - 1)) * channels;
    edgeSamples.push([data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]]);
  }

  // Step 2: Calculate background color using weighted average (corners weighted more)
  const allSamples = [...corners, ...corners, ...edgeSamples]; // Double weight corners
  const avgBg = allSamples.reduce(
    (acc, pixel) => [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]],
    [0, 0, 0]
  );
  const bgColor = [
    avgBg[0] / allSamples.length,
    avgBg[1] / allSamples.length,
    avgBg[2] / allSamples.length,
  ];

  // Step 3: Calculate standard deviation for adaptive thresholding
  const variance = allSamples.reduce(
    (acc, pixel) => {
      const dr = pixel[0] - bgColor[0];
      const dg = pixel[1] - bgColor[1];
      const db = pixel[2] - bgColor[2];
      return acc + (dr * dr + dg * dg + db * db);
    },
    0
  );
  const stdDev = Math.sqrt(variance / allSamples.length);
  const adaptiveThreshold = Math.max(30, Math.min(60, stdDev * 1.5));

  // Step 4: Multi-pass mask generation with improved techniques
  
  // Pass 1: Create initial mask with adaptive thresholding and edge detection
  const edgeMap = new Array(width * height).fill(0);
  
  // Detect edges using Sobel-like operator
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // Calculate gradient magnitude
      const gx = Math.abs(
        (data[((y - 1) * width + (x - 1)) * channels] + 
         2 * data[((y - 1) * width + x) * channels] +
         data[((y - 1) * width + (x + 1)) * channels]) -
        (data[((y + 1) * width + (x - 1)) * channels] +
         2 * data[((y + 1) * width + x) * channels] +
         data[((y + 1) * width + (x + 1)) * channels])
      );
      
      const gy = Math.abs(
        (data[((y - 1) * width + (x - 1)) * channels] +
         2 * data[(y * width + (x - 1)) * channels] +
         data[((y + 1) * width + (x - 1)) * channels]) -
        (data[((y - 1) * width + (x + 1)) * channels] +
         2 * data[(y * width + (x + 1)) * channels] +
         data[((y + 1) * width + (x + 1)) * channels])
      );
      
      edgeMap[y * width + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  
  // Pass 2: Create mask with edge-aware processing
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const edgeStrength = edgeMap[y * width + x] || 0;

      // Calculate color distance (using perceptual color difference)
      const dr = r - bgColor[0];
      const dg = g - bgColor[1];
      const db = b - bgColor[2];
      // Weighted distance (human eye is more sensitive to green)
      const distance = Math.sqrt(dr * dr * 2 + dg * dg * 4 + db * db * 3) / 3;

      // Adaptive threshold based on position and edge strength
      const isEdge = x < edgeThreshold || x >= width - edgeThreshold ||
                     y < edgeThreshold || y >= height - edgeThreshold;
      
      // Lower threshold near edges (more likely to be background)
      // Higher threshold near strong edges (more likely to be foreground)
      let threshold = adaptiveThreshold;
      if (isEdge) {
        threshold = adaptiveThreshold * 1.4; // More lenient at image edges
      } else if (edgeStrength > 50) {
        threshold = adaptiveThreshold * 0.7; // Stricter near strong edges (foreground)
      }
      
      // Also consider luminance difference
      const bgLum = (bgColor[0] * 0.299 + bgColor[1] * 0.587 + bgColor[2] * 0.114);
      const pixelLum = (r * 0.299 + g * 0.587 + b * 0.114);
      const lumDiff = Math.abs(pixelLum - bgLum);
      
      // Combine color distance and luminance difference
      const combinedDistance = (distance * 0.7) + (lumDiff * 0.3);
      
      if (combinedDistance < threshold) {
        mask[y * width + x] = true;
      }
    }
  }

  // Step 5: Apply flood fill from edges to ensure edge connectivity
  const visited = new Set<number>();
  const queue: Array<[number, number]> = [];
  
  // Start flood fill from all edge pixels marked as background
  for (let x = 0; x < width; x++) {
    if (mask[x]) queue.push([x, 0]); // Top edge
    if (mask[(height - 1) * width + x]) queue.push([x, height - 1]); // Bottom edge
  }
  for (let y = 0; y < height; y++) {
    if (mask[y * width]) queue.push([0, y]); // Left edge
    if (mask[y * width + (width - 1)]) queue.push([width - 1, y]); // Right edge
  }

  // Flood fill to connect background regions
  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    const key = y * width + x;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    // Check neighbors
    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      
      const nKey = ny * width + nx;
      if (visited.has(nKey)) continue;
      
      const nIdx = nKey * channels;
      const nr = data[nIdx];
      const ng = data[nIdx + 1];
      const nb = data[nIdx + 2];
      
      // Check if neighbor is similar to background
      const ndr = nr - bgColor[0];
      const ndg = ng - bgColor[1];
      const ndb = nb - bgColor[2];
      const nDistance = Math.sqrt(ndr * ndr * 2 + ndg * ndg * 4 + ndb * ndb * 3) / 3;
      
      if (nDistance < adaptiveThreshold * 1.2) {
        mask[nKey] = true;
        queue.push([nx, ny]);
      }
    }
  }

  // Step 6: Apply morphological operations to clean up mask
  return cleanMask(mask, width, height);
}

/**
 * Clean up mask using advanced morphological operations
 */
function cleanMask(mask: boolean[], width: number, height: number): boolean[] {
  let cleaned = [...mask];

  // Erosion: Remove small foreground regions (noise removal)
  const eroded = [...cleaned];
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const idx = y * width + x;
      if (!cleaned[idx]) {
        // Count background neighbors in 5x5 area
        let bgNeighbors = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (cleaned[(y + dy) * width + (x + dx)]) bgNeighbors++;
          }
        }
        // If 70%+ neighbors are background, likely background
        if (bgNeighbors >= 18) {
          eroded[idx] = true;
        }
      }
    }
  }
  cleaned = eroded;

  // Dilation: Fill small holes in foreground
  const dilated = [...cleaned];
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const idx = y * width + x;
      if (cleaned[idx]) {
        // Count foreground neighbors in 5x5 area
        let fgNeighbors = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (!cleaned[(y + dy) * width + (x + dx)]) fgNeighbors++;
          }
        }
        // If 70%+ neighbors are foreground, likely foreground
        if (fgNeighbors >= 18) {
          dilated[idx] = false;
        }
      }
    }
  }
  cleaned = dilated;

  // Opening: Remove small isolated background regions
  const opened = [...cleaned];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (cleaned[idx]) {
        // Check if this background pixel is isolated
        let isolated = true;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (cleaned[(y + dy) * width + (x + dx)]) {
              isolated = false;
              break;
            }
          }
          if (!isolated) break;
        }
        if (isolated) {
          opened[idx] = false;
        }
      }
    }
  }
  cleaned = opened;

  // Smooth edges: Apply Gaussian-like smoothing to mask edges
  const smoothed = [...cleaned];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      // Count background in 3x3 neighborhood
      let bgCount = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (cleaned[(y + dy) * width + (x + dx)]) bgCount++;
        }
      }
      // Smooth transition: if 5-7 neighbors are background, use majority vote
      if (bgCount >= 5 && bgCount <= 7) {
        smoothed[idx] = bgCount >= 5;
      }
    }
  }

  return smoothed;
}

/**
 * Apply mask to image data, making background transparent
 */
function applyMask(
  data: Buffer,
  mask: boolean[],
  width: number,
  height: number,
  channels: number
): Buffer {
  const result = Buffer.from(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const maskIdx = y * width + x;

      if (mask[maskIdx]) {
        // Set alpha channel to 0 (transparent) for background pixels
        if (channels >= 4) {
          result[idx + 3] = 0;
        }
      } else {
        // Ensure foreground pixels are fully opaque
        if (channels >= 4) {
          result[idx + 3] = 255;
        }
      }
    }
  }

  return result;
}

/**
 * Check if background removal is available (always true for in-house solution)
 */
export function isBackgroundRemovalAvailable(): boolean {
  return true; // Always available with in-house solution
}

