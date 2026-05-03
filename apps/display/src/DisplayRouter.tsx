import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DisplayLayoutPayload } from '@qhe/net'
import { connect, onDisplayLayout } from '@qhe/net'
import DisplayTableLive from './App.tsx'
import VenueEightTablesPreview from './VenueEightTablesPreview.tsx'

/** Tile rect in viewport used to “iris” open the full felt from the grid. */
type IrisRect = { top: number; left: number; width: number; height: number }

type ShrinkingExit = { tableNum: number; rect: IrisRect }

const IRIS_SEC = 0.58

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
  const tableParam = s.get('table')?.trim() || '1'
  const n = Number(tableParam)
  if (Number.isInteger(n) && n >= 1 && n <= 8) {
    return { layout: 'venueWall', focusTable: n }
  }
  return { layout: 'singleTable', tableId: tableParam }
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

/** Fullscreen live felt — venue spotlight table or legacy single-table URL. */
function showFullscreenLiveFelt(l: DisplayLayoutPayload): boolean {
  return venueSpotlightTable(l) != null || l.layout === 'singleTable'
}

function measureSpotlightTile(tableNum: number): IrisRect | null {
  if (typeof document === 'undefined') return null
  const el = document.querySelector(`[data-spotlight-tile="${tableNum}"]`)
  if (!(el instanceof HTMLElement)) return null
  const r = el.getBoundingClientRect()
  if (r.width < 8 || r.height < 8) return null
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

function refreshTileRectsCache(ref: { current: Partial<Record<number, IrisRect>> }) {
  for (let n = 1; n <= 8; n++) {
    const r = measureSpotlightTile(n)
    if (r) ref.current[n] = r
  }
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

/** Layout subset used only for `@qhe/net` connect(...) hello + fingerprint. Spotlight during exit shrink stays on the prior table socket. */
function layoutForSocketConnect(
  venueLayout: DisplayLayoutPayload,
  shrinkingExit: ShrinkingExit | null
): DisplayLayoutPayload {
  if (shrinkingExit) {
    return { layout: 'venueWall', focusTable: shrinkingExit.tableNum }
  }
  return venueLayout
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
      : ({ layout: 'venueWall', focusTable: 1 } satisfies DisplayLayoutPayload)
  )

  const layoutRef = useRef(layout)
  layoutRef.current = layout

  /** Measured Spotlight tile rects whenever the overview grid last painted — used when shrinking before the DOM has tiles. */
  const lastTileRects = useRef<Partial<Record<number, IrisRect>>>({})

  /** When set before entering felt from the grid, the shell animates tile → fullscreen. */
  const [irisFrom, setIrisFrom] = useState<IrisRect | null>(null)
  /** After any felt entrance animation, skip flashy re-enters (e.g. after iris clears). */
  const [feltEntranceIdle, setFeltEntranceIdle] = useState(false)
  /** Fullscreen feels shrinks onto this tile until complete; sockets stay spotlight until cleared. */
  const [shrinkingExit, setShrinkingExit] = useState<ShrinkingExit | null>(null)

  const wallOverview = venueOverview(layout)
  const spotlightN = venueSpotlightTable(layout)
  const fullscreenLive = showFullscreenLiveFelt(layout)

  const socketLayout = layoutForSocketConnect(layout, shrinkingExit)

  const watchedLiveTableId = (): string => {
    if (socketLayout.layout === 'singleTable') return socketLayout.tableId
    const spot = venueSpotlightTable(socketLayout)
    return spot != null ? String(spot) : '1'
  }

  const overviewForSockets = venueOverview(socketLayout)

  const connectFingerprint =
    overviewForSockets && socketLayout.layout === 'venueWall'
      ? `${venueCode}:wall`
      : `${venueCode}:tbl:${watchedLiveTableId()}`

  useEffect(() => {
    const win = typeof window !== 'undefined' ? window : null
    if (!win) return
    const onResize = () => {
      lastTileRects.current = {}
      if (venueOverview(layoutRef.current)) {
        refreshTileRectsCache(lastTileRects)
      }
    }
    win.addEventListener('resize', onResize)
    return () => win.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (wallOverview && shrinkingExit === null) setFeltEntranceIdle(false)
  }, [wallOverview, shrinkingExit])

  useLayoutEffect(() => {
    if (wallOverview && shrinkingExit === null) {
      refreshTileRectsCache(lastTileRects)
    }
  }, [wallOverview, shrinkingExit])

  useEffect(() => {
    let disconnectSock: () => void
    const sl = socketLayout

    if (venueOverview(sl)) {
      disconnectSock = connect('display', 'DISPLAY01', venueCode, '1', {
        displayVenueWall: true,
        displayFocusTable: null,
      })
    } else if (sl.layout === 'venueWall' && sl.focusTable != null) {
      const ft = sl.focusTable
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
      let nextShrinkingExit: ShrinkingExit | null = null

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

      const prevSpot = venueSpotlightTable(prev)

      if (!reduceMotion && prevSpot != null && venueOverview(next)) {
        const rect = lastTileRects.current[prevSpot] ?? measureSpotlightTile(prevSpot)
        if (rect) {
          nextShrinkingExit = { tableNum: prevSpot, rect }
        }
      }

      setIrisFrom(iris)
      layoutRef.current = next
      setLayout(next)

      setShrinkingExit(nextShrinkingExit)
    })

    return () => {
      offDisplay()
      disconnectSock()
    }
  }, [connectFingerprint, venueCode])

  /** Show the 8-panel grid under fullscreen felt exits and while overview. */
  const showGridBehind = wallOverview || shrinkingExit !== null

  const spotTable = spotlightN

  const feltMotionKey =
    spotlightN != null
      ? `felt-spot-${spotTable}`
      : layout.layout === 'singleTable'
        ? `felt-${layout.tableId}`
        : 'felt-none'

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

  const useIrisExpand = irisFrom != null && shrinkingExit === null

  /* Main fullscreen live route (not shrinking overlay duplicate). */
  const showPrimaryFullscreenLayer = fullscreenLive && shrinkingExit === null

  const closingToTileAnimate =
    shrinkingExit != null ? { ...irisMotionFromRect(shrinkingExit.rect), borderRadius: 14 } : fullscreenAnimate

  return (
    <AnimatePresence mode="sync">
      {showGridBehind && (
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
      )}
      {showPrimaryFullscreenLayer && (
        <motion.div
          key={feltMotionKey}
          role="presentation"
          className="fixed left-0 top-0 z-[42] h-[100dvh] w-screen overflow-hidden bg-slate-950 shadow-[0_0_80px_rgba(0,0,0,0.45)]"
          style={{ transformOrigin: '50% 50%' }}
          initial={
            useIrisExpand
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
          transition={{
            duration: useIrisExpand ? IRIS_SEC : 0.42,
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
      {shrinkingExit && (
        <motion.div
          key={`shrinking-from-${shrinkingExit.tableNum}`}
          role="presentation"
          className="fixed left-0 top-0 z-[50] h-[100dvh] w-screen overflow-hidden bg-slate-950 shadow-[0_0_80px_rgba(0,0,0,0.45)]"
          style={{ transformOrigin: '50% 50%' }}
          initial={fullscreenAnimate}
          animate={closingToTileAnimate}
          transition={{ duration: IRIS_SEC, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={() => setShrinkingExit(null)}
        >
          <div className="relative z-[1] min-h-screen w-full">
            <DisplayTableLive />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
