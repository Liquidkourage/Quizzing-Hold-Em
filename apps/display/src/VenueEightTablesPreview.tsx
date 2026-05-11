import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import {
  DISPLAY_PREVIEW_BANKROLLS,
  DISPLAY_PREVIEW_SYNCED_PHASE,
  DISPLAY_PREVIEW_TABLES,
  rehearsalSeatDisplayName,
} from '@qhe/core'
import type { DisplayVenueTileSnapshot, DisplayVenueWallSnapshot } from '@qhe/net'

const VENUE_SEAT_SLOTS = 8

/** Pre-start seating tour: one table hero + thumbnails; seconds per table. */
const SEATING_SPOTLIGHT_CYCLE_SEC = 10

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

function formatVenueBankroll(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0
  return `$${Math.max(0, n).toLocaleString()}`
}

function padSeatNames(raw: string[] | undefined): string[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    if (raw != null && raw[i] != null) {
      const t = String(raw[i]).trim()
      return t
    }
    return ''
  })
}

function padSeatBankrolls(raw: number[] | undefined): number[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    const v = raw?.[i]
    return typeof v === 'number' && Number.isFinite(v) ? v : 0
  })
}

/**
 * Eight seat positions around the mini felt; optional name chips just outside each chair.
 */
function SeatRingWithLabels({
  seatedCount,
  seatNames,
  seatBankrolls,
  size = 'md',
}: {
  seatedCount: number
  seatNames: string[]
  seatBankrolls: number[]
  size?: 'md' | 'lg'
}) {
  const wrap =
    size === 'lg'
      ? 'max-w-[min(440px,92vw)]'
      : 'w-full max-w-[min(100%,21rem)] sm:max-w-[min(100%,22rem)]'
  const dot = size === 'lg' ? 'h-9 w-9' : 'h-8 w-8'
  const labelClass =
    size === 'lg'
      ? 'max-w-[min(9rem,28vw)] text-xl sm:text-2xl'
      : 'max-w-[min(8.5rem,50%)] text-base sm:text-lg md:text-xl lg:text-2xl'

  return (
    <div className={`relative mx-auto aspect-[10/8] w-full ${wrap}`}>
      <div
        className="absolute inset-[12%_8%_16%_8%] rounded-[50%] border-2 border-amber-700/70 shadow-inner"
        style={{
          background: `
            repeating-linear-gradient(
              45deg,
              #245c36 0px,
              #245c36 2px,
              #1b4528 2px,
              #1b4528 4px
            ),
            linear-gradient(135deg, #2d7a4a, #1e502e)
          `,
        }}
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * 2 * Math.PI - Math.PI / 2
        const xr = 48 * Math.cos(a)
        const yr = 38 * Math.sin(a)
        const lx = 54 * Math.cos(a)
        const ly = 42 * Math.sin(a)
        const filled = i < seatedCount
        const raw = seatNames[i]?.trim() ?? ''
        const chips = seatBankrolls[i] ?? 0
        return (
          <div key={i}>
            <div
              className={`absolute ${dot} -translate-x-1/2 -translate-y-1/2 rounded-full border shadow ${
                filled
                  ? 'border-emerald-300/70 bg-black/85'
                  : 'border-white/20 bg-black/35'
              }`}
              style={{ left: `calc(50% + ${xr}%)`, top: `calc(50% + ${yr}%)` }}
            />
            {raw ? (
              <div
                className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-center font-semibold leading-tight text-white/92 shadow-black/80 drop-shadow ${labelClass}`}
                style={{ left: `calc(50% + ${lx}%)`, top: `calc(50% + ${ly}%)` }}
              >
                <span className="block max-w-full truncate">{raw}</span>
                <span className="mt-0.5 block max-w-full truncate font-mono tabular-nums text-casino-emerald text-xs sm:text-sm md:text-base lg:text-lg">
                  {formatVenueBankroll(chips)}
                </span>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function phaseLabel(ph: string) {
  if (ph === 'lobby') return 'Lobby'
  if (ph === 'question') return 'Question setup'
  if (ph === 'betting') return 'Wagering'
  if (ph === 'answering') return 'Answering'
  if (ph === 'reveal') return 'Reveal'
  if (ph === 'showdown') return 'Showdown'
  if (ph === 'payout') return 'Payout'
  if (ph === 'intermission') return 'Break'
  return ph
}

function phaseAccent(ph: string) {
  if (ph === 'answering') return 'text-amber-200 ring-1 ring-amber-400/50'
  if (ph === 'showdown') return 'text-yellow-300 ring-1 ring-yellow-400/35'
  if (ph === 'question') return 'text-emerald-200/95'
  return 'text-white/85'
}

type VenueMosaicTileMode = 'grid' | 'hero' | 'thumb' | 'crawl'

function VenueMosaicTableCard({
  row,
  mode,
  idx,
  skipMountIntro,
  isSpotlightThumb,
}: {
  row: DisplayVenueTileSnapshot
  mode: VenueMosaicTileMode
  idx: number
  skipMountIntro?: boolean
  isSpotlightThumb?: boolean
}) {
  const tn = row.tableNum
  const seats = row.seated
  const pot = row.pot
  const ph = row.phase
  const seatNames = padSeatNames(row.seatNames)
  const seatBankrolls = padSeatBankrolls(row.seatBankrolls)

  if (mode === 'crawl') {
    const spotlight = isSpotlightThumb === true
    const rowShell = spotlight
      ? 'border-amber-400/70 bg-black/55 ring-2 ring-amber-400/45 shadow-[0_0_16px_rgba(251,191,36,0.1)]'
      : 'border-white/[0.12] bg-black/35'

    return (
      <div
        data-spotlight-tile={tn}
        role="group"
        aria-current={spotlight ? 'true' : undefined}
        className={`flex w-full min-w-0 items-center gap-2 rounded-lg border p-2.5 backdrop-blur-md ${rowShell}`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-black tabular-nums ${
            spotlight ? 'bg-amber-500/35 text-lg text-amber-50' : 'bg-white/[0.07] text-base text-yellow-400'
          }`}
        >
          {tn}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="text-sm font-bold leading-tight text-white/95">T{tn}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none ${phaseAccent(ph)}`}
            >
              {phaseLabel(ph)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-white/60">
            <span className="font-mono tabular-nums text-casino-emerald">{seats}/8</span>
            <span className="mx-1 text-white/35">·</span>
            <span className="font-mono tabular-nums text-yellow-200/90">${pot.toLocaleString()}</span>
          </p>
        </div>
      </div>
    )
  }

  if (mode === 'thumb') {
    const spotlight = isSpotlightThumb === true
    const rowShell = spotlight
      ? 'border-amber-400/70 bg-black/55 ring-2 ring-amber-400/45 shadow-[0_0_24px_rgba(251,191,36,0.12)]'
      : 'border-white/[0.12] bg-black/35 hover:border-white/25'

    return (
      <motion.div
        data-spotlight-tile={tn}
        role="group"
        aria-current={spotlight ? 'true' : undefined}
        initial={skipMountIntro ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: skipMountIntro ? 0 : idx * 0.03, duration: 0.25 }}
        className={`flex min-w-0 shrink-0 items-center gap-3 rounded-xl border p-3.5 backdrop-blur-md sm:gap-4 sm:p-4 lg:w-full ${rowShell} ${
          spotlight
            ? 'min-w-[17rem] w-[min(17rem,92vw)] sm:min-w-[18rem] sm:w-[18rem]'
            : 'min-w-[16.5rem] w-[min(17rem,92vw)] sm:min-w-[17.5rem] sm:w-[17.5rem]'
        }`}
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black tabular-nums sm:h-12 sm:w-12 ${
            spotlight ? 'bg-amber-500/30 text-2xl text-amber-50 sm:text-3xl' : 'bg-white/[0.07] text-xl text-yellow-400 sm:text-2xl'
          }`}
        >
          {tn}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-lg font-bold tracking-tight text-white/95 sm:text-xl">Table {tn}</span>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase leading-none sm:text-xs ${phaseAccent(ph)}`}
            >
              {phaseLabel(ph)}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-snug text-white/65 sm:text-base">
            <span className="font-mono font-semibold tabular-nums text-casino-emerald">{seats} / 8</span>
            <span className="mx-1.5 text-white/35 sm:mx-2">·</span>
            <span className="text-white/50">Pot</span>{' '}
            <span className="font-mono tabular-nums font-semibold text-yellow-200/95">
              ${pot.toLocaleString()}
            </span>
          </p>
        </div>
      </motion.div>
    )
  }

  if (mode === 'hero') {
    return (
      <motion.article
        data-spotlight-tile={tn}
        role="region"
        aria-label={`Table ${tn}, seating`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col rounded-2xl border-2 border-amber-500/45 bg-black/60 p-5 shadow-2xl backdrop-blur-md ring-2 ring-amber-400/20 sm:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold uppercase tracking-[0.12em] text-white/60 sm:text-xl">
              Table
            </div>
            <div className="text-7xl font-black tabular-nums leading-none text-yellow-400 sm:text-8xl lg:text-9xl">
              {tn}
            </div>
          </div>
          <span
            className={`max-w-[min(12rem,45%)] shrink-0 truncate rounded-xl px-3 py-2 text-base font-bold uppercase leading-tight sm:px-4 sm:py-2.5 sm:text-lg md:text-xl ${phaseAccent(ph)}`}
          >
            {phaseLabel(ph)}
          </span>
        </div>

        <div className="mt-4 flex-shrink-0">
          <SeatRingWithLabels
            seatedCount={seats}
            seatNames={seatNames}
            seatBankrolls={seatBankrolls}
            size="lg"
          />
        </div>

        <dl className="mt-5 space-y-2 border-t border-white/10 pt-5 text-xl leading-snug sm:text-2xl md:text-3xl lg:text-4xl">
          <div className="flex justify-between gap-3">
            <dt className="font-semibold text-white/70">Occupied seats</dt>
            <dd className="font-mono font-bold tabular-nums text-casino-emerald">
              {seats} / 8
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-semibold text-white/70">Pot (local)</dt>
            <dd className="font-mono font-bold tabular-nums text-yellow-300">${pot.toLocaleString()}</dd>
          </div>
        </dl>
      </motion.article>
    )
  }

  return (
    <motion.article
      data-spotlight-tile={tn}
      initial={skipMountIntro ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: skipMountIntro ? 0 : idx * 0.045,
        duration: skipMountIntro ? 0 : 0.35,
      }}
      className="flex flex-col rounded-xl border-2 border-yellow-700/35 bg-black/55 p-4 shadow-lg backdrop-blur-md sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-semibold uppercase tracking-[0.12em] text-white/60 sm:text-lg md:text-xl">
            Table
          </div>
          <div className="text-6xl font-black tabular-nums leading-none text-yellow-400 sm:text-7xl lg:text-8xl">
            {tn}
          </div>
        </div>
        <span
          className={`max-w-[min(10rem,48%)] shrink-0 truncate rounded-lg px-2.5 py-1.5 text-sm font-bold uppercase leading-tight sm:max-w-none sm:px-3.5 sm:py-2 sm:text-base md:text-lg ${phaseAccent(ph)}`}
        >
          {phaseLabel(ph)}
        </span>
      </div>

      <div className="mt-3 flex-shrink-0">
        <SeatRingWithLabels
          seatedCount={seats}
          seatNames={seatNames}
          seatBankrolls={seatBankrolls}
        />
      </div>

      <dl className="mt-4 space-y-2 border-t border-white/10 pt-4 text-lg leading-snug sm:text-xl md:text-2xl lg:text-3xl">
        <div className="flex justify-between gap-3">
          <dt className="font-semibold text-white/70">Occupied seats</dt>
          <dd className="font-mono font-bold tabular-nums text-casino-emerald">
            {seats} / 8
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-semibold text-white/70">Pot (local)</dt>
          <dd className="font-mono font-bold tabular-nums text-yellow-300">${pot.toLocaleString()}</dd>
        </div>
      </dl>
    </motion.article>
  )
}

/** Latin-first sort key: leading word of the display name (first name). */
function firstNameSortKey(displayName: string): string {
  const t = displayName.trim()
  if (!t) return ''
  const w = t.split(/\s+/)[0]
  return w ?? t
}

function rosterRowsFromTiles(
  tiles: DisplayVenueTileSnapshot[]
): { name: string; tableNum: number; bankroll: number }[] {
  const out: { name: string; tableNum: number; bankroll: number }[] = []
  for (const t of tiles) {
    const sn = t.seatNames
    const br = padSeatBankrolls(t.seatBankrolls)
    if (sn == null || sn.length === 0) continue
    for (let i = 0; i < sn.length; i++) {
      const raw = sn[i]?.trim()
      if (raw) out.push({ name: raw, tableNum: t.tableNum, bankroll: br[i] ?? 0 })
    }
  }
  out.sort((a, b) => {
    const cmp = firstNameSortKey(a.name).localeCompare(firstNameSortKey(b.name), undefined, {
      sensitivity: 'base',
    })
    if (cmp !== 0) return cmp
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
  return out
}

function VenueScrollingRoster({ tiles }: { tiles: DisplayVenueTileSnapshot[] }) {
  const rows = useMemo(() => rosterRowsFromTiles(tiles), [tiles])
  if (rows.length === 0) return null

  const durationSec = Math.max(28, Math.min(120, rows.length * 2.2))
  const doubled = [...rows, ...rows]

  return (
    <aside
      className="fixed inset-y-0 right-0 z-20 flex w-52 flex-col border-l border-yellow-600/50 bg-slate-950/94 shadow-[-8px_0_28px_rgba(0,0,0,0.4)] backdrop-blur-md sm:w-56 lg:w-[15rem]"
      aria-label="Players and table assignments"
    >
      <div className="shrink-0 border-b border-white/10 px-2.5 py-3 sm:px-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55 sm:text-xs">
          Players
        </h2>
        <p className="mt-0.5 text-xl font-bold leading-none text-white/92 sm:text-2xl">Seating</p>
      </div>
      <div
        className="relative min-h-0 flex-1 overflow-hidden px-1.5 py-1 sm:px-2"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        <div
          className="venue-roster-animate flex flex-col gap-0"
          style={{ ['--venue-roster-secs' as string]: `${durationSec}s` }}
        >
          {doubled.map((r, idx) => (
            <div
              key={`${r.tableNum}-${r.name}-${idx}`}
              className="w-full min-w-0 border-b border-white/[0.07] py-2 sm:py-2.5"
              aria-label={`${r.name}, ${formatVenueBankroll(r.bankroll)}, Table ${r.tableNum}`}
            >
              <div className="w-full min-w-0 truncate text-lg font-bold leading-[1.15] text-white/95 sm:text-xl md:text-2xl">
                {r.name}
              </div>
              <div className="mt-0.5 flex w-full min-w-0 items-baseline justify-between gap-1.5">
                <span className="min-w-0 flex-1 truncate font-mono text-xs font-bold tabular-nums tracking-tight text-yellow-400/92 sm:text-sm">
                  Table {r.tableNum}
                </span>
                <span className="shrink-0 text-right font-mono text-base font-bold tabular-nums leading-none text-casino-emerald sm:text-lg">
                  {formatVenueBankroll(r.bankroll)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

/** Fixed left strip — same width/height treatment as {@link VenueScrollingRoster}. */
function VenueAllTablesCrawl({
  tiles,
  spotlightTableNum,
  prefersReducedMotion,
}: {
  tiles: DisplayVenueTileSnapshot[]
  spotlightTableNum: number
  prefersReducedMotion: boolean
}) {
  const durationSec = Math.max(24, Math.min(100, Math.max(1, tiles.length) * 6))
  const doubled = useMemo(() => [...tiles, ...tiles], [tiles])

  return (
    <aside
      className="fixed inset-y-0 left-0 z-20 flex w-52 flex-col border-r border-yellow-600/50 bg-slate-950/94 shadow-[8px_0_28px_rgba(0,0,0,0.4)] backdrop-blur-md sm:w-56 lg:w-[15rem]"
      aria-label="All tables crawl"
    >
      <div className="shrink-0 border-b border-white/10 px-2.5 py-3 sm:px-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55 sm:text-xs">Tables</h2>
        <p className="mt-0.5 text-xl font-bold leading-none text-white/92 sm:text-2xl">All tables</p>
      </div>
      <div
        className="relative min-h-0 flex-1 overflow-hidden px-1.5 py-1 sm:px-2"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        {prefersReducedMotion ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain py-1">
            {tiles.map((row, idx) => (
              <VenueMosaicTableCard
                key={row.tableNum}
                row={row}
                mode="crawl"
                idx={idx}
                skipMountIntro
                isSpotlightThumb={row.tableNum === spotlightTableNum}
              />
            ))}
          </div>
        ) : (
          <div
            className="venue-roster-animate flex flex-col gap-2"
            style={{ ['--venue-roster-secs' as string]: `${durationSec}s` }}
          >
            {doubled.map((row, idx) => (
              <VenueMosaicTableCard
                key={`${row.tableNum}-${idx}`}
                row={row}
                mode="crawl"
                idx={idx}
                skipMountIntro
                isSpotlightThumb={row.tableNum === spotlightTableNum}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

type VenueEightTablesPreviewProps = {
  /** null until first `displayVenueSnapshot` from socket */
  wall: DisplayVenueWallSnapshot | null
  /**
   * Skip Framer entrance on header / headline / tiles (mosaic briefly unmounts when
   * fullscreen felt covers it — replaying fades looks like a glitch).
   */
  skipMountIntro?: boolean
}

/**
 * Mosaic rows mirror each table session on the server; spotlight opens the matching full felt.
 * Headline shows only live question text + countdown from the server snapshot.
 * While **every** felt is still in **lobby** (pre-start), or when showing the **rehearsal** preview
 * without a live wall, the grid becomes a **seating spotlight tour**: one enlarged table on a timer
 * **All tables** is a fixed left crawl (same strip width/height as the players roster) when in this mode.
 */
export default function VenueEightTablesPreview({ wall, skipMountIntro = false }: VenueEightTablesPreviewProps) {
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null)
  const [seatingHeroIdx, setSeatingHeroIdx] = useState(0)
  const [seatingCycleTick, setSeatingCycleTick] = useState(0)
  const prefersReducedMotion = usePrefersReducedMotion()
  const seatingCycleStartRef = useRef(0)

  const headlineQuestionText = wall?.headlineQuestionText ?? null
  const answerDeadlineMs = wall?.answerDeadlineMs ?? null

  useEffect(() => {
    if (answerDeadlineMs == null) {
      setTimerSeconds(null)
      return
    }
    const tick = () =>
      setTimerSeconds(Math.max(0, Math.ceil((answerDeadlineMs - Date.now()) / 1000)))
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [answerDeadlineMs])

  const tileRows: DisplayVenueTileSnapshot[] =
    wall?.tiles != null && wall.tiles.length > 0
      ? [...wall.tiles].sort((a, b) => a.tableNum - b.tableNum)
      : wall?.tiles != null && wall.tiles.length === 0
        ? []
        : DISPLAY_PREVIEW_TABLES.map((snap, i) => {
            const seated = snap.seated
            const base = i * VENUE_SEAT_SLOTS
            const seatNames = Array.from({ length: VENUE_SEAT_SLOTS }, (_, j) =>
              j < seated ? rehearsalSeatDisplayName(base + j) : ''
            )
            const seatBankrolls = Array.from({ length: VENUE_SEAT_SLOTS }, (_, j) =>
              j < seated
                ? DISPLAY_PREVIEW_BANKROLLS[j % DISPLAY_PREVIEW_BANKROLLS.length]!
                : 0
            )
            return {
              tableNum: i + 1,
              seated,
              pot: snap.pot,
              phase: DISPLAY_PREVIEW_SYNCED_PHASE,
              seatNames,
              seatBankrolls,
            }
          })

  const hasLiveWall =
    wall != null && wall.tiles != null && wall.tiles.length > 0
  const showHeadline =
    hasLiveWall && (headlineQuestionText != null || answerDeadlineMs != null)

  const allTablesInLobby =
    tileRows.length > 0 && tileRows.every((t) => t.phase === 'lobby')
  /** Pre-start: all felts still in lobby, or rehearsal preview without a live snapshot. */
  const showSeatingSpotlightCycle =
    tileRows.length > 0 && (hasLiveWall ? allTablesInLobby : true)

  const seatingHeroRow = tileRows[seatingHeroIdx] ?? tileRows[0]

  useEffect(() => {
    setSeatingHeroIdx((i) => Math.min(i, Math.max(0, tileRows.length - 1)))
  }, [tileRows.length])

  useEffect(() => {
    if (!showSeatingSpotlightCycle || prefersReducedMotion || tileRows.length <= 1)
      return undefined
    const id = window.setInterval(() => {
      setSeatingHeroIdx((i) => (i + 1) % tileRows.length)
    }, SEATING_SPOTLIGHT_CYCLE_SEC * 1000)
    return () => window.clearInterval(id)
  }, [showSeatingSpotlightCycle, prefersReducedMotion, tileRows.length])

  useLayoutEffect(() => {
    seatingCycleStartRef.current = Date.now()
  }, [seatingHeroIdx])

  useEffect(() => {
    if (!showSeatingSpotlightCycle || prefersReducedMotion || tileRows.length <= 1)
      return undefined
    const id = window.setInterval(() => setSeatingCycleTick((n) => n + 1), 50)
    return () => window.clearInterval(id)
  }, [showSeatingSpotlightCycle, prefersReducedMotion, tileRows.length, seatingHeroIdx])

  const seatingCycleProgress = useMemo(() => {
    if (prefersReducedMotion || tileRows.length <= 1) return 0
    const elapsed = Date.now() - seatingCycleStartRef.current
    return Math.min(1, elapsed / (SEATING_SPOTLIGHT_CYCLE_SEC * 1000))
  }, [seatingCycleTick, seatingHeroIdx, prefersReducedMotion, tileRows.length])

  const showRoster = rosterRowsFromTiles(tileRows).length > 0

  return (
    <div
      className={`relative min-h-screen overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white ${
        showSeatingSpotlightCycle ? 'pl-52 sm:pl-56 lg:pl-[15rem]' : ''
      } ${showRoster ? 'pr-52 sm:pr-56 lg:pr-[15rem]' : ''}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(139,69,19,0.25) 2px, transparent 2px),
              linear-gradient(45deg, transparent 47%, rgba(160,82,45,0.12) 50%, transparent 53%)
            `,
            backgroundSize: '48px 48px, 64px 64px',
          }}
        />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-transparent px-4 py-2 sm:px-6 sm:py-2.5">
        <motion.div
          className="mx-auto flex w-full max-w-[1600px] justify-center"
          initial={skipMountIntro ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex min-w-0 justify-center">
            <div
              className="max-w-full w-[calc(min(86vw,(min(1600px,100vw)-2rem)*0.92)*0.96)] sm:w-[calc((min(1600px,100vw)-2rem-1.25rem)*0.48)] lg:w-[calc((min(1600px,100vw)-2rem-3.75rem)*0.24)]"
              style={{ aspectRatio: '958 / 592' }}
            >
              <QuizzEmWordmark layout="fill" />
            </div>
          </div>
        </motion.div>
      </header>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 pt-5 sm:px-6 sm:pt-6">
        {showHeadline ? (
          <motion.section
            className="mb-8 rounded-2xl border-2 border-casino-emerald/40 bg-black/65 p-6 shadow-[0_0_40px_rgba(0,255,180,0.08)] backdrop-blur-md sm:p-8"
            initial={skipMountIntro ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:gap-10">
              {headlineQuestionText ? (
                <p className="flex-1 text-balance text-center text-5xl font-bold leading-snug text-yellow-400 sm:text-left md:text-6xl lg:text-7xl">
                  {headlineQuestionText}
                </p>
              ) : (
                <div className="hidden flex-1 lg:block" aria-hidden />
              )}
              {answerDeadlineMs != null && typeof timerSeconds === 'number' ? (
                <div
                  className={`flex min-w-[9.5rem] shrink-0 flex-col items-center justify-center self-center rounded-xl border px-7 py-6 lg:self-stretch lg:justify-center ${
                    timerSeconds <= 10
                      ? 'border-amber-400/60 bg-amber-950/40 shadow-[0_0_28px_rgba(251,191,36,0.12)]'
                      : 'border-amber-500/35 bg-amber-950/30'
                  }`}
                >
                  <div className="font-mono text-8xl font-black tabular-nums tracking-tight text-amber-200 sm:text-9xl">
                    {timerSeconds}s
                  </div>
                </div>
              ) : null}
            </div>
          </motion.section>
        ) : null}
      </div>

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 pb-12 sm:px-6">
        {wall != null && tileRows.length === 0 ? (
          <motion.div
            className="rounded-2xl border border-yellow-700/35 bg-black/55 p-10 text-center shadow-xl backdrop-blur-md sm:p-14"
            initial={skipMountIntro ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-4xl font-semibold leading-snug text-white/92 sm:text-5xl md:text-6xl">
              Felts open here after the host assigns players from the lobby.
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-2xl leading-relaxed text-white/65 sm:text-3xl md:text-4xl">
              Guests can keep joining from the briefing screen until seating runs.
            </p>
          </motion.div>
        ) : showSeatingSpotlightCycle && seatingHeroRow ? (
          <section aria-label="Seating spotlight tour">
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              Spotlight showing table {seatingHeroRow.tableNum}
            </p>
            <div className="mx-auto w-full max-w-[min(100%,56rem)]">
              <AnimatePresence mode="wait">
                <VenueMosaicTableCard
                  key={seatingHeroRow.tableNum}
                  row={seatingHeroRow}
                  mode="hero"
                  idx={0}
                  skipMountIntro={skipMountIntro}
                />
              </AnimatePresence>
              <p className="mt-4 text-center text-base text-white/50 sm:text-lg">
                {prefersReducedMotion
                  ? `Seating spotlight — Table ${seatingHeroRow.tableNum} (auto-rotation off: reduced motion)`
                  : `Rotating seating · Table ${seatingHeroRow.tableNum} · ${seatingHeroIdx + 1} of ${tileRows.length}`}
              </p>
              {!prefersReducedMotion && tileRows.length > 1 ? (
                <div className="mx-auto mt-4 max-w-3xl">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs text-white/50 sm:text-sm">
                    <span className="font-semibold uppercase tracking-wider text-white/45">Next table</span>
                    <span className="font-mono tabular-nums text-amber-200/90">
                      {Math.max(
                        0,
                        Math.ceil((1 - seatingCycleProgress) * SEATING_SPOTLIGHT_CYCLE_SEC)
                      )}
                      s
                    </span>
                  </div>
                  <div
                    className="h-2.5 w-full overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(seatingCycleProgress * 100)}
                    aria-label="Seating tour progress until the next table"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-700/95 to-amber-300/95"
                      style={{ width: `${seatingCycleProgress * 100}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-4">
            {tileRows.map((row, idx) => (
              <VenueMosaicTableCard
                key={row.tableNum}
                row={row}
                mode="grid"
                idx={idx}
                skipMountIntro={skipMountIntro}
              />
            ))}
          </div>
        )}
      </main>
      {showSeatingSpotlightCycle && seatingHeroRow ? (
        <VenueAllTablesCrawl
          tiles={tileRows}
          spotlightTableNum={seatingHeroRow.tableNum}
          prefersReducedMotion={prefersReducedMotion}
        />
      ) : null}
      {showRoster ? <VenueScrollingRoster tiles={tileRows} /> : null}
    </div>
  )
}
