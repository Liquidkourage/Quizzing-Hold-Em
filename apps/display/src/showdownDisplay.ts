import {
  answerCompositionForPlayer,
  communityIndicesFromAnswerComposition,
  type GameState,
} from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'

export type ShowdownResultRow = {
  seat: number
  name: string
  holes: readonly [number, number] | null
  submitted: number | null
  hasFolded: boolean
  /** Full five-card board for this table (showdown). */
  communityBoard: readonly number[] | null
  /** Board indices 0–4 this player used in their composed answer. */
  answerCommunityIndices: number[]
}

function communityIndicesForPlayer(
  composition: ReturnType<typeof answerCompositionForPlayer>,
  tileIndices: readonly number[] | null | undefined
): number[] {
  if (tileIndices != null && tileIndices.length > 0) return [...tileIndices]
  return communityIndicesFromAnswerComposition(composition ?? undefined)
}

export function showdownCorrectAnswerFromTile(
  tile: DisplayVenueTileSnapshot
): number | undefined {
  const a = tile.showdownAnswer
  return typeof a === 'number' && Number.isFinite(a) ? a : undefined
}

function communityBoardFromTile(tile: DisplayVenueTileSnapshot): readonly number[] | null {
  const digits = tile.communityDigits
  if (!Array.isArray(digits) || digits.length === 0) return null
  const out: number[] = []
  for (const d of digits) {
    if (typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 9) out.push(d)
  }
  return out.length > 0 ? out : null
}

export function showdownRowsFromTile(tile: DisplayVenueTileSnapshot): ShowdownResultRow[] {
  const names = tile.seatNames ?? []
  const folded = tile.seatFolded ?? []
  const holes = tile.seatHoleDigits
  const guesses = tile.seatSubmittedAnswers
  const communityPicks = tile.seatAnswerCommunityIndices
  const communityBoard = communityBoardFromTile(tile)
  const rows: ShowdownResultRow[] = []

  for (let i = 0; i < names.length; i++) {
    const name = typeof names[i] === 'string' ? names[i]!.trim() : ''
    if (!name) continue
    const hasFolded = folded[i] === true
    let holePair: readonly [number, number] | null = null
    const h = holes?.[i]
    if (
      !hasFolded &&
      h != null &&
      h.length >= 2 &&
      typeof h[0] === 'number' &&
      typeof h[1] === 'number'
    ) {
      holePair = [h[0], h[1]]
    }
    let submitted: number | null = null
    if (!hasFolded) {
      const g = guesses?.[i]
      if (typeof g === 'number' && Number.isFinite(g)) submitted = g
    }
    const answerCommunityIndices =
      !hasFolded && submitted != null
        ? communityIndicesForPlayer(null, communityPicks?.[i] ?? null)
        : []
    rows.push({
      seat: i + 1,
      name,
      holes: holePair,
      submitted,
      hasFolded,
      communityBoard,
      answerCommunityIndices,
    })
  }
  return rows
}

export function showdownRowsFromGameState(gs: GameState): ShowdownResultRow[] {
  const communityBoard =
    gs.round.communityCards.length > 0
      ? gs.round.communityCards.map((c) => c.digit)
      : null
  return gs.players.map((p, i) => {
    const holes: readonly [number, number] | null =
      !p.hasFolded && p.hand.length >= 2
        ? [p.hand[0]!.digit, p.hand[1]!.digit]
        : null
    const submitted =
      !p.hasFolded && typeof p.submittedAnswer === 'number' ? p.submittedAnswer : null
    const composition =
      submitted != null ? answerCompositionForPlayer(p, gs.round.communityCards) : null
    const answerCommunityIndices =
      submitted != null ? communityIndicesForPlayer(composition, undefined) : []
    return {
      seat: i + 1,
      name: p.name,
      holes,
      submitted,
      hasFolded: p.hasFolded,
      communityBoard,
      answerCommunityIndices,
    }
  })
}

export function sortShowdownRowsByDistance(
  rows: ShowdownResultRow[],
  correct: number | undefined
): { rows: ShowdownResultRow[]; winnerKey: string | null } {
  const ranked = rows.map((r) => {
    const has =
      !r.hasFolded && r.submitted != null && typeof correct === 'number'
    const distance = has ? Math.abs(r.submitted! - correct) : Infinity
    return { ...r, distance, has }
  })
  ranked.sort((a, b) => a.distance - b.distance)
  const winner =
    ranked.length > 0 && ranked[0]!.distance !== Infinity
      ? `${ranked[0]!.seat}:${ranked[0]!.name}`
      : null
  return {
    rows: ranked.map(
      ({
        seat,
        name,
        holes,
        submitted,
        hasFolded,
        communityBoard,
        answerCommunityIndices,
      }) => ({
        seat,
        name,
        holes,
        submitted,
        hasFolded,
        communityBoard,
        answerCommunityIndices,
      })
    ),
    winnerKey: winner,
  }
}

export function formatHoleDigits(holes: readonly [number, number] | null): string {
  if (holes == null) return '—'
  return `${holes[0]} · ${holes[1]}`
}
