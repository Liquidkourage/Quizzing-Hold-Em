import { randomBytes } from 'crypto'
import type { GameState } from '@qhe/core'
import {
  addPlayer,
  removePlayer,
  submitAnswer,
  foldPlayer,
  playerCheck,
  playerCall,
  generateAllArrangements,
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
  const n = Math.max(1, Math.min(8, Math.floor(Number(requested) || 1)))
  let s = state
  for (let i = 0; i < n; i++) {
    if (s.players.length >= s.maxPlayers) break
    const id = generateVirtualSeatId()
    const ordinal = liveVirtualCount(s) + 1
    s = addPlayer(s, id, `CPU ${ordinal}`)
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

function nearestGuessFromDigits(digits: number[], answer: number): number {
  const arr = [...digits]
  if (arr.length === 0) return 0
  const cand = generateAllArrangements(arr)
  let best = cand[0] ?? 0
  let dist = Infinity
  for (const value of cand) {
    const d = Math.abs(value - answer)
    if (d < dist) {
      dist = d
      best = value
    }
  }
  return best
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
    const answer = nearestGuessFromDigits(
      [...virtualFirstNeedingAnswer.hand, ...state.round.communityCards].map(c => c.digit),
      state.round.question.answer
    )
    return submitAnswer(state, virtualFirstNeedingAnswer.id, answer)
  }

  if (state.phase !== 'betting' || !state.round.isBettingOpen) return state

  const idx = typeof state.round.currentPlayerIndex === 'number' ? state.round.currentPlayerIndex : -1
  if (idx < 0 || idx >= state.players.length) return state

  const seat = state.players[idx]
  if (!seat || !isVirtualPlayerId(seat.id) || seat.hasFolded || seat.isAllIn) return state

  const pid = seat.id

  let s = playerCheck(state, pid)
  if (s !== state) return s

  s = playerCall(state, pid)
  if (s !== state) return s

  return foldPlayer(state, pid)
}

const MAX_BOT_STEPS = 120

/** Run bots until idle or iteration cap (whole table loop). */
export function runVirtualPlayerSimulation(state: GameState): GameState {
  let s = state
  for (let i = 0; i < MAX_BOT_STEPS; i++) {
    const next = stepVirtualSimulation(s)
    if (next === s) break
    s = next
  }
  return s
}
