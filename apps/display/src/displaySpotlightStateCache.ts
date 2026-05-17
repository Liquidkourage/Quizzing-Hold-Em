import type { GameState } from '@qhe/core'

/** Last `state` payload per numbered table — hydrates venue hero when spotlight table changes. */
const byTableId = new Map<string, GameState>()

export function cacheDisplaySpotlightState(gs: GameState): void {
  const tid = String(gs.tableId ?? '').trim()
  if (!tid) return
  byTableId.set(tid, gs)
}

export function readDisplaySpotlightState(tableId: string): GameState | undefined {
  const tid = tableId.trim()
  if (!tid) return undefined
  const gs = byTableId.get(tid)
  if (gs == null || String(gs.tableId) !== tid) return undefined
  return gs
}

export function clearDisplaySpotlightState(tableId?: string): void {
  if (tableId == null) {
    byTableId.clear()
    return
  }
  byTableId.delete(tableId.trim())
}
