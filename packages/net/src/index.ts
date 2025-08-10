import { z } from 'zod';

export const ClientRole = z.enum(['host','player','display']);
export type ClientRole = z.infer<typeof ClientRole>;

export const ClientHello = z.object({ role: ClientRole, name: z.string().min(1), room: z.string().min(4).max(8) });
export type ClientHello = z.infer<typeof ClientHello>;

export const ServerAck = z.object({ ok: z.boolean(), message: z.string().optional() });
export type ServerAck = z.infer<typeof ServerAck>;

export interface ServerToClientEvents {
  state: (payload: any) => void;
  toast: (message: string) => void;
}
export interface ClientToServerEvents {
  hello: (payload: ClientHello, cb: (ack: ServerAck) => void) => void;
  action: (type: string, payload: any) => void;
}

export type InterServerEvents = Record<string, never>;
export type SocketData = { role: ClientRole; name: string; room: string; userId: string };

// Re-export client utilities
export * from './client';
