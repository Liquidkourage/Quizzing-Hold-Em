import { z } from 'zod'
import type { GameState, Question, Setlist, SeatBettingAction } from '@qhe/core'

export type { GameState, Question, Setlist, SeatBettingAction }

/** Full venue library + active rundown playhead (host-only via `hostLibrary`). */
export type HostLibrarySnapshot = {
  questions: Question[]
  setlists: Setlist[]
  activeSetlistId: string | null
  activeSetlistNextIndex: number
  /** Default trivia answer countdown for this venue (seconds). Omitted by older servers. */
  answerWindowSeconds?: number
}

export const ClientRole = z.enum(['host', 'player', 'display'])
export type ClientRole = z.infer<typeof ClientRole>

/** Host-driven `/display` mode: mosaic shell always; `focusTable` spotlights one felt or null for overview. */
export type DisplayLayoutPayload = { layout: 'venueWall'; focusTable: number | null }

/** Mosaic row for `/display` venue wall — derived live from tables 1–8 sessions. */
export type DisplayVenueTileSnapshot = {
  tableNum: number
  seated: number
  pot: number
  phase: string
  /** Up to eight seat labels (vacant seats are empty strings), index matches player order on the felt. */
  seatNames: string[]
  /** Chip stacks per seat, parallel to `seatNames`; `0` when empty. Omitted by older servers. */
  seatBankrolls?: number[]
  /**
   * Blind roles on the venue mosaic (indexes into `seatNames`, same contiguous roster as core `players[]`).
   * Omitted by older servers; when present, nullable fields indicate no seated table / HU without SB.
   */
  dealerSeatIndex?: number | null
  smallBlindSeatIndex?: number | null
  bigBlindSeatIndex?: number | null
  /** Seat marker to pulse during open betting (same indexing as `seatNames`). Omitted by older servers. */
  actingSeatIndex?: number | null
  /** Betting: engine seat index to act (-1 encoded as null). Lets the venue wall recompute acting seat from live round state. */
  currentPlayerIndex?: number | null
  /** Betting: false when wagering is explicitly closed between streets. Null when unknown / older payloads. */
  isBettingOpen?: boolean | null
  /** 1 = pre-board, 2 = post-board. Omitted by older servers. */
  bettingRound?: number | null
  /** Parallel to `seatNames`: true when that roster seat has folded this hand. Omitted by older servers. */
  seatFolded?: boolean[]
  /** This wagering street only: last check / call / raise / fold / all-in per seat. Omitted by older servers. */
  seatLastBettingAction?: (SeatBettingAction | null)[]
  /** Player to act: chips to call (min of facing amount and stack). Omitted when no one is up to wager. */
  actingCallAmount?: number | null
  /** Same player: % of current stack required for that call. Omitted when unknown or not applicable. */
  actingCallPctOfStack?: number | null
  /**
   * Heuristic cue for spotlighting active play (≥2 seated, open wagering or mid-hand trivia).
   * Omitted when false / older servers.
   */
  interestingAction?: boolean
  /**
   * Per physical seat (parallel `seatNames`): hole card digits when dealt, else null.
   * Lets the venue hero show cards before the spotlight socket `state` reconnects.
   */
  seatHoleDigits?: (readonly [number, number] | null)[]
  /** Community board digits for this table's current hand. Omitted when empty. */
  communityDigits?: number[]
  /** Trivia answer while this felt is in showdown / reveal (parallel `seatNames`). */
  showdownAnswer?: number | null
  /** Question text for mosaic / embedded hero during showdown. */
  showdownQuestionText?: string | null
  /**
   * Parallel to `seatNames` (physical 0..7): each seated player's trivia guess.
   * Null when folded or no submission.
   */
  seatSubmittedAnswers?: (number | null)[]
  /**
   * Parallel to `seatNames`: community board indices (0–4) each player used in their answer.
   * Omitted when unknown / older servers.
   */
  seatAnswerCommunityIndices?: (readonly number[] | null)[]
}

/** Venue wall payload: table mosaic plus **shared trivia strip** keyed off the hottest trivia phase (prefer answering, then setup, etc.), not blindly table 1. */
export type DisplayVenueWallSnapshot = {
  tiles: DisplayVenueTileSnapshot[]
  /** Shared trivia headline: emitted from the current hand’s question through wagering, answering, and post-trivia phases while `round.question` is set. */
  headlineQuestionText: string | null
  /** Server epoch ms when a trivia-visible felt is in `answering` with `answerDeadline`; cleared outside that window. */
  answerDeadlineMs: number | null
  /** Humans in lobby pool (`LOBBY` session); 0 before anyone joins lobby. */
  lobbyPlayerCount: number
  /** Sum of seated humans across numbered tables (1–8). */
  totalSeatedAtTables: number
  /**
   * Public TV briefing: false after host **Assign from lobby** (or **Start Game** fallback for single-table flows),
   * mosaic tile phases, or local mosaic force.
   */
  showAudienceWelcome: boolean
}

/** Host-only (HOST:{venue}): numbered felts with “something happening now” spotlight cue. */
export type HostVenueGameplayHintsPayload = {
  livelyTableNums: number[]
}

/** Host-only: one row per felt 1–8 for lockstep alignment (updates with venue wall refresh). */
export type HostVenueFeltBeatRow = {
  tableNum: number
  /** False when no `VENUE:N` session exists yet. */
  active: boolean
  seated: number
  /** Core `phase`, or `inactive` when no session. */
  phase: string
  street: string
  clock: string
  answerDeadlineMs: number | null
  /**
   * Server lockstep fingerprint (`phaseStrictSignature`); `null` when inactive.
   * Host compares across active felts to flag drift.
   */
  phaseStrictSig: string | null
}

export type HostVenueFeltBeatPayload = {
  felts: HostVenueFeltBeatRow[]
}

export const ClientHello = z.object({
  role: ClientRole,
  name: z.string(),
  roomCode: z.string(),
  tableId: z.string().optional(),
  /** Sent by host builds when server.env HOST_SECRET is set */
  hostSecret: z.string().optional(),
  /** Display: URL / bootstrap hint when server has no persisted layout yet */
  displayVenueWall: z.boolean().optional(),
  /** Display: spotlight felt 1–8 for venue wall */
  displayFocusTable: z.number().int().min(1).max(8).nullable().optional(),
  /** Display: pairing mode — no venue yet; server shows a short code for the host */
  displayAwaitPairing: z.boolean().optional(),
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

export const AnswerCardPick = z.object({
  source: z.enum(['hole', 'community']),
  index: z.number().int().min(0).max(4),
})

export const SubmitAnswerAction = z.object({
  playerId: z.string(),
  answer: z.number(),
  composition: z.array(AnswerCardPick).length(5).optional(),
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
  dealingCommunityCards: (payload?: { tableNum: number }) => void
  seated: (info: { tableId: string }) => void
  /** Sent only to sockets in HOST:{venue} — bank, setlists, active rundown */
  hostLibrary: (snapshot: HostLibrarySnapshot) => void
  /** Host cue: felts worth checking for public spotlight (cheap heuristic; updates with venue wall). */
  hostVenueGameplayHints: (payload: HostVenueGameplayHintsPayload) => void
  /** Host cue: structured 1–8 beat rows (updates with venue wall). */
  hostVenueFeltBeat: (payload: HostVenueFeltBeatPayload) => void
  /** Venue displays (DISPLAY:{venue}); host drives via displaySetLayout */
  displayLayout: (layout: DisplayLayoutPayload) => void
  /** Venue wall mosaic + current question / answer timer */
  displayVenueSnapshot: (payload: DisplayVenueWallSnapshot) => void
  /** Display pairing: TV shows this 4-character code until the host claims it */
  displayPairingCode: (payload: { code: string }) => void
  /** Pairing succeeded — UI should reconnect / promote as this venue display */
  displayVenueAssigned: (payload: { venueCode: string }) => void
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
