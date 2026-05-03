import type { GameState, NumericCard, PlayerState, Question } from './index'

/** Shared copy for venue-wall tiles and seeded read-only display sessions (before any host mutates that table). */
export const DISPLAY_PREVIEW_DEMO_QUESTION_TEXT =
  'In whole minutes, boiling point of pure water at standard atmospheric pressure?'

/** °C at 1 atm (whole number) — matches overview “minutes” framing as numeric whole. */
export const DISPLAY_PREVIEW_DEMO_QUESTION_ANSWER = 100

export const DISPLAY_PREVIEW_SYNCED_PHASE = 'answering' as const

export const DISPLAY_PREVIEW_SYNCED_SUBTITLE =
  'Shared deadline when answering — countdown is identical venue-wide.'

/** Per-table snapshot: occupied seats (of 8) and local pot shown on venue wall tiles. */
export const DISPLAY_PREVIEW_TABLES = [
  { seated: 8, pot: 920 },
  { seated: 6, pot: 640 },
  { seated: 7, pot: 880 },
  { seated: 5, pot: 400 },
  { seated: 8, pot: 1100 },
  { seated: 6, pot: 520 },
  { seated: 7, pot: 760 },
  { seated: 8, pot: 1340 },
] as const

export const DISPLAY_PREVIEW_NAMES = [
  'Alice',
  'Bob',
  'Carol',
  'Dave',
  'Eve',
  'Frank',
  'Grace',
  'Henry',
] as const

export const DISPLAY_PREVIEW_BANKROLLS = [
  1200, 850, 1100, 950, 1350, 700, 1600, 900,
] as const

export function normalizeDisplayPreviewTableNum(tableId: string): number {
  const n = Number.parseInt(String(tableId).trim(), 10)
  if (!Number.isInteger(n) || n < 1 || n > 8) return 1
  return n
}

function digit(n: number): NumericCard {
  const d = ((n % 10) + 10) % 10
  return { digit: d as NumericCard['digit'] }
}

/** Deterministic “rehearsal” table: same roster/pot/trivia the venue wall mocks advertise. */
export function buildDisplayPreviewGameState(code: string, rawTableId: string): GameState {
  const tableNum = normalizeDisplayPreviewTableNum(rawTableId)
  const tableId = String(tableNum)
  const idx = tableNum - 1
  const snap = DISPLAY_PREVIEW_TABLES[idx] ?? DISPLAY_PREVIEW_TABLES[0]

  const players: PlayerState[] = []
  for (let i = 0; i < snap.seated; i++) {
    players.push({
      id: `vp:preview:${tableId}:${i}`,
      name: DISPLAY_PREVIEW_NAMES[i] ?? `Guest ${i + 1}`,
      bankroll: DISPLAY_PREVIEW_BANKROLLS[i % DISPLAY_PREVIEW_BANKROLLS.length],
      hand: [digit(i + 3), digit(i + 7)],
      hasFolded: false,
      isAllIn: false,
    })
  }

  const question: Question = {
    id: 'display-preview-q',
    text: DISPLAY_PREVIEW_DEMO_QUESTION_TEXT,
    answer: DISPLAY_PREVIEW_DEMO_QUESTION_ANSWER,
  }

  return {
    code,
    tableId,
    hostId: 'display-preview',
    createdAt: Date.now(),
    phase: 'answering',
    bigBlind: 20,
    smallBlind: 10,
    minPlayers: 2,
    maxPlayers: 8,
    players,
    round: {
      roundId: 'preview-r1',
      question,
      communityCards: [digit(1), digit(0), digit(0)],
      pot: snap.pot,
      dealerIndex: 0,
      bettingRound: 2,
      currentBet: 0,
      currentPlayerIndex: -1,
      isBettingOpen: false,
      playerBets: {},
      answerDeadline: Date.now() + 43_000,
    },
  }
}
