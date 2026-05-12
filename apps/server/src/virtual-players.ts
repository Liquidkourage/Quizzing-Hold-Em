import { randomBytes } from 'crypto'
import type { GameState } from '@qhe/core'
import {
  addPlayer,
  removePlayer,
  submitAnswer,
  foldPlayer,
  playerCheck,
  playerCall,
  playerRaise,
  playerAllIn,
  nearestLegalAnswerToTarget,
  rehearsalSeatDisplayName,
} from '@qhe/core'

/** Synthetic seats — never collide with Socket.IO ids. */
const VP_PREFIX = 'vp:'

export function isVirtualPlayerId(id: string): boolean {
  return id.startsWith(VP_PREFIX)
}

export function generateVirtualSeatId(): string {
  return `${VP_PREFIX}${randomBytes(10).toString('hex')}`
}

export function liveVirtualCount(state: GameState): number {
  return state.players.filter(p => isVirtualPlayerId(p.id)).length
}

export function addVirtualPlayers(state: GameState, requested: number): GameState {
  const room = Math.max(0, state.maxPlayers - state.players.length)
  if (room <= 0) return state
  const want = Math.floor(Number(requested) || 1)
  const n = Math.max(1, Math.min(room, want))
  let s = state
  for (let i = 0; i < n; i++) {
    const id = generateVirtualSeatId()
    const slot = liveVirtualCount(s)
    s = addPlayer(s, id, rehearsalSeatDisplayName(slot))
  }
  return s
}

/** Remove every virtual seat in one shot (host tooling). */
export function removeAllVirtualPlayers(state: GameState): GameState {
  let s = state
  const toDrop = s.players.filter(p => isVirtualPlayerId(p.id))
  for (const p of toDrop) {
    s = removePlayer(s, p.id)
  }
  return s
}

function vpAmountToCall(state: GameState, playerId: string): number {
  const cur = state.round.currentBet || 0
  const contrib = state.round.playerBets?.[playerId] || 0
  return Math.max(0, cur - contrib)
}

/** Human-like wagering: occasional open/raising, rarely fold useless, sometimes jam. */
function actVirtualBetting(state: GameState, pid: string): GameState {
  const seat = state.players.find((p) => p.id === pid)
  if (!seat) return state

  const toCall = vpAmountToCall(state, pid)
  const br = seat.bankroll
  const bbRaw = Math.max(state.bigBlind ?? 0, state.smallBlind ?? 0)
  const bb = bbRaw > 0 ? bbRaw : 10

  if (Math.random() < 0.03 && br > 0) {
    const ai = playerAllIn(state, pid)
    if (ai !== state) return ai
  }

  if (toCall === 0 && br > 0) {
    // Can check — sometimes open with a minimum raise instead
    if (Math.random() < 0.16 && br >= bb) {
      const raised = playerRaise(state, pid, bb)
      if (raised !== state) return raised
    }
    return playerCheck(state, pid)
  }

  if (toCall > 0 && br === 0) {
    return state
  }

  // Facing a bet — thin folds, flats, raises
  if (Math.random() < 0.11) {
    const f = foldPlayer(state, pid)
    if (f !== state) return f
  }
  const minRaise = bb
  if (Math.random() < 0.14 && br >= toCall + minRaise) {
    const raised = playerRaise(state, pid, minRaise)
    if (raised !== state) return raised
  }
  let c = playerCall(state, pid)
  if (c !== state) return c

  const f = foldPlayer(state, pid)
  if (f !== state) return f
  return state
}

function nearestGuessFromDigits(digits: number[], answer: number): number {
  if (digits.length !== 7) return 0
  return nearestLegalAnswerToTarget(digits, answer)
}

/** One deterministic step so real players can join between bot actions after each broadcast. */
function stepVirtualSimulation(state: GameState): GameState {
  if (!state.players.some(p => isVirtualPlayerId(p.id))) return state

  const virtualFirstNeedingAnswer = state.players.find(
    p =>
      isVirtualPlayerId(p.id) &&
      !p.hasFolded &&
      p.submittedAnswer === undefined &&
      state.phase === 'answering' &&
      state.round.question
  )

  if (virtualFirstNeedingAnswer && state.phase === 'answering' && state.round.question) {
    const digits = [...virtualFirstNeedingAnswer.hand, ...state.round.communityCards].map((c) => c.digit)
    const answer = nearestGuessFromDigits(digits, state.round.question.answer)
    return submitAnswer(state, virtualFirstNeedingAnswer.id, answer)
  }

  if (state.phase !== 'betting' || state.round.isBettingOpen === false) return state

  const idx = typeof state.round.currentPlayerIndex === 'number' ? state.round.currentPlayerIndex : -1
  if (idx < 0 || idx >= state.players.length) return state

  const seat = state.players[idx]
  if (!seat || !isVirtualPlayerId(seat.id) || seat.hasFolded || seat.isAllIn) return state

  const pid = seat.id

  return actVirtualBetting(state, pid)
}

/** Large tables may need hundreds of sequential CPU actions across two wagering waves. */
function maxSimulationSteps(gs: GameState): number {
  const n = Math.max(4, gs.players.length)
  return Math.min(10_000, Math.max(2_400, n * 180))
}

/** Run bots until idle or iteration cap (whole table loop). */
export function runVirtualPlayerSimulation(state: GameState): GameState {
  let s = state
  const cap = maxSimulationSteps(s)
  for (let i = 0; i < cap; i++) {
    const next = stepVirtualSimulation(s)
    if (next === s) break
    s = next
  }
  return s
}
