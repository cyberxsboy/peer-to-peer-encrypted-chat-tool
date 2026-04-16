import { useState, useCallback, useEffect, useRef } from 'react';
import { MessageType, ChatMessage } from '@shared/types';

interface BurnableMessage extends ChatMessage {
  burnKey?: string;
  burnAfterSec?: number;
  viewed?: boolean;
  burned?: boolean;
}

interface UseBurnMessageOptions {
  onBurn?: (message: BurnableMessage) => void;
}

export function useBurnMessage(options?: UseBurnMessageOptions) {
  const [burningMessages, setBurningMessages] = useState<Map<string, {
    message: BurnableMessage;
    remainingSeconds: number;
    timer: NodeJS.Timeout | null;
  }>>(new Map());

  // Generate burn key
  const generateBurnKey = useCallback((): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Buffer.from(array).toString('base64');
  }, []);

  // Encrypt message content with burn key
  const encryptWithBurnKey = useCallback((
    content: string,
    burnKey: string
  ): { ciphertext: string; iv: string; tag: string } => {
    const key = Buffer.from(burnKey, 'base64');
    const iv = crypto.randomBytes(12);
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(content, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    
    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }, []);

  // Decrypt message content with burn key
  const decryptWithBurnKey = useCallback((
    ciphertext: string,
    burnKey: string,
    iv: string,
    tag: string
  ): string | null => {
    try {
      const key = Buffer.from(burnKey, 'base64');
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(iv, 'base64')
      );
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8');
      
      return decrypted;
    } catch {
      return null;
    }
  }, []);

  // Create burnable message
  const createBurnableMessage = useCallback((
    content: string,
    burnAfterSec: number
  ): { encryptedContent: any; burnKey: string } => {
    const burnKey = generateBurnKey();
    const encryptedContent = encryptWithBurnKey(content, burnKey);
    
    return {
      encryptedContent,
      burnKey,
    };
  }, [generateBurnKey, encryptWithBurnKey]);

  // Add message to burn list
  const startBurnCountdown = useCallback((
    message: BurnableMessage,
    burnAfterSec: number,
    autoStart: boolean = true
  ) => {
    // If not auto-start, don't start countdown until viewed
    if (!autoStart && !message.viewed) {
      setBurningMessages(prev => {
        const newMap = new Map(prev);
        newMap.set(message.msgId, {
          message: { ...message, viewed: false },
          remainingSeconds: burnAfterSec,
          timer: null,
        });
        return newMap;
      });
      return;
    }

    // Start countdown
    const timer = setInterval(() => {
      setBurningMessages(prev => {
        const newMap = new Map(prev);
        const entry = newMap.get(message.msgId);
        
        if (!entry) return prev;
        
        const newRemaining = entry.remainingSeconds - 1;
        
        if (newRemaining <= 0) {
          // Time's up, burn the message
          if (entry.timer) clearInterval(entry.timer);
          newMap.delete(message.msgId);
          
          // Trigger burn callback
          options?.onBurn?.(entry.message);
          
          return newMap;
        }
        
        newMap.set(message.msgId, {
          ...entry,
          remainingSeconds: newRemaining,
        });
        
        return newMap;
      });
    }, 1000);

    setBurningMessages(prev => {
      const newMap = new Map(prev);
      newMap.set(message.msgId, {
        message: { ...message, viewed: true, burned: false },
        remainingSeconds: burnAfterSec,
        timer,
      });
      return newMap;
    });
  }, [options]);

  // View message (starts countdown if not started)
  const viewMessage = useCallback((
    message: BurnableMessage,
    burnAfterSec: number
  ) => {
    setBurningMessages(prev => {
      const entry = prev.get(message.msgId);
      
      if (entry) {
        // Already burning, just mark as viewed
        return prev;
      }
      
      // New message, start countdown
      return prev;
    });

    // Mark as viewed and start countdown
    startBurnCountdown({ ...message, viewed: true }, burnAfterSec, true);
  }, [startBurnCountdown]);

  // Cancel burn (e.g., when user explicitly deletes)
  const cancelBurn = useCallback((msgId: string) => {
    setBurningMessages(prev => {
      const entry = prev.get(msgId);
      if (entry?.timer) clearInterval(entry.timer);
      
      const newMap = new Map(prev);
      newMap.delete(msgId);
      return newMap;
    });
  }, []);

  // Get remaining time for a message
  const getRemainingTime = useCallback((msgId: string): number | null => {
    const entry = burningMessages.get(msgId);
    return entry?.remainingSeconds ?? null;
  }, [burningMessages]);

  // Check if message is burning
  const isBurning = useCallback((msgId: string): boolean => {
    return burningMessages.has(msgId);
  }, [burningMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      burningMessages.forEach((entry) => {
        if (entry.timer) clearInterval(entry.timer);
      });
    };
  }, []);

  return {
    createBurnableMessage,
    startBurnCountdown,
    viewMessage,
    cancelBurn,
    getRemainingTime,
    isBurning,
    encryptWithBurnKey,
    decryptWithBurnKey,
  };
}