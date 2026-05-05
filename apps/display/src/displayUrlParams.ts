import type { DisplayLayoutPayload } from '@qhe/net'

/** `room=` present — bypass pairing; omit or blank → pairing screen unless already handed off */
export function readDisplayRoomFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const r = new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase()
  return r && r.length > 0 ? r : null
}

/** Shared URL parsing for display bootstrap (router + offline demo parity). */
export function readDisplayVenueCode(): string {
  if (typeof window === 'undefined') return 'HOST01'
  return new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase() || 'HOST01'
}

/** Table currently shown on fullscreen live felt (spotlight / single URL). */
export function readDisplayTableIdFromUrl(): string {
  if (typeof window === 'undefined') return '1'
  const s = new URLSearchParams(window.location.search)
  const tp = (s.get('tablesPreview') ?? '').trim().toLowerCase()
  const wallFromUrl =
    s.has('tablesPreview') &&
    tp !== '' &&
    !['0', 'false', 'no', 'off'].includes(tp)
  if (wallFromUrl) {
    const raw = s.get('focusTable') ?? s.get('tableFocus')
    if (raw != null && raw.trim() !== '') {
      const n = Number(raw)
      if (Number.isInteger(n) && n >= 1 && n <= 8) return String(n)
    }
    return '1'
  }
  const tableParam = s.get('table')?.trim()
  if (tableParam) return tableParam
  return '1'
}

export function readUrlLayoutBootstrap(): DisplayLayoutPayload {
  if (typeof window === 'undefined') {
    return { layout: 'venueWall', focusTable: 1 }
  }
  const s = new URLSearchParams(window.location.search)
  const tp = (s.get('tablesPreview') ?? '').trim().toLowerCase()
  const wallFromUrl =
    s.has('tablesPreview') &&
    tp !== '' &&
    !['0', 'false', 'no', 'off'].includes(tp)
  if (wallFromUrl) {
    const raw = s.get('focusTable') ?? s.get('tableFocus')
    let focusTable: number | null = null
    if (raw != null && raw.trim() !== '') {
      const n = Number(raw)
      if (Number.isInteger(n) && n >= 1 && n <= 8) focusTable = n
    }
    return { layout: 'venueWall', focusTable }
  }
  const tableParam = s.get('table')?.trim() || '1'
  const n = Number(tableParam)
  if (Number.isInteger(n) && n >= 1 && n <= 8) {
    return { layout: 'venueWall', focusTable: n }
  }
  return { layout: 'singleTable', tableId: tableParam }
}
