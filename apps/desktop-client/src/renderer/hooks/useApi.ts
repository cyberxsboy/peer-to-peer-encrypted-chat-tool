import { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../stores/store';
import { ApiResponse } from '@shared/types';

interface UseApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
}

export function useApi<T = any>(url: string, options?: UseApiOptions) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);

  const execute = useCallback(
    async (body?: any): Promise<ApiResponse<T>> => {
      setLoading(true);
      setError(null);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...options?.headers,
        };

        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(url, {
          method: options?.method || 'POST',
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        const result: ApiResponse<T> = await response.json();

        if (result.success) {
          setData(result.data || null);
        } else {
          setError(result.error?.message || '请求失败');
        }

        return result;
      } catch (err: any) {
        const errorMsg = err.message || '网络错误';
        setError(errorMsg);
        return { success: false, error: { code: 'NETWORK_ERROR', message: errorMsg } };
      } finally {
        setLoading(false);
      }
    },
    [url, options?.method, options?.headers, accessToken]
  );

  return { data, loading, error, execute };
}

// Hook for libp2p operations
export function useLibp2p() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPeerInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await (window as any).electron?.invoke('libp2p:getPeerId');
      return result;
    } catch (err: any) {
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getMultiaddrs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await (window as any).electron?.invoke('libp2p:getMultiaddrs');
      return result;
    } catch (err: any) {
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const dialPeer = useCallback(async (peerId: string, multiaddr: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await (window as any).electron?.invoke('libp2p:dial', peerId, multiaddr);
      return result;
    } catch (err: any) {
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (peerId: string, message: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await (window as any).electron?.invoke('libp2p:sendMessage', peerId, message);
      return result;
    } catch (err: any) {
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getConnectedPeers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await (window as any).electron?.invoke('libp2p:getConnectedPeers');
      return result;
    } catch (err: any) {
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getPeerInfo,
    getMultiaddrs,
    dialPeer,
    sendMessage,
    getConnectedPeers,
  };
}

// Hook for crypto operations
export function useCrypto() {
  const encrypt = useCallback(async (data: string, key: string) => {
    try {
      const result = await (window as any).electron?.invoke('crypto:encrypt', data, key);
      return result;
    } catch (err: any) {
      return { error: err.message };
    }
  }, []);

  const decrypt = useCallback(async (ciphertext: string, key: string, iv: string, tag: string) => {
    try {
      const result = await (window as any).electron?.invoke('crypto:decrypt', ciphertext, key, iv, tag);
      return result;
    } catch (err: any) {
      return { error: err.message };
    }
  }, []);

  const generateKey = useCallback(async () => {
    try {
      const result = await (window as any).electron?.invoke('crypto:generateKey');
      return result;
    } catch (err: any) {
      return { error: err.message };
    }
  }, []);

  return { encrypt, decrypt, generateKey };
}