import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import {
  DISPLAY_PREVIEW_SYNCED_PHASE,
  DISPLAY_PREVIEW_TABLES,
  rehearsalSeatDisplayName,
} from '@qhe/core'
import type { DisplayVenueTileSnapshot, DisplayVenueWallSnapshot } from '@qhe/net'

const VENUE_SEAT_SLOTS = 8

function padSeatNames(raw: string[] | undefined): string[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    if (raw != null && raw[i] != null) {
      const t = String(raw[i]).trim()
      return t
    }
    return ''
  })
}

/**
 * Eight seat positions around the mini felt; optional name chips just outside each chair.
 */
function SeatRingWithLabels({
  seatedCount,
  seatNames,
  size = 'md',
}: {
  seatedCount: number
  seatNames: string[]
  size?: 'md' | 'lg'
}) {
  const wrap =
    size === 'lg' ? 'max-w-[min(440px,92vw)]' : 'max-w-[min(320px,94vw)]'
  const dot = size === 'lg' ? 'h-8 w-8' : 'h-6 w-6'
  const labelClass =
    size === 'lg'
      ? 'max-w-[min(8rem,26vw)] text-base sm:text-lg'
      : 'max-w-[min(7.5rem,26vw)] text-sm sm:text-base md:text-lg'

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
                <span className="block truncate">{raw}</span>
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

/** Latin-first sort key: leading word of the display name (first name). */
function firstNameSortKey(displayName: string): string {
  const t = displayName.trim()
  if (!t) return ''
  const w = t.split(/\s+/)[0]
  return w ?? t
}

function rosterRowsFromTiles(
  tiles: DisplayVenueTileSnapshot[]
): { name: string; tableNum: number }[] {
  const out: { name: string; tableNum: number }[] = []
  for (const t of tiles) {
    const sn = t.seatNames
    if (sn == null || sn.length === 0) continue
    for (let i = 0; i < sn.length; i++) {
      const raw = sn[i]?.trim()
      if (raw) out.push({ name: raw, tableNum: t.tableNum })
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
    <section
      className="flex max-h-[min(82vh,720px)] flex-col rounded-2xl border-2 border-yellow-700/35 bg-black/50 shadow-xl backdrop-blur-md"
      aria-label="Players and table assignments"
    >
      <div className="border-b border-white/10 px-5 py-4 sm:px-6 sm:py-5">
        <h2 className="text-base font-bold uppercase tracking-[0.2em] text-white/60 sm:text-lg">
          Players
        </h2>
        <p className="mt-1 text-xl font-bold leading-snug text-white/92 sm:text-2xl">Table seating</p>
      </div>
      <div
        className="relative h-64 overflow-hidden px-2 py-2 sm:h-80 sm:px-3 lg:h-[min(58vh,520px)]"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
        }}
      >
        <div
          className="venue-roster-animate flex flex-col gap-0"
          style={{ ['--venue-roster-secs' as string]: `${durationSec}s` }}
        >
          {doubled.map((r, idx) => (
            <div
              key={`${r.tableNum}-${r.name}-${idx}`}
              className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-3 py-3.5 sm:px-4 sm:py-4"
            >
              <span className="min-w-0 flex-1 truncate text-lg font-semibold leading-snug text-white/95 sm:text-xl md:text-2xl">
                {r.name}
              </span>
              <span className="shrink-0 whitespace-nowrap font-mono text-base font-bold uppercase tracking-[0.12em] text-yellow-400/95 sm:text-lg md:text-xl">
                TABLE {r.tableNum}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
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
 */
export default function VenueEightTablesPreview({ wall, skipMountIntro = false }: VenueEightTablesPreviewProps) {
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null)

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
            return {
              tableNum: i + 1,
              seated,
              pot: snap.pot,
              phase: DISPLAY_PREVIEW_SYNCED_PHASE,
              seatNames,
            }
          })

  const hasLiveWall =
    wall != null && wall.tiles != null && wall.tiles.length > 0
  const showHeadline =
    hasLiveWall && (headlineQuestionText != null || answerDeadlineMs != null)

  const showRoster = rosterRowsFromTiles(tileRows).length > 0

  return (
    <div className="relative min-h-screen overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
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
                <p className="flex-1 text-balance text-center text-3xl font-bold leading-snug text-yellow-400 sm:text-left md:text-4xl lg:text-5xl">
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
                  <div className="font-mono text-6xl font-black tabular-nums tracking-tight text-amber-200 sm:text-7xl lg:text-8xl">
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
            <p className="text-2xl font-semibold leading-snug text-white/92 sm:text-3xl md:text-4xl">
              Felts open here after the host assigns players from the lobby.
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/65 sm:text-xl md:text-2xl">
              Guests can keep joining from the briefing screen until seating runs.
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
            {showRoster ? (
              <aside className="order-1 w-full shrink-0 lg:order-2 lg:sticky lg:top-4 lg:min-w-0 lg:max-w-[min(42rem,40vw)] lg:w-[min(42rem,40vw)] xl:max-w-none xl:w-[min(44rem,34vw)]">
                <VenueScrollingRoster tiles={tileRows} />
              </aside>
            ) : null}
            <div
              className={`order-2 min-w-0 flex-1 ${showRoster ? 'lg:order-1' : ''}`}
            >
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-2 2xl:grid-cols-4 2xl:gap-6">
                {tileRows.map((row, idx) => {
                  const tn = row.tableNum
                  const seats = row.seated
                  const pot = row.pot
                  const ph = row.phase
                  const seatNames = padSeatNames(row.seatNames)
                  return (
                    <motion.article
                      key={tn}
                      data-spotlight-tile={tn}
                      initial={skipMountIntro ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: skipMountIntro ? 0 : idx * 0.045,
                        duration: skipMountIntro ? 0 : 0.35,
                      }}
                      className="flex flex-col rounded-2xl border-2 border-yellow-700/35 bg-black/55 p-5 shadow-xl backdrop-blur-md sm:p-6"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60 sm:text-base">
                            Table
                          </div>
                          <div className="text-5xl font-black tabular-nums leading-none text-yellow-400 sm:text-6xl">
                            {tn}
                          </div>
                        </div>
                        <span
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold uppercase sm:text-sm ${phaseAccent(ph)}`}
                        >
                          {phaseLabel(ph)}
                        </span>
                      </div>

                      <div className="mt-4 flex-shrink-0">
                        <SeatRingWithLabels seatedCount={seats} seatNames={seatNames} />
                      </div>

                      <dl className="mt-5 space-y-2.5 border-t border-white/10 pt-5 text-base leading-snug sm:text-lg md:text-xl">
                        <div className="flex justify-between gap-3">
                          <dt className="font-medium text-white/65">Occupied seats</dt>
                          <dd className="font-mono font-bold tabular-nums text-casino-emerald">
                            {seats} / 8
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="font-medium text-white/65">Pot (local)</dt>
                          <dd className="font-mono font-bold tabular-nums text-yellow-300">
                            ${pot.toLocaleString()}
                          </dd>
                        </div>
                      </dl>
                    </motion.article>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
