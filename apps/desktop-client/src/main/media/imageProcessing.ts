import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';

interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
}

const DEFAULT_THUMBNAIL_OPTIONS: ThumbnailOptions = {
  width: 150,
  height: 150,
  quality: 80,
};

// Generate thumbnail from image buffer
export async function generateThumbnail(
  imageBuffer: Buffer,
  options: ThumbnailOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options };
  
  try {
    return await sharp(imageBuffer)
      .resize(opts.width, opts.height, { fit: 'cover' })
      .jpeg({ quality: opts.quality })
      .toBuffer();
  } catch (error) {
    log.error('Failed to generate thumbnail:', error);
    throw error;
  }
}

// Generate thumbnail from file path
export async function generateThumbnailFromFile(
  filePath: string,
  options: ThumbnailOptions = {}
): Promise<Buffer> {
  const imageBuffer = fs.readFileSync(filePath);
  return generateThumbnail(imageBuffer, options);
}

// Get image metadata
export async function getImageMetadata(
  imageBuffer: Buffer
): Promise<{ width: number; height: number; format: string }> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
    };
  } catch (error) {
    log.error('Failed to get image metadata:', error);
    throw error;
  }
}

// Resize image
export async function resizeImage(
  imageBuffer: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  try {
    return await sharp(imageBuffer)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
  } catch (error) {
    log.error('Failed to resize image:', error);
    throw error;
  }
}

// Convert image format
export async function convertImageFormat(
  imageBuffer: Buffer,
  format: 'jpeg' | 'png' | 'webp',
  quality: number = 80
): Promise<Buffer> {
  try {
    switch (format) {
      case 'jpeg':
        return await sharp(imageBuffer).jpeg({ quality }).toBuffer();
      case 'png':
        return await sharp(imageBuffer).png({ quality }).toBuffer();
      case 'webp':
        return await sharp(imageBuffer).webp({ quality }).toBuffer();
      default:
        return imageBuffer;
    }
  } catch (error) {
    log.error('Failed to convert image format:', error);
    throw error;
  }
}

export default {
  generateThumbnail,
  generateThumbnailFromFile,
  getImageMetadata,
  resizeImage,
  convertImageFormat,
};