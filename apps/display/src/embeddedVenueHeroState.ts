import type { DisplayVenueTileSnapshot } from '@qhe/net'
import type { GamePhase, GameState, PlayerState, SeatBettingAction, NumericCard } from '@qhe/core'
import { createEmptyGame, venueTileActingSeatIndex } from '@qhe/core'

function isCardDigit(n: unknown): n is NumericCard['digit'] {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 9
}

function holeHandFromTileSeat(
  tile: DisplayVenueTileSnapshot,
  physicalSeat: number
): NumericCard[] {
  const pair = tile.seatHoleDigits?.[physicalSeat]
  if (pair == null || pair.length < 2) return []
  const d0 = pair[0]
  const d1 = pair[1]
  if (!isCardDigit(d0) || !isCardDigit(d1)) return []
  return [{ digit: d0 }, { digit: d1 }]
}

function communityFromTile(tile: DisplayVenueTileSnapshot): NumericCard[] {
  const digits = tile.communityDigits
  if (!Array.isArray(digits) || digits.length === 0) return []
  const out: NumericCard[] = []
  for (const d of digits) {
    if (!isCardDigit(d)) continue
    out.push({ digit: d })
  }
  return out
}

function isSeatBettingAction(x: unknown): x is SeatBettingAction {
  return x === 'check' || x === 'call' || x === 'raise' || x === 'fold' || x === 'allIn'
}

const PHASES: readonly GamePhase[] = [
  'lobby',
  'question',
  'betting',
  'answering',
  'reveal',
  'showdown',
  'payout',
  'intermission',
] as const

const phaseSet = new Set<string>(PHASES)

function coercePhase(raw: string): GamePhase {
  return phaseSet.has(raw) ? (raw as GamePhase) : 'lobby'
}

/**
 * Venue-wall embedded felts subscribe to **one** table session over the socket, while the spotlight
 * may tour other numbered tables during lobby — or have no snapshot yet. When the subscribed
 * `GameState.tableId` does not match {@link feltTableHint}, build lobby-shaped state from the
 * venue mosaic tile so heroes match thumbnails and seated rosters.
 */
export function embeddedHeroDisplayState(
  gameState: GameState | null,
  feltTableHint: string,
  tile: DisplayVenueTileSnapshot | undefined | null,
  venueCode: string
): GameState {
  const tid = feltTableHint.trim()
  if (!tid) return createEmptyGame(venueCode)

  const socketMatches = gameState != null && String(gameState.tableId) === tid

  if (socketMatches) {
    return gameState
  }

  if (tile != null && tile.tableNum === Number.parseInt(tid, 10)) {
    const base = createEmptyGame(venueCode, '', tid)
    const players: PlayerState[] = []
    /** Physical seat slot (venue wall index); parallel to players[] built from contiguous occupied seats only. */
    const physicalSeatByPlayerIdx: number[] = []

    const names = tile.seatNames
    const max = typeof names?.length === 'number' ? names.length : 0

    for (let i = 0; i < max; i++) {
      const name = typeof names[i] === 'string' ? names[i]!.trim() : ''
      if (!name) continue

      const brRaw = tile.seatBankrolls?.[i]
      const bankroll =
        typeof brRaw === 'number' && Number.isFinite(brRaw)
          ? brRaw
          : 1000

      const folded = tile.seatFolded?.[i] === true
      let submittedAnswer: number | undefined
      if (!folded) {
        const g = tile.seatSubmittedAnswers?.[i]
        if (typeof g === 'number' && Number.isFinite(g)) submittedAnswer = g
      }

      players.push({
        id: `venue-wall-seat-${tid}-${i}`,
        name,
        bankroll,
        hand: folded ? [] : holeHandFromTileSeat(tile, i),
        hasFolded: folded,
        isAllIn: false,
        ...(submittedAnswer !== undefined ? { submittedAnswer } : {}),
      })
      physicalSeatByPlayerIdx.push(i)
    }

    const nPlayers = players.length
    /** Map server's physical seat (`tile.dealerSeatIndex`) to compact `players[]` index when seat grids have gaps. */
    let dealerPlayerIndex = base.round.dealerIndex
    if (typeof tile.dealerSeatIndex === 'number' && Number.isFinite(tile.dealerSeatIndex)) {
      const dSeat = Math.floor(tile.dealerSeatIndex)
      const at = physicalSeatByPlayerIdx.indexOf(dSeat)
      if (at >= 0) dealerPlayerIndex = at
      else if (nPlayers > 0) dealerPlayerIndex = 0
    }

    const phase = coercePhase(tile.phase)

    let round = {
      ...base.round,
      pot: typeof tile.pot === 'number' && Number.isFinite(tile.pot) ? tile.pot : 0,
      dealerIndex: dealerPlayerIndex,
    }

    if (phase === 'betting') {
      const open = tile.isBettingOpen === true
      let currentPlayerIndex = -1
      if (open) {
        const phys = venueTileActingSeatIndex(tile)
        if (phys != null) {
          const pi = physicalSeatByPlayerIdx.indexOf(phys)
          if (pi >= 0) currentPlayerIndex = pi
          else if (phys >= 0 && phys < nPlayers) currentPlayerIndex = phys
        }
      }

      const lastSeatBettingAction: (SeatBettingAction | null)[] = Array.from(
        { length: nPlayers },
        () => null
      )
      const src = tile.seatLastBettingAction
      if (Array.isArray(src)) {
        for (let pi = 0; pi < nPlayers; pi++) {
          const phys = physicalSeatByPlayerIdx[pi]!
          const v = src[phys]
          lastSeatBettingAction[pi] = isSeatBettingAction(v) ? v : null
        }
      }

      round = {
        ...round,
        isBettingOpen: open,
        currentPlayerIndex,
        lastSeatBettingAction,
      }
    }

    const communityCards = communityFromTile(tile)

    let question = base.round.question
    if (
      (phase === 'showdown' || phase === 'reveal') &&
      typeof tile.showdownAnswer === 'number' &&
      Number.isFinite(tile.showdownAnswer)
    ) {
      const qt = tile.showdownQuestionText
      question = {
        id: `venue-wall-showdown-${tid}`,
        text: typeof qt === 'string' && qt.trim() !== '' ? qt.trim() : 'Trivia',
        answer: tile.showdownAnswer,
      }
    }

    return {
      ...base,
      phase,
      players,
      round: {
        ...round,
        ...(communityCards.length > 0 ? { communityCards } : {}),
        ...(question != null ? { question } : {}),
      },
    }
  }

  return createEmptyGame(venueCode, '', tid)
}
