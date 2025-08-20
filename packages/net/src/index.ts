import { z } from 'zod'
import type { GameState } from '@qhe/core'

export type { GameState }

export const ClientRole = z.enum(['host', 'player', 'display'])
export type ClientRole = z.infer<typeof ClientRole>

export const ClientHello = z.object({
  role: ClientRole,
  name: z.string(),
  roomCode: z.string()
})
export type ClientHello = z.infer<typeof ClientHello>

export const ServerAck = z.object({
  ok: z.boolean(),
  message: z.string()
})
export type ServerAck = z.infer<typeof ServerAck>

// Game Actions
export const StartGameAction = z.object({
  type: z.literal('startGame')
})
export type StartGameAction = z.infer<typeof StartGameAction>

export const SetQuestionAction = z.object({
  type: z.literal('setQuestion')
})
export type SetQuestionAction = z.infer<typeof SetQuestionAction>

export const DealCardsAction = z.object({
  type: z.literal('dealInitialCards').or(z.literal('dealCommunityCards'))
})
export type DealCardsAction = z.infer<typeof DealCardsAction>

export const BetAction = z.object({
  playerId: z.string(),
  amount: z.number()
})
export type BetAction = z.infer<typeof BetAction>

export const FoldAction = z.object({
  playerId: z.string()
})
export type FoldAction = z.infer<typeof FoldAction>

export const RevealAnswerAction = z.object({
  type: z.literal('revealAnswer')
})
export type RevealAnswerAction = z.infer<typeof RevealAnswerAction>

export const EndRoundAction = z.object({
  type: z.literal('endRound')
})
export type EndRoundAction = z.infer<typeof EndRoundAction>

export const NewGameAction = z.object({
  type: z.literal('newGame')
})
export type NewGameAction = z.infer<typeof NewGameAction>

// Socket Events
export interface ServerToClientEvents {
  state: (state: GameState) => void
  toast: (message: string) => void
  ack: (ack: ServerAck) => void
}

export interface ClientToServerEvents {
  hello: (data: ClientHello) => void
  action: (data: { type: string; payload?: any }) => void
}

export type InterServerEvents = Record<string, never>;
export type SocketData = { role: ClientRole; name: string; room: string; userId: string };

// Re-export client utilities
export * from './client';
