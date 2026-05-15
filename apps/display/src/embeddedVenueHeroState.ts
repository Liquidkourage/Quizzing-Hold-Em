import type { DisplayVenueTileSnapshot } from '@qhe/net'
import type { GamePhase, GameState, PlayerState } from '@qhe/core'
import { createEmptyGame } from '@qhe/core'

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

      players.push({
        id: `venue-wall-seat-${tid}-${i}`,
        name,
        bankroll,
        hand: [],
        hasFolded: folded,
        isAllIn: false,
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

    return {
      ...base,
      phase,
      players,
      round: {
        ...base.round,
        pot: typeof tile.pot === 'number' && Number.isFinite(tile.pot) ? tile.pot : 0,
        dealerIndex: dealerPlayerIndex,
      },
    }
  }

  return createEmptyGame(venueCode, '', tid)
}
