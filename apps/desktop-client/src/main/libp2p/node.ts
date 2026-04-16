import { createLibp2p } from 'libp2p';
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { yamux } from '@libp2p/yamux';
import {tcp} from '@libp2p/tcp';
import {ws} from '@libp2p/websockets';
import {mdns} from '@libp2p/mdns';
import { bootstrap } from '@libp2p/bootstrap';
import { gossipsub } from '@libp2p/pubsub';
import { createPeerId } from '@libp2p/peer-id';
import { privateKeyFromProtobuf } from '@libp2p/peer-id';
import log from 'electron-log';
import * as crypto from 'crypto';
import Store from 'electron-store';

// Protocol constants
export const CHAT_PROTOCOL = '/chat/1.0.0';
export const FILE_PROTOCOL = '/file/1.0.0';
export const VOICE_PROTOCOL = '/voice/1.0.0';

// Initialize or load peer ID
async function getOrCreatePeerId(store: Store): Promise<any> {
  const stored = store.get('peerId') as string | undefined;
  
  if (stored) {
    try {
      const peerId = await createPeerId(Buffer.from(stored, 'base64'));
      return peerId;
    } catch (error) {
      log.warn('Failed to load stored peer ID, creating new one');
    }
  }
  
  // Generate new peer ID
  const peerId = await createPeerId();
  store.set('peerId', peerId.toBytes().toString('base64'));
  
  return peerId;
}

// Create libp2p node
export async function createLibp2pNode(): Promise<ReturnType<typeof createLibp2p>> {
  const store = new Store({ name: 'securep2p-config' });
  
  const peerId = await getOrCreatePeerId(store);
  
  const bootstrapPeers = (process.env.BOOTSTRAP_NODES || '')
    .split(',')
    .filter(Boolean)
    .map((addr) => addr.trim());

  const node = await createLibp2p({
    peerId,
    addresses: {
      listen: [
        '/ip4/0.0.0.0/tcp/0',
        '/ip4/0.0.0.0/tcp/0/ws',
      ],
      announce: [],
    },
    transports: [
      tcp(),
      ws(),
    ],
    connectionEncryption: [
      noise(),
    ],
    streamMuxers: [
      yamux(),
      mplex(),
    ],
    pubsub: gossipsub({ allowPublishToZeroPeers: true }),
    peerDiscovery: [
      mdns({
        enabled: true,
      }),
      ...(bootstrapPeers.length > 0
        ? [
            bootstrap({
              list: bootstrapPeers,
            }),
          ]
        : []),
    ],
    datastore: undefined,
  });

  return node;
}

// Handle incoming streams
export function setupProtocols(node: any, handlers: Map<string, Function>) {
  node.handle(CHAT_PROTOCOL, async ({ stream }: any) => {
    const handler = handlers.get(CHAT_PROTOCOL);
    if (handler) {
      await handler(stream);
    }
  });

  node.handle(FILE_PROTOCOL, async ({ stream }: any) => {
    const handler = handlers.get(FILE_PROTOCOL);
    if (handler) {
      await handler(stream);
    }
  });

  node.handle(VOICE_PROTOCOL, async ({ stream }: any) => {
    const handler = handlers.get(VOICE_PROTOCOL);
    if (handler) {
      await handler(stream);
    }
  });
}

// Dial to peer
export async function dialPeer(node: any, peerId: string, multiaddr: string) {
  try {
    await node.dial(`${multiaddr}/p2p/${peerId}`);
    return true;
  } catch (error) {
    log.error('Failed to dial peer:', error);
    return false;
  }
}

// Get peer info
export function getPeerInfo(node: any) {
  return {
    peerId: node.peerId.toString(),
    multiaddrs: node.getMultiaddrs().map((ma: any) => ma.toString()),
    addresses: Array.from(node.peerStore.peers.values()).map((peer: any) => ({
      id: peer.id.toString(),
      multiaddrs: peer.addresses.map((ma: any) => ma.toString()),
    })),
  };
}

export default { createLibp2pNode, setupProtocols, dialPeer, getPeerInfo };