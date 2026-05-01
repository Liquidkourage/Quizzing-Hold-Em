import { z } from 'zod'
import type { GameState, Question } from '@qhe/core'

export type { GameState, Question }

export const ClientRole = z.enum(['host', 'player', 'display'])
export type ClientRole = z.infer<typeof ClientRole>

export const ClientHello = z.object({
  role: ClientRole,
  name: z.string(),
  roomCode: z.string(),
  tableId: z.string().optional(),
  /** Sent by host builds when server.env HOST_SECRET is set */
  hostSecret: z.string().optional()
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

export const CheckAction = z.object({
  playerId: z.string()
})
export type CheckAction = z.infer<typeof CheckAction>

export const CallAction = z.object({
  playerId: z.string()
})
export type CallAction = z.infer<typeof CallAction>

export const RaiseAction = z.object({
  playerId: z.string(),
  amount: z.number()
})
export type RaiseAction = z.infer<typeof RaiseAction>

export const AllInAction = z.object({
  playerId: z.string()
})
export type AllInAction = z.infer<typeof AllInAction>

export const FoldAction = z.object({
  playerId: z.string()
})
export type FoldAction = z.infer<typeof FoldAction>

export const SubmitAnswerAction = z.object({
  playerId: z.string(),
  answer: z.number()
})
export type SubmitAnswerAction = z.infer<typeof SubmitAnswerAction>

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

export const StartAnsweringAction = z.object({
  type: z.literal('startAnswering')
})
export type StartAnsweringAction = z.infer<typeof StartAnsweringAction>

// Socket Events
export interface ServerToClientEvents {
  state: (state: GameState) => void
  toast: (message: string) => void
  ack: (ack: ServerAck) => void
  dealingCards: () => void
  dealingCommunityCards: () => void
  seated: (info: { tableId: string }) => void
  /** Sent only to sockets in HOST:{venue} — full bank including answers */
  questionBank: (questions: Question[]) => void
}

export interface ClientToServerEvents {
  hello: (data: ClientHello) => void
  action: (data: { type: string; payload?: any }) => void
}

// Host admin actions
export const AdminCloseBettingAction = z.object({ type: z.literal('adminCloseBetting') })
export type AdminCloseBettingAction = z.infer<typeof AdminCloseBettingAction>

export const AdminAdvanceTurnAction = z.object({ type: z.literal('adminAdvanceTurn') })
export type AdminAdvanceTurnAction = z.infer<typeof AdminAdvanceTurnAction>

export const AdminSetBlindsAction = z.object({
  type: z.literal('adminSetBlinds'),
  smallBlind: z.number(),
  bigBlind: z.number()
})
export type AdminSetBlindsAction = z.infer<typeof AdminSetBlindsAction>

export type InterServerEvents = Record<string, never>;
export type SocketData = { role: ClientRole; name: string; room: string; userId: string };

// Re-export client utilities
export * from './client';
