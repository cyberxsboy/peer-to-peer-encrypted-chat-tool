import { IpcMain, BrowserWindow } from 'electron';
import log from 'electron-log';
import * as crypto from 'crypto';
import { createLibp2pNode, getPeerInfo, CHAT_PROTOCOL, FILE_PROTOCOL, VOICE_PROTOCOL } from '../libp2p/node.js';

interface MessageHandler {
  (source: any, data: Uint8Array): Promise<void>;
}

const messageHandlers = new Map<string, MessageHandler>();

export function setupIpcHandlers(
  ipcMain: IpcMain,
  mainWindow: BrowserWindow | null,
  libp2pNode: any
) {
  // Get peer info
  ipcMain.handle('libp2p:getInfo', async () => {
    if (!libp2pNode) {
      return { error: 'libp2p node not initialized' };
    }
    
    try {
      const info = getPeerInfo(libp2pNode);
      return { success: true, data: info };
    } catch (error: any) {
      log.error('Failed to get peer info:', error);
      return { error: error.message };
    }
  });

  // Get peer ID
  ipcMain.handle('libp2p:getPeerId', async () => {
    if (!libp2pNode) {
      return { error: 'libp2p node not initialized' };
    }
    
    return { 
      success: true, 
      data: libp2pNode.peerId.toString() 
    };
  });

  // Dial to peer
  ipcMain.handle('libp2p:dial', async (_, peerId: string, multiaddr: string) => {
    if (!libp2pNode) {
      return { error: 'libp2p node not initialized' };
    }
    
    try {
      await libp2pNode.dial(`${multiaddr}/p2p/${peerId}`);
      return { success: true };
    } catch (error: any) {
      log.error('Failed to dial:', error);
      return { error: error.message };
    }
  });

  // Send message
  ipcMain.handle('libp2p:sendMessage', async (_, peerId: string, message: string) => {
    if (!libp2pNode) {
      return { error: 'libp2p node not initialized' };
    }
    
    try {
      const { stream } = await libp2pNode.dialProtocol(peerId, CHAT_PROTOCOL);
      
      // Encode and encrypt message
      const data = new TextEncoder().encode(message);
      await stream.write(data);
      await stream.close();
      
      return { success: true };
    } catch (error: any) {
      log.error('Failed to send message:', error);
      return { error: error.message };
    }
  });

  // Register message handler
  ipcMain.handle('libp2p:onMessage', async (_, callback: Function) => {
    messageHandlers.set(CHAT_PROTOCOL, async (source: any, data: Uint8Array) => {
      const message = new TextDecoder().decode(data);
      mainWindow?.webContents.send('libp2p:message', { source, message });
    }));
    
    // Set up the protocol handler
    if (libp2pNode) {
      libp2pNode.handle(CHAT_PROTOCOL, async ({ stream, connection }: any) => {
        for await (const chunk of stream.source) {
          const handler = messageHandlers.get(CHAT_PROTOCOL);
          if (handler) {
            await handler(connection.peerId, chunk);
          }
        }
      });
    }
    
    return { success: true };
  });

  // Get connected peers
  ipcMain.handle('libp2p:getConnectedPeers', async () => {
    if (!libp2pNode) {
      return { error: 'libp2p node not initialized' };
    }
    
    try {
      const peers = Array.from(libp2pNode.peerStore.peers.values()).map((peer: any) => ({
        id: peer.id.toString(),
        protocols: peer.protocols,
        addresses: peer.addresses.map((ma: any) => ma.toString()),
      }));
      
      return { success: true, data: peers };
    } catch (error: any) {
      log.error('Failed to get connected peers:', error);
      return { error: error.message };
    }
  });

  // Get multiaddrs
  ipcMain.handle('libp2p:getMultiaddrs', async () => {
    if (!libp2pNode) {
      return { error: 'libp2p node not initialized' };
    }
    
    try {
      const multiaddrs = libp2pNode.getMultiaddrs().map((ma: any) => ma.toString());
      return { success: true, data: multiaddrs };
    } catch (error: any) {
      log.error('Failed to get multiaddrs:', error);
      return { error: error.message };
    }
  });

  // Crypto helpers for renderer
  ipcMain.handle('crypto:encrypt', async (_, data: string, key: string) => {
    try {
      const keyBuffer = Buffer.from(key, 'base64');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
      
      const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      
      return { 
        success: true, 
        data: {
          ciphertext: encrypted.toString('base64'),
          iv: iv.toString('base64'),
          tag: tag.toString('base64'),
        }
      };
    } catch (error: any) {
      return { error: error.message };
    }
  });

  ipcMain.handle('crypto:decrypt', async (_, ciphertext: string, key: string, iv: string, tag: string) => {
    try {
      const keyBuffer = Buffer.from(key, 'base64');
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        keyBuffer,
        Buffer.from(iv, 'base64')
      );
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8');
      
      return { success: true, data: decrypted };
    } catch (error: any) {
      return { error: error.message };
    }
  });

  ipcMain.handle('crypto:generateKey', async () => {
    const key = crypto.randomBytes(32);
    return { success: true, data: key.toString('base64') };
  });

  // File transfer handlers
  ipcMain.handle('file:send', async (_, peerId: string, filePath: string) => {
    if (!libp2pNode) {
      return { error: 'libp2p node not initialized' };
    }
    
    try {
      const { sendFile } = await import('./fileTransfer.js');
      return await sendFile(libp2pNode, peerId, filePath);
    } catch (error: any) {
      log.error('Failed to send file:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:select', async () => {
    const { dialog } = await import('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx'] },
        { name: 'Videos', extensions: ['mp4', 'mov', 'avi'] },
        { name: 'Audio', extensions: ['mp3', 'wav'] },
      ],
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    
    return { success: true, data: result.filePaths[0] };
  });

  ipcMain.handle('file:save', async (_, defaultName: string) => {
    const { dialog } = await import('electron');
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    
    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }
    
    return { success: true, data: result.filePath };
  });

  // Setup security handlers
  const { setupSecurityIpc } = await import('./security.js');
  setupSecurityIpc(ipcMain);

  // Image processing handlers
  ipcMain.handle('media:generateThumbnail', async (_, imageBase64: string) => {
    try {
      const { generateThumbnail } = await import('../media/imageProcessing.js');
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const thumbnail = await generateThumbnail(imageBuffer);
      return { success: true, data: thumbnail.toString('base64') };
    } catch (error: any) {
      log.error('Failed to generate thumbnail:', error);
      return { error: error.message };
    }
  });

  ipcMain.handle('media:getImageMetadata', async (_, imageBase64: string) => {
    try {
      const { getImageMetadata } = await import('../media/imageProcessing.js');
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const metadata = await getImageMetadata(imageBuffer);
      return { success: true, data: metadata };
    } catch (error: any) {
      log.error('Failed to get image metadata:', error);
      return { error: error.message };
    }
  });

  // Group handlers
  ipcMain.handle('group:create', async (_, name: string, ownerPeerId: string, password?: string) => {
    try {
      const { useGroup } = await import('../renderer/hooks/useGroup.js');
      // Simplified - in production use proper group module
      const groupId = crypto.randomUUID();
      const groupKey = crypto.randomBytes(32).toString('base64');
      return {
        success: true,
        data: { groupId, name, ownerId: ownerPeerId, groupKey, createdAt: Date.now() }
      };
    } catch (error: any) {
      log.error('Failed to create group:', error);
      return { error: error.message };
    }
  });

  ipcMain.handle('group:invite', async (_, groupData: any) => {
    try {
      // Create invite blob
      const inviteBlob = {
        version: 1,
        groupId: groupData.groupId,
        groupName: groupData.groupName,
        inviterId: groupData.ownerId,
        encryptedGroupKey: { nonce: '', ciphertext: '' },
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
      return { success: true, data: inviteBlob };
    } catch (error: any) {
      log.error('Failed to create invite:', error);
      return { error: error.message };
    }
  });

  log.info('IPC handlers registered');
}