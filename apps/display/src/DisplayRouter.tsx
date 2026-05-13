import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DisplayLayoutPayload, DisplayVenueWallSnapshot } from '@qhe/net'
import {
  connect,
  onDisplayLayout,
  onDisplayVenueSnapshot,
  subscribeDisplayLayoutLocal,
} from '@qhe/net'
import DisplayTableLive from './App.tsx'
import { readUrlLayoutBootstrap } from './displayUrlParams'
import AudienceWelcomeWall from './AudienceWelcomeWall.tsx'
import VenueEightTablesPreview from './VenueEightTablesPreview.tsx'
import { useVenueWallFeaturedWatch } from './useVenueWallFeaturedWatch.ts'

function normalizeVenueWallTiles(
  tiles: DisplayVenueWallSnapshot['tiles'] | undefined
): DisplayVenueWallSnapshot['tiles'] | null {
  if (tiles === undefined) return null
  if (!Array.isArray(tiles)) return null
  if (tiles.length === 0) return []
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
  return [...byNum.keys()].sort((a, b) => a - b).map((n) => byNum.get(n)!)
}

function venueOverviewFocusOff(l: DisplayLayoutPayload) {
  return l.layout === 'venueWall' && l.focusTable == null
}

type DisplayRouterProps = {
  venueCode: string
  /** Pairing already joined DISPLAY:{venue} on this tab's socket — first connect skips teardown */
  pairingBootstrap?: boolean
}

/**
 * Host-driven `displayLayout` plus venue snapshot. Venue wall stays on **`VenueEightTablesPreview`**;
 * live **`GameState`** for the featured table renders **inside** the hero (embedded **`DisplayTableLive`**).
 */
export default function DisplayRouter({ venueCode, pairingBootstrap = false }: DisplayRouterProps) {
  const [layout, setLayout] = useState<DisplayLayoutPayload>(() => {
    if (pairingBootstrap) {
      return { layout: 'venueWall', focusTable: null }
    }
    return typeof window !== 'undefined'
      ? readUrlLayoutBootstrap()
      : ({ layout: 'venueWall', focusTable: null } satisfies DisplayLayoutPayload)
  })

  const layoutRef = useRef(layout)
  layoutRef.current = layout

  const [venueWall, setVenueWall] = useState<DisplayVenueWallSnapshot | null>(null)
  const [mosaicForcedByHost, setMosaicForcedByHost] = useState(false)
  const venueMosaicWasShownRef = useRef(false)
  const prevAudienceWelcomeRef = useRef<boolean | undefined>(undefined)

  const onVenueWallLayout = layout.layout === 'venueWall'
  /** Hide join hero once any numbered table has left lobby (tiles stay in sync via venue snapshot). */
  const mosaicShowsLiveFelts =
    venueWall?.tiles?.some((t) => t.phase !== 'lobby') ?? false
  const audienceBriefing =
    onVenueWallLayout &&
    venueWall != null &&
    venueWall.showAudienceWelcome !== false &&
    !mosaicForcedByHost &&
    !mosaicShowsLiveFelts

  const featuredWatch = useVenueWallFeaturedWatch(venueWall, layout)

  const watchedLiveTableId = (): string => {
    if (layout.layout === 'singleTable') return layout.tableId
    const ft = featuredWatch.featuredTableNum
    return ft != null ? String(ft) : '1'
  }

  const connectFingerprint =
    layout.layout === 'venueWall'
      ? `${venueCode}:wall:w${featuredWatch.featuredTableNum ?? 'none'}`
      : `${venueCode}:tbl:${watchedLiveTableId()}`

  useEffect(() => {
    const sl = layout

    function handleDisplayLayout(next: DisplayLayoutPayload) {
      layoutRef.current = next
      setLayout(next)
    }

    function handleLocalLayoutRelay(next: DisplayLayoutPayload) {
      handleDisplayLayout(next)
      if (venueOverviewFocusOff(next)) setMosaicForcedByHost(true)
    }

    let disconnectSock: () => void
    if (sl.layout === 'venueWall') {
      const w = featuredWatch.featuredTableNum
      if (w != null) {
        disconnectSock = connect('display', 'DISPLAY01', venueCode, String(w), {
          displayVenueWall: true,
          displayFocusTable: w,
        })
      } else {
        disconnectSock = connect('display', 'DISPLAY01', venueCode, '1', {
          displayVenueWall: true,
          displayFocusTable: null,
        })
      }
    } else {
      disconnectSock = connect('display', 'DISPLAY01', venueCode, watchedLiveTableId())
    }

    const offDisplay = onDisplayLayout(handleDisplayLayout)
    const offLocal = subscribeDisplayLayoutLocal(handleLocalLayoutRelay)

    return () => {
      offDisplay()
      offLocal()
      disconnectSock()
    }
  }, [connectFingerprint, venueCode, layout.layout, featuredWatch.featuredTableNum])

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

  useEffect(() => {
    if (onVenueWallLayout && !audienceBriefing && venueWall != null) {
      venueMosaicWasShownRef.current = true
    }
  }, [onVenueWallLayout, audienceBriefing, venueWall])

  const showBriefingHero = audienceBriefing
  const showVenueMosaicShell = onVenueWallLayout && !audienceBriefing

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
      {showVenueMosaicShell && (
        <motion.div
          key="venue-wall-shell"
          className="relative z-10 min-h-screen w-full bg-slate-950"
          role="presentation"
          initial={venueMosaicWasShownRef.current ? false : { opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: venueMosaicWasShownRef.current ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          <VenueEightTablesPreview
            wall={venueWall}
            skipMountIntro={venueMosaicWasShownRef.current}
            featuredWatch={featuredWatch}
          />
        </motion.div>
      )}
      {layout.layout === 'singleTable' && (
        <motion.div
          key={`single-${layout.tableId}`}
          className="relative z-10 min-h-screen w-full bg-slate-950"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="mx-auto flex min-h-[100dvh] max-w-[min(112rem,100%)] flex-col justify-center px-4 py-6">
            <div className="flex h-[min(88dvh,900px)] min-h-0 w-full max-w-6xl flex-col">
              <DisplayTableLive feltTableHint={layout.tableId} variant="embedded" hideQuestionBanner={false} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
