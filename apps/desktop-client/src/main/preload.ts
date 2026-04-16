import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electron', {
  // libp2p operations
  invoke: (channel: string, ...args: any[]) => {
    const validChannels = [
      'libp2p:getInfo',
      'libp2p:getPeerId',
      'libp2p:dial',
      'libp2p:sendMessage',
      'libp2p:onMessage',
      'libp2p:getConnectedPeers',
      'libp2p:getMultiaddrs',
      'file:send',
      'file:select',
      'file:save',
      'crypto:encrypt',
      'crypto:decrypt',
      'crypto:generateKey',
      'security:generateRandom',
      'security:hash',
      'security:verifyHash',
      'security:deriveKey',
      'security:checkRateLimit',
      'security:resetRateLimit',
      'security:createSession',
      'security:validateSession',
      'security:destroySession',
      'security:auditLog',
    ];
    
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Invalid channel: ${channel}`);
  },
  
  // Event listeners
  on: (channel: string, callback: Function) => {
    const validChannels = [
      'libp2p:message',
      'libp2p:connected',
      'libp2p:disconnected',
      'menu:new-chat',
      'menu:about',
    ];
    
    if (validChannels.includes(channel)) {
      const subscription = (event: any, ...args: any[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      
      // Return unsubscribe function
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
    throw new Error(`Invalid channel: ${channel}`);
  },
  
  // Remove event listener
  off: (channel: string, callback: Function) => {
    ipcRenderer.removeListener(channel, callback);
  },
});

// Expose platform info
contextBridge.exposeInMainWorld('platform', {
  os: process.platform,
  arch: process.arch,
  version: process.getSystemVersion(),
});

console.log('Preload script loaded');