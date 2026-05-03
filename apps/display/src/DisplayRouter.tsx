import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DisplayLayoutPayload } from '@qhe/net'
import { connect, onDisplayLayout } from '@qhe/net'
import DisplayTableLive from './App.tsx'
import VenueEightTablesPreview from './VenueEightTablesPreview.tsx'

/** Tile rect in viewport used to “iris” open the full felt from the grid. */
type IrisRect = { top: number; left: number; width: number; height: number }

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

function venueOverview(l: DisplayLayoutPayload) {
  return l.layout === 'venueWall' && l.focusTable == null
}

function venueSpotlightTable(l: DisplayLayoutPayload): number | null {
  if (l.layout === 'venueWall' && l.focusTable != null && Number.isFinite(l.focusTable)) {
    return l.focusTable
  }
  return null
}

function measureSpotlightTile(tableNum: number): IrisRect | null {
  if (typeof document === 'undefined') return null
  const el = document.querySelector(`[data-spotlight-tile="${tableNum}"]`)
  if (!(el instanceof HTMLElement)) return null
  const r = el.getBoundingClientRect()
  if (r.width < 8 || r.height < 8) return null
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

/** Translate + scale around viewport center so the full felt occupies the spotlight tile rect, then can ease to fullscreen. */
function irisMotionFromRect(rect: IrisRect) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080
  if (vw < 16 || vh < 16) return { x: 0, y: 0, scaleX: 1, scaleY: 1 }
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  return {
    x: cx - vw / 2,
    y: cy - vh / 2,
    scaleX: rect.width / vw,
    scaleY: rect.height / vh,
  }
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

  const layoutRef = useRef(layout)
  layoutRef.current = layout

  /** When set before entering felt from the grid, the shell animates tile → fullscreen. */
  const [irisFrom, setIrisFrom] = useState<IrisRect | null>(null)
  /** After any felt entrance animation, skip flashy re-enters (e.g. after iris clears). */
  const [feltEntranceIdle, setFeltEntranceIdle] = useState(false)

  const wallOverview = venueOverview(layout)

  const watchedLiveTableId = (): string => {
    if (layout.layout === 'singleTable') return layout.tableId
    const spot = venueSpotlightTable(layout)
    return spot != null ? String(spot) : '1'
  }

  const connectFingerprint = wallOverview ? `${venueCode}:wall` : `${venueCode}:tbl:${watchedLiveTableId()}`

  useEffect(() => {
    if (wallOverview) setFeltEntranceIdle(false)
  }, [wallOverview])

  useEffect(() => {
    let disconnectSock: () => void
    if (layout.layout === 'venueWall' && layout.focusTable == null) {
      disconnectSock = connect('display', 'DISPLAY01', venueCode, '1', {
        displayVenueWall: true,
        displayFocusTable: null,
      })
    } else if (layout.layout === 'venueWall' && layout.focusTable != null) {
      const ft = layout.focusTable
      disconnectSock = connect('display', 'DISPLAY01', venueCode, String(ft), {
        displayVenueWall: true,
        displayFocusTable: ft,
      })
    } else {
      disconnectSock = connect('display', 'DISPLAY01', venueCode, watchedLiveTableId())
    }

    const offDisplay = onDisplayLayout((next: DisplayLayoutPayload) => {
      const prev = layoutRef.current
      let iris: IrisRect | null = null

      const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true

      if (
        !reduceMotion &&
        venueOverview(prev) &&
        next.layout === 'venueWall' &&
        next.focusTable != null
      ) {
        iris = measureSpotlightTile(next.focusTable)
      }

      setIrisFrom(iris)
      layoutRef.current = next
      setLayout(next)
    })

    return () => {
      offDisplay()
      disconnectSock()
    }
  }, [connectFingerprint, venueCode])

  const spotTable = venueSpotlightTable(layout)

  const feltMotionKey =
    layout.layout === 'singleTable' ? `felt-${layout.tableId}` : spotTable != null ? `felt-spot-${spotTable}` : 'felt-none'

  /** Felt shell is always fullscreen; iris only tweens transforms (grow from tile center toward the TV center). */
  const fullscreenAnimate = {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    borderRadius: 0,
  }

  const useIris = irisFrom != null

  return (
    <AnimatePresence mode="sync">
      {wallOverview ? (
        <motion.div
          key="venue-wall-grid"
          className="relative z-10 min-h-screen w-full bg-slate-950"
          role="presentation"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <VenueEightTablesPreview venueCode={venueCode} />
        </motion.div>
      ) : (
        <motion.div
          key={feltMotionKey}
          role="presentation"
          className="fixed left-0 top-0 z-[42] h-[100dvh] w-screen overflow-hidden bg-slate-950 shadow-[0_0_80px_rgba(0,0,0,0.45)]"
          style={{ transformOrigin: '50% 50%' }}
          initial={
            useIris
              ? {
                  ...irisMotionFromRect(irisFrom!),
                  borderRadius: 14,
                  opacity: 1,
                  scale: 1,
                }
              : feltEntranceIdle
                ? false
                : { ...fullscreenAnimate, opacity: 0, scale: 0.97 }
          }
          animate={fullscreenAnimate}
          exit={{ opacity: 0, transition: { duration: 0.22, ease: 'easeOut' } }}
          transition={{
            duration: useIris ? 0.58 : 0.42,
            ease: [0.22, 1, 0.36, 1],
          }}
          onAnimationComplete={() => {
            setIrisFrom(null)
            setFeltEntranceIdle(true)
          }}
        >
          <div className="relative z-[1] min-h-screen w-full">
            <DisplayTableLive />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
