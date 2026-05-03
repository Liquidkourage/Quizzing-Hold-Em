import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
 * Host-driven layout from the Venue tab.
 * Venue wall (no spotlight): grid preview only — no felt `state`.
 * Spotlight or single-table: full `DisplayTableLive` subscribed to one felt session.
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

  const wallOverview = layout.layout === 'venueWall' && layout.focusTable == null

  const watchedLiveTableId = (): string => {
    if (layout.layout === 'singleTable') return layout.tableId
    if (layout.layout === 'venueWall' && layout.focusTable != null) return String(layout.focusTable)
    return '1'
  }

  const connectFingerprint = wallOverview ? `${venueCode}:wall` : `${venueCode}:tbl:${watchedLiveTableId()}`

  useEffect(() => {
    let disconnectSock: () => void
    if (layout.layout === 'venueWall' && layout.focusTable == null) {
      disconnectSock = connect('display', 'DISPLAY01', venueCode, '1', {
        displayVenueWall: true,
        displayFocusTable: null,
      })
    } else if (layout.layout === 'venueWall' && layout.focusTable != null) {
      disconnectSock = connect('display', 'DISPLAY01', venueCode, String(layout.focusTable), {
        displayVenueWall: true,
        displayFocusTable: layout.focusTable,
      })
    } else {
      disconnectSock = connect('display', 'DISPLAY01', venueCode, watchedLiveTableId())
    }

    const offDisplay = onDisplayLayout((next) => setLayout(next))

    return () => {
      offDisplay()
      disconnectSock()
    }
    // Narrow deps: reconnect only when which socket/session we bind to changes
  }, [connectFingerprint, venueCode])

  const feltMotionKey =
    layout.layout === 'singleTable'
      ? `felt-${layout.tableId}`
      : layout.layout === 'venueWall' && layout.focusTable != null
        ? `felt-spot-${layout.focusTable}`
        : 'felt-none'

  return (
    <AnimatePresence mode="wait">
      {wallOverview ? (
        <motion.div
          key="venue-wall-grid"
          className="relative min-h-screen w-full bg-slate-950"
          role="presentation"
          initial={{ opacity: 0, scale: 1.035 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.93 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <VenueEightTablesPreview venueCode={venueCode} />
        </motion.div>
      ) : (
        <motion.div
          key={feltMotionKey}
          className="relative min-h-screen w-full overflow-hidden"
          role="presentation"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <DisplayTableLive />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
