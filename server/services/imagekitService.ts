import ImageKit from 'imagekit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ImageKit configuration from environment variables
const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY || 'public_bH2QtMc9E/U08Hzj2PN7tkoTD7o=';
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || 'private_+PmUqowiTKhJc1E0hSgwpMtF6J8=';
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/hkorgalju';

// Initialize ImageKit client
let imagekit: ImageKit | null = null;

try {
  imagekit = new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  });
  console.log('✅ ImageKit initialized successfully');
} catch (error) {
  console.warn('⚠️ ImageKit initialization failed, will use local storage fallback:', error);
  imagekit = null;
}

/**
 * Upload image to ImageKit
 * @param filePath - Local file path
 * @param fileName - Original file name
 * @param folder - Optional folder path in ImageKit
 * @returns ImageKit upload result or null if failed
 */
export async function uploadToImageKit(
  filePath: string,
  fileName: string,
  folder?: string
): Promise<{ url: string; fileId: string; thumbnailUrl?: string } | null> {
  if (!imagekit) {
    return null;
  }

  try {
    // Read file buffer
    const fileBuffer = fs.readFileSync(filePath);
    
    // Upload to ImageKit
    const uploadResult = await imagekit.upload({
      file: fileBuffer,
      fileName: fileName,
      folder: folder || '/cineflow',
      useUniqueFileName: true,
    });

    if (!uploadResult.url) {
      console.error('ImageKit upload failed: No URL returned');
      return null;
    }

    // Generate thumbnail URL using ImageKit transformations
    const thumbnailUrl = imagekit.url({
      src: uploadResult.url,
      transformation: [{
        height: 300,
        width: 300,
        quality: 80,
        format: 'jpg',
      }],
    });

    return {
      url: uploadResult.url,
      fileId: uploadResult.fileId,
      thumbnailUrl: thumbnailUrl,
    };
  } catch (error: any) {
    console.error('ImageKit upload error:', error.message);
    return null;
  }
}

/**
 * Delete image from ImageKit
 * @param fileId - ImageKit file ID
 */
export async function deleteFromImageKit(fileId: string): Promise<boolean> {
  if (!imagekit || !fileId) {
    return false;
  }

  try {
    await imagekit.deleteFile(fileId);
    return true;
  } catch (error: any) {
    console.error('ImageKit delete error:', error.message);
    return false;
  }
}

/**
 * Check if ImageKit is available
 */
export function isImageKitAvailable(): boolean {
  return imagekit !== null;
}

/**
 * Generate ImageKit URL with transformations
 * @param imageUrl - ImageKit URL
 * @param options - Transformation options
 */
export function getImageKitUrl(
  imageUrl: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  }
): string {
  if (!imagekit || !imageUrl) {
    return imageUrl;
  }

  try {
    // Check if URL is from ImageKit
    if (!imageUrl.includes(IMAGEKIT_URL_ENDPOINT)) {
      return imageUrl; // Return original URL if not from ImageKit
    }

    if (!options) {
      return imageUrl;
    }

    const transformation: any[] = [];
    
    if (options.width) transformation.push({ width: options.width });
    if (options.height) transformation.push({ height: options.height });
    if (options.quality) transformation.push({ quality: options.quality });
    if (options.format) transformation.push({ format: options.format });

    if (transformation.length === 0) {
      return imageUrl;
    }

    return imagekit.url({
      src: imageUrl,
      transformation: transformation,
    });
  } catch (error: any) {
    console.error('ImageKit URL generation error:', error.message);
    return imageUrl; // Return original URL on error
  }
}

