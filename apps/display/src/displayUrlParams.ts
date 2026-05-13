import type { DisplayLayoutPayload } from '@qhe/net'

/** `room=` present — bypass pairing; omit or blank → pairing screen unless already handed off */
export function readDisplayRoomFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const r = new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase()
  return r && r.length > 0 ? r : null
}

/** Shared URL parsing for display demo / offline parity. */
export function readDisplayVenueCode(): string {
  if (typeof window === 'undefined') return 'HOST01'
  return new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase() || 'HOST01'
}

/** Fallback table id when layout does not pin a felt (e.g. demo shell). Honors `?table=1`–`8`. */
export function readDisplayTableIdFromUrl(): string {
  if (typeof window === 'undefined') return '1'
  const tableParam = new URLSearchParams(window.location.search).get('table')?.trim()
  if (tableParam) {
    const n = Number(tableParam)
    if (Number.isInteger(n) && n >= 1 && n <= 8) return String(n)
  }
  return '1'
}

/** Initial layout before the first `displayLayout` from the server. `?table=N` (1–8) opens in spotlight. */
export function readUrlLayoutBootstrap(): DisplayLayoutPayload {
  if (typeof window === 'undefined') {
    return { layout: 'venueWall', focusTable: null }
  }
  const tableParam = new URLSearchParams(window.location.search).get('table')?.trim()
  if (tableParam) {
    const n = Number(tableParam)
    if (Number.isInteger(n) && n >= 1 && n <= 8) {
      return { layout: 'venueWall', focusTable: n }
    }
  }
  return { layout: 'venueWall', focusTable: null }
}
