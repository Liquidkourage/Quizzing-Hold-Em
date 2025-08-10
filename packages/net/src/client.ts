import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@qhe/net';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function connect(role: 'host'|'player'|'display', name: string, room: string, url = 'http://localhost:5174') {
  if (socket) return socket;
  socket = io(url, { transports: ['websocket'] });
  socket.emit('hello', { role, name, room }, (ack: any) => {
    if (!ack?.ok) console.warn('join failed', ack?.message);
  });
  return socket;
}

export function onState(cb: (state: any) => void) {
  socket?.on('state', cb);
}

export function useSocket() { return socket; }
