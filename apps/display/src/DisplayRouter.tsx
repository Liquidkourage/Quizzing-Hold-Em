import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DisplayLayoutPayload, DisplayVenueWallSnapshot } from '@qhe/net'
import {
  connect,
  onDisplayLayout,
  onDisplayVenueSnapshot,
  subscribeDisplayLayoutLocal,
} from '@qhe/net'
import DisplayTableLive from './App.tsx'
import { readDisplayTableIdFromUrl, readUrlLayoutBootstrap } from './displayUrlParams'
import AudienceWelcomeWall from './AudienceWelcomeWall.tsx'
import VenueEightTablesPreview from './VenueEightTablesPreview.tsx'

function normalizeVenueWallTiles(
  tiles: DisplayVenueWallSnapshot['tiles'] | undefined
): DisplayVenueWallSnapshot['tiles'] | null {
  if (!Array.isArray(tiles) || tiles.length === 0) return null
  const byNum = new Map<number, DisplayVenueWallSnapshot['tiles'][number]>()
  for (const t of tiles) {
    if (
      t != null &&
      typeof t.tableNum === 'number' &&
      Number.isInteger(t.tableNum) &&
      t.tableNum >= 1 &&
      t.tableNum <= 8
    ) {
      byNum.set(t.tableNum, t)
    }
  }
  const out: DisplayVenueWallSnapshot['tiles'] = []
  for (let n = 1; n <= 8; n++) {
    out.push(
      byNum.get(n) ?? {
        tableNum: n,
        seated: 0,
        pot: 0,
        phase: 'lobby',
      }
    )
  }
  return out
}

/** Tile rect in viewport used to “iris” open the full felt from the grid. */
type IrisRect = { top: number; left: number; width: number; height: number }

type ShrinkingExit = { tableNum: number; rect: IrisRect }

const IRIS_SEC = 0.58

function venueOverview(l: DisplayLayoutPayload) {
  return l.layout === 'venueWall' && l.focusTable == null
}

function venueSpotlightTable(l: DisplayLayoutPayload): number | null {
  if (l.layout === 'venueWall' && l.focusTable != null && Number.isFinite(l.focusTable)) {
    return l.focusTable
  }
  return null
}

function feltTableIdForFullscreen(l: DisplayLayoutPayload): string {
  const spot = venueSpotlightTable(l)
  if (spot != null) return String(spot)
  if (l.layout === 'singleTable') return l.tableId
  return readDisplayTableIdFromUrl()
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

type DisplayRouterProps = {
  venueCode: string
  /** Pairing already joined DISPLAY:{venue} on this tab's socket — first connect skips teardown */
  pairingBootstrap?: boolean
}

/**
 * Host-driven layout from the Venue tab.
 * Venue wall (no spotlight): grid preview only — no felt `state`.
 * Spotlight or single-table: full `DisplayTableLive` subscribed to one felt session.
 */
export default function DisplayRouter({ venueCode, pairingBootstrap = false }: DisplayRouterProps) {
  const pairingWarmBootstrapConsumedRef = useRef(false)

  const [layout, setLayout] = useState<DisplayLayoutPayload>(() => {
    if (pairingBootstrap) {
      return { layout: 'venueWall', focusTable: null }
    }
    return typeof window !== 'undefined'
      ? readUrlLayoutBootstrap()
      : ({ layout: 'venueWall', focusTable: 1 } satisfies DisplayLayoutPayload)
  })

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
  /** Venue wall mosaic + headline from server */
  const [venueWall, setVenueWall] = useState<DisplayVenueWallSnapshot | null>(null)
  /** Host clicked “All 8 felts” (local relay) — show mosaic even if snapshot still has showAudienceWelcome. */
  const [mosaicForcedByHost, setMosaicForcedByHost] = useState(false)
  /** After first time the 8-panel grid mounts, suppress re-entry fades (mosaic remounts when felt goes fullscreen). */
  const venueMosaicWasShownRef = useRef(false)
  /** Tracks showAudienceWelcome across venueWall snapshot updates */
  const prevAudienceWelcomeRef = useRef<boolean | undefined>(undefined)

  const wallOverview = venueOverview(layout)
  /** Lobby / join briefing — only after we have wall payload; avoids hiding the mosaic forever when snapshot never applies. */
  const audienceBriefing =
    wallOverview &&
    venueWall != null &&
    venueWall.showAudienceWelcome !== false &&
    !mosaicForcedByHost
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
    const sl = socketLayout

    function handleDisplayLayout(next: DisplayLayoutPayload) {
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
    }

    /** Local relay only — same layout as before still means host chose mosaic over welcome */
    function handleLocalLayoutRelay(next: DisplayLayoutPayload) {
      handleDisplayLayout(next)
      if (venueOverview(next)) setMosaicForcedByHost(true)
    }

    const wallFingerprint = `${venueCode}:wall`
    const skipHeavyConnect =
      pairingBootstrap &&
      !pairingWarmBootstrapConsumedRef.current &&
      connectFingerprint === wallFingerprint

    if (skipHeavyConnect) {
      pairingWarmBootstrapConsumedRef.current = true
      const offDisplay = onDisplayLayout(handleDisplayLayout)
      const offLocal = subscribeDisplayLayoutLocal(handleLocalLayoutRelay)
      return () => {
        offDisplay()
        offLocal()
        pairingWarmBootstrapConsumedRef.current = false
      }
    }

    pairingWarmBootstrapConsumedRef.current = true

    let disconnectSock: () => void
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

    // Must subscribe AFTER connect(): onDisplayLayout is a noop when socket was null,
    // and connect() replaces the socket (pairing teardown), so attaching before loses broadcast updates.
    const offDisplay = onDisplayLayout(handleDisplayLayout)
    const offLocal = subscribeDisplayLayoutLocal(handleLocalLayoutRelay)

    return () => {
      offDisplay()
      offLocal()
      disconnectSock()
    }
  }, [connectFingerprint, venueCode, pairingBootstrap])

  useEffect(() => {
    if (!venueWall) {
      prevAudienceWelcomeRef.current = undefined
      return
    }
    const show = venueWall.showAudienceWelcome !== false
    const prev = prevAudienceWelcomeRef.current
    if (prev === false && show === true) {
      setMosaicForcedByHost(false)
    }
    prevAudienceWelcomeRef.current = show
  }, [venueWall])

  useEffect(() => {
    const unsub = onDisplayVenueSnapshot((payload) => {
      const tiles = normalizeVenueWallTiles(payload?.tiles)
      if (tiles == null) return
      const p = payload as Partial<DisplayVenueWallSnapshot>
      const next: DisplayVenueWallSnapshot = {
        tiles,
        headlineQuestionText: p.headlineQuestionText ?? null,
        answerDeadlineMs: p.answerDeadlineMs ?? null,
        lobbyPlayerCount:
          typeof p.lobbyPlayerCount === 'number' ? p.lobbyPlayerCount : 0,
        totalSeatedAtTables:
          typeof p.totalSeatedAtTables === 'number' ? p.totalSeatedAtTables : 0,
        /** Older servers never sent this — keep briefing until reconnect to a newer build. */
        showAudienceWelcome: p.showAudienceWelcome !== false,
      }
      setVenueWall(next)
    })
    return () => unsub()
  }, [connectFingerprint])

  /** After mosaic has shown with real snapshot (not transient pre-snapshot glow), suppress re-entry fades. */
  useEffect(() => {
    if (wallOverview && !audienceBriefing && venueWall != null) {
      venueMosaicWasShownRef.current = true
    }
  }, [wallOverview, audienceBriefing, venueWall])

  /** Full join hero (`AudienceWelcomeWall`). Requires venue snapshot + server `showAudienceWelcome` — see server `venueAudienceWelcomeExpired`. Hidden after host **Start Game** until **New Game** clears the venue. Also suppressed while `mosaicForcedByHost` is true (e.g. same-browser host layout relay via `BroadcastChannel`). Otherwise viewers see **`VenueEightTablesPreview`** with different chrome — UI tweaks must touch both components if both should match. */
  const showBriefingHero = wallOverview && audienceBriefing && shrinkingExit === null
  /** Numbered-table mosaic visible after briefing ends — or peeking beneath spotlight exit iris. */
  const showVenueMosaic = (!audienceBriefing && wallOverview) || shrinkingExit !== null

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
      {showBriefingHero && (
        <motion.div
          key="venue-join-hero"
          className="relative z-10 min-h-screen w-full"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <AudienceWelcomeWall venueCode={venueCode} wall={venueWall} />
        </motion.div>
      )}
      {showVenueMosaic && (
        <motion.div
          key="venue-wall-grid"
          className="relative z-10 min-h-screen w-full bg-slate-950"
          role="presentation"
          initial={venueMosaicWasShownRef.current ? false : { opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: venueMosaicWasShownRef.current ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <VenueEightTablesPreview wall={venueWall} skipMountIntro={venueMosaicWasShownRef.current} />
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
            <DisplayTableLive feltTableHint={feltTableIdForFullscreen(layout)} />
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
            <DisplayTableLive feltTableHint={String(shrinkingExit.tableNum)} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
