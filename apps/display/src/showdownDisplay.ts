import type { GameState } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'

export type ShowdownResultRow = {
  seat: number
  name: string
  holes: readonly [number, number] | null
  submitted: number | null
  hasFolded: boolean
}

export function showdownCorrectAnswerFromTile(
  tile: DisplayVenueTileSnapshot
): number | undefined {
  const a = tile.showdownAnswer
  return typeof a === 'number' && Number.isFinite(a) ? a : undefined
}

export function showdownRowsFromTile(tile: DisplayVenueTileSnapshot): ShowdownResultRow[] {
  const names = tile.seatNames ?? []
  const folded = tile.seatFolded ?? []
  const holes = tile.seatHoleDigits
  const guesses = tile.seatSubmittedAnswers
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
    rows.push({
      seat: i + 1,
      name,
      holes: holePair,
      submitted,
      hasFolded,
    })
  }
  return rows
}

export function showdownRowsFromGameState(gs: GameState): ShowdownResultRow[] {
  return gs.players.map((p, i) => {
    const holes: readonly [number, number] | null =
      !p.hasFolded && p.hand.length >= 2
        ? [p.hand[0]!.digit, p.hand[1]!.digit]
        : null
    const submitted =
      !p.hasFolded && typeof p.submittedAnswer === 'number' ? p.submittedAnswer : null
    return {
      seat: i + 1,
      name: p.name,
      holes,
      submitted,
      hasFolded: p.hasFolded,
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
    rows: ranked.map(({ seat, name, holes, submitted, hasFolded }) => ({
      seat,
      name,
      holes,
      submitted,
      hasFolded,
    })),
    winnerKey: winner,
  }
}

export function formatHoleDigits(holes: readonly [number, number] | null): string {
  if (holes == null) return '—'
  return `${holes[0]} · ${holes[1]}`
}
