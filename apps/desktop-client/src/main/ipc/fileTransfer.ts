import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';
import { FILE_PROTOCOL } from '../libp2p/node.js';

const CHUNK_SIZE = 64 * 1024; // 64KB chunks

interface FileChunk {
  index: number;
  total: number;
  data: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

interface FileMetadata {
  filename: string;
  mimeType: string;
  size: number;
  totalChunks: number;
  checksum: string;
}

// Generate file checksum
function generateChecksum(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Encrypt data with key
function encryptData(data: Buffer, key: Buffer): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag };
}

// Decrypt data with key
function decryptData(ciphertext: Buffer, key: Buffer, iv: Buffer, tag: Buffer): Buffer {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// Generate a random file key
function generateFileKey(): Buffer {
  return crypto.randomBytes(32);
}

// Send file through libp2p stream
export async function sendFile(
  node: any,
  peerId: string,
  filePath: string,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    log.info(`Sending file: ${filePath}`);
    
    const fileBuffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    const mimeType = getMimeType(filename);
    const fileKey = generateFileKey();
    
    // Encrypt the entire file first
    const { ciphertext, iv, tag } = encryptData(fileBuffer, fileKey);
    
    // Split into chunks
    const chunks: Buffer[] = [];
    const totalChunks = Math.ceil(ciphertext.length / CHUNK_SIZE);
    
    for (let i = 0; i < ciphertext.length; i += CHUNK_SIZE) {
      chunks.push(ciphertext.slice(i, i + CHUNK_SIZE));
    }
    
    // Send metadata first
    const metadata: FileMetadata = {
      filename,
      mimeType,
      size: fileBuffer.length,
      totalChunks,
      checksum: generateChecksum(fileBuffer),
    };
    
    const { stream } = await node.dialProtocol(peerId, FILE_PROTOCOL);
    
    // Send metadata
    const metadataJson = JSON.stringify({ type: 'metadata', ...metadata });
    const metadataBuffer = Buffer.from(metadataJson);
    await stream.write(metadataBuffer);
    await stream.write(Buffer.from([0])); // End of message
    
    // Send IV and tag (encrypted with session key)
    const sessionKey = getSessionKey(node, peerId);
    const encryptedIv = encryptData(iv, sessionKey);
    const encryptedTag = encryptData(tag, sessionKey);
    const keyData = JSON.stringify({
      iv: encryptedIv.iv.toString('base64'),
      ivTag: encryptedIv.tag.toString('base64'),
      tag: encryptedTag.ciphertext.toString('base64'),
      tagTag: encryptedTag.tag.toString('base64'),
      fileKey: fileKey.toString('base64'),
    });
    await stream.write(Buffer.from(keyData));
    await stream.write(Buffer.from([0]));
    
    // Send chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkData = JSON.stringify({
        index: i,
        total: totalChunks,
        data: chunks[i].toString('base64'),
      });
      await stream.write(Buffer.from(chunkData));
      await stream.write(Buffer.from([0]));
      
      onProgress?.(Math.round(((i + 1) / totalChunks) * 100));
    }
    
    await stream.close();
    log.info(`File sent successfully: ${filename}`);
    
    return { success: true };
  } catch (error: any) {
    log.error('Failed to send file:', error);
    return { success: false, error: error.message };
  }
}

// Receive file through libp2p stream
export async function receiveFile(
  node: any,
  stream: any,
  savePath: string,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; file?: string; error?: string }> {
  try {
    log.info('Receiving file...');
    
    let metadata: FileMetadata | null = null;
    let iv: Buffer | null = null;
    let tag: Buffer | null = null;
    let fileKey: Buffer | null = null;
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream.source) {
      const data = chunk.subarray ? chunk.subarray() : chunk;
      const text = Buffer.from(data).toString('utf8');
      
      if (text.endsWith('\0')) {
        continue; // Skip delimiters
      }
      
      try {
        const parsed = JSON.parse(text);
        
        if (parsed.type === 'metadata') {
          metadata = {
            filename: parsed.filename,
            mimeType: parsed.mimeType,
            size: parsed.size,
            totalChunks: parsed.totalChunks,
            checksum: parsed.checksum,
          };
          log.info(`Receiving file: ${metadata.filename}, size: ${metadata.size}`);
        } else if (parsed.iv !== undefined) {
          // Key data
          const sessionKey = getSessionKey(node, stream.connection.peerId);
          iv = decryptData(
            Buffer.from(parsed.iv, 'base64'),
            sessionKey,
            Buffer.from(parsed.ivTag, 'base64'),
            Buffer.from(parsed.ivTag, 'base64')
          );
          tag = decryptData(
            Buffer.from(parsed.tag, 'base64'),
            sessionKey,
            Buffer.from(parsed.tagTag, 'base64'),
            Buffer.from(parsed.tagTag, 'base64')
          );
          fileKey = Buffer.from(parsed.fileKey, 'base64');
        } else if (parsed.data !== undefined) {
          // File chunk
          chunks.push(Buffer.from(parsed.data, 'base64'));
          onProgress?.(Math.round(((chunks.length) / (metadata?.totalChunks || 1)) * 100));
        }
      } catch (e) {
        // Skip parsing errors for delimiters
      }
    }
    
    if (!metadata || !iv || !tag || !fileKey) {
      return { success: false, error: 'Invalid file data' };
    }
    
    // Assemble and decrypt
    const ciphertext = Buffer.concat(chunks);
    const decrypted = decryptData(ciphertext, fileKey, iv, tag);
    
    // Verify checksum
    const checksum = generateChecksum(decrypted);
    if (checksum !== metadata.checksum) {
      return { success: false, error: 'File checksum mismatch' };
    }
    
    // Save file
    const filePath = path.join(savePath, metadata.filename);
    fs.writeFileSync(filePath, decrypted);
    
    log.info(`File received: ${filePath}`);
    return { success: true, file: filePath };
  } catch (error: any) {
    log.error('Failed to receive file:', error);
    return { success: false, error: error.message };
  }
}

// Get MIME type from filename
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

// Get session key for a peer (simplified - in production use proper key exchange)
function getSessionKey(node: any, peerId: string): Buffer {
  // This is a placeholder - in production, use proper Noise session keys
  return crypto.randomBytes(32);
}

export default {
  sendFile,
  receiveFile,
};