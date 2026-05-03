import { useEffect, useMemo, useState } from 'react'
import type { DisplayLayoutPayload } from '@qhe/net'
import { connect, onDisplayLayout } from '@qhe/net'
import DisplayTableLive from './App.tsx'
import VenueEightTablesPreview from './VenueEightTablesPreview.tsx'

function readUrlLayoutBootstrap(): DisplayLayoutPayload {
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
  const table = s.get('table')?.trim() || '1'
  return { layout: 'singleTable', tableId: table }
}

/**
 * Holds the websocket for the venue’s displays. Host pushes layout from the Venue tab.
 */
export default function DisplayRouter() {
  const venueCode =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase() || 'HOST01'
      : 'HOST01'

  const [layout, setLayout] = useState<DisplayLayoutPayload>(() =>
    typeof window !== 'undefined'
      ? readUrlLayoutBootstrap()
      : ({ layout: 'singleTable', tableId: '1' } satisfies DisplayLayoutPayload)
  )

  const connectFingerprint = useMemo(() => {
    if (layout.layout === 'venueWall') return `${venueCode}:wall`
    return `${venueCode}:tbl:${layout.tableId}`
  }, [
    venueCode,
    layout.layout,
    layout.layout === 'singleTable' ? layout.tableId : '',
  ])

  useEffect(() => {
    const disconnectSock =
      layout.layout === 'venueWall'
        ? connect('display', 'DISPLAY01', venueCode, '1', {
            displayVenueWall: true,
            displayFocusTable: layout.focusTable ?? null,
          })
        : connect('display', 'DISPLAY01', venueCode, layout.tableId)

    const offDisplay = onDisplayLayout((next) => setLayout(next))

    return () => {
      offDisplay()
      disconnectSock()
    }
    // Spotlight-only updates do not reconnect (same fingerprint). When connect() swaps the
    // socket instance, layout listeners must attach to the new one — hence one effect with cleanup.
  }, [connectFingerprint, venueCode])

  if (layout.layout === 'venueWall') {
    return <VenueEightTablesPreview venueCode={venueCode} focusTable={layout.focusTable} />
  }

  return <DisplayTableLive />
}
