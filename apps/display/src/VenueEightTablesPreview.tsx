import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { PokerChip } from '@qhe/ui'

/** One venue timeline — mirrored on every playable table (rosters/pots diverge locally). */
const VENUE = {
  /** Host advances one rhythm for room code → every felt matches. */
  phase: 'answering' as const,
  question:
    'In whole minutes, boiling point of pure water at standard atmospheric pressure?',
  subtitle: 'Shared deadline when answering — countdown is identical venue-wide.',
}

/** Seats filled & pot illustrate parallel table state — not synced across venue. */
const TABLE_SEATS = [8, 6, 7, 5, 8, 6, 7, 8] as const
const TABLE_POTS = [920, 640, 880, 400, 1100, 520, 760, 1340] as const

function SeatDots({
  seatedCount,
  size = 'md',
}: {
  seatedCount: number
  size?: 'md' | 'lg'
}) {
  const wrap = size === 'lg' ? 'max-w-[min(440px,92vw)]' : 'max-w-[200px]'
  const dot = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'

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
        const filled = i < seatedCount
        return (
          <div
            key={i}
            className={`absolute ${dot} -translate-x-1/2 -translate-y-1/2 rounded-full border shadow ${
              filled
                ? 'border-emerald-300/70 bg-black/85'
                : 'border-white/20 bg-black/35'
            }`}
            style={{ left: `calc(50% + ${xr}%)`, top: `calc(50% + ${yr}%)` }}
            title={`Seat ${i + 1}`}
          />
        )
      })}
    </div>
  )
}

function phaseLabel(ph: string) {
  if (ph === 'question') return 'Question setup'
  if (ph === 'betting') return 'Wagering'
  if (ph === 'answering') return 'Answering'
  if (ph === 'showdown') return 'Showdown'
  return ph
}

function phaseAccent(ph: string) {
  if (ph === 'answering') return 'text-amber-200 ring-1 ring-amber-400/50'
  if (ph === 'showdown') return 'text-yellow-300 ring-1 ring-yellow-400/35'
  if (ph === 'question') return 'text-emerald-200/95'
  return 'text-white/85'
}

function parseFocusTableParam(sp: URLSearchParams): number | null {
  const raw = sp.get('focusTable') ?? sp.get('tableFocus')
  if (raw == null || raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > 8) return null
  return n
}

function replaceUrlFocus(table: number | null) {
  const u = new URL(window.location.href)
  if (table == null) {
    u.searchParams.delete('focusTable')
    u.searchParams.delete('tableFocus')
  } else {
    u.searchParams.set('focusTable', String(table))
    u.searchParams.delete('tableFocus')
  }
  window.history.replaceState(null, '', `${u.pathname}${u.search}${u.hash}`)
}

/**
 * Opens from ?tablesPreview (see main.tsx). Venue wall + optional ?focusTable=N (table view).
 */
export default function VenueEightTablesPreview() {
  const venue =
    new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase() || 'HOST01'

  const initialFocus = useMemo(
    () => parseFocusTableParam(new URLSearchParams(window.location.search)),
    [],
  )

  const [focusedTable, setFocusedTable] = useState<number | null>(initialFocus)

  useEffect(() => {
    replaceUrlFocus(focusedTable)
  }, [focusedTable])

  const [bannerSecondsLeft, setBannerSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (VENUE.phase !== 'answering') {
      setBannerSecondsLeft(null)
      return
    }
    const deadline = Date.now() + 43_000
    const tick = () => setBannerSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [])

  const fi = focusedTable != null ? focusedTable - 1 : -1
  const focusSeats = fi >= 0 ? TABLE_SEATS[fi] : 0
  const focusPot = fi >= 0 ? TABLE_POTS[fi] : 0

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

      <header className="relative z-10 border-b border-white/10 bg-black/40 px-6 py-5 text-center backdrop-blur-md">
        <motion.h1
          className="flex items-center justify-center gap-2 text-4xl font-black tracking-tight text-yellow-400 sm:text-5xl"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PokerChip size="lg" /> Venue wall —{' '}
          <span className="text-yellow-400 underline decoration-yellow-600/55 decoration-4 underline-offset-4">
            8 tables
          </span>
        </motion.h1>
        <p className="mt-3 text-lg text-white/85">
          Event <span className="font-bold text-casino-emerald">{venue}</span>
          <span className="text-white/55"> · </span>
          <span className="text-white/65">parallel play, host-sync’d cue & beats</span>
        </p>
        <p className="mx-auto mt-3 max-w-3xl text-sm text-white/50">
          This view is mocked. Use{' '}
          <code className="rounded bg-white/10 px-1.5 font-mono text-white/85">focusTable=1–8</code> to open in{' '}
          <strong className="text-white/70">table view</strong>. Reload without{' '}
          <code className="rounded bg-white/10 px-1.5 font-mono text-white/85">tablesPreview</code> for live single-table (
          <code className="font-mono">&amp;table=…</code>).
        </p>
      </header>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 pt-8 sm:px-6">
        <motion.section
          className="mb-8 rounded-2xl border-2 border-casino-emerald/40 bg-black/65 p-6 shadow-[0_0_40px_rgba(0,255,180,0.08)] backdrop-blur-md"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center sm:justify-between sm:text-left">
            <div>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-casino-emerald/85">
                  Venue-wide (tables 1–8)
                </div>
                {focusedTable != null && (
                  <span className="rounded-full border border-amber-400/50 bg-amber-500/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-200">
                    Table view · felt {focusedTable}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className={`rounded-lg px-3 py-1 text-sm font-black uppercase ${phaseAccent(VENUE.phase)}`}>
                  {phaseLabel(VENUE.phase)}
                </span>
                <span className="text-sm text-white/65">{VENUE.subtitle}</span>
              </div>
            </div>
            {VENUE.phase === 'answering' && bannerSecondsLeft != null && (
              <div className="rounded-xl border border-amber-500/35 bg-amber-950/30 px-5 py-2 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/55">
                  Same deadline everywhere
                </div>
                <div className="font-mono text-3xl font-black tabular-nums text-amber-200">{bannerSecondsLeft}s</div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-white/45">Synced trivia</div>
            <p className="mt-2 text-xl font-semibold leading-snug text-yellow-400 sm:text-2xl">{VENUE.question}</p>
            <p className="mt-3 text-xs leading-relaxed text-white/55 sm:text-sm">
              In production, the host advances one lifecycle for this room code; every playable table receives the same{' '}
              <strong className="text-white/85">phase</strong> and <strong className="text-white/85">question</strong>.
              Stacks, blinds, folds, pots, and rosters remain <strong className="text-white/85">local to each felt</strong>.
            </p>
          </div>
        </motion.section>
      </div>

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 pb-12 sm:px-6">
        {focusedTable == null ? (
          <>
            <h2 className="mb-2 text-center text-sm font-bold uppercase tracking-[0.18em] text-white/45">
              Per-table — local pot & seats · click a felt to emulate host table focus
            </h2>
            <p className="mx-auto mb-6 max-w-2xl text-center text-[13px] text-white/55">
              Or deep-link{' '}
              <code className="rounded bg-white/10 px-1.5 font-mono text-xs text-emerald-200/90">&amp;focusTable=3</code> to start
              spotlighted on table 3.
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {TABLE_SEATS.map((seats, idx) => {
                const tn = idx + 1
                const pot = TABLE_POTS[idx]
                return (
                  <motion.article
                    key={tn}
                    role="button"
                    tabIndex={0}
                    onClick={() => setFocusedTable(tn)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setFocusedTable(tn)
                      }
                    }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.045, duration: 0.35 }}
                    className="flex cursor-pointer flex-col rounded-2xl border border-yellow-700/35 bg-black/55 p-4 shadow-xl outline-none backdrop-blur-md ring-casino-emerald transition-shadow hover:border-casino-emerald/50 hover:shadow-[0_0_24px_rgba(0,255,180,0.12)] focus-visible:ring-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-white/55">Table</div>
                        <div className="text-3xl font-black tabular-nums text-yellow-400">{tn}</div>
                      </div>
                      <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase ${phaseAccent(VENUE.phase)}`}>
                        {phaseLabel(VENUE.phase)}
                      </span>
                    </div>

                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-casino-emerald/85">
                      In sync ✓
                    </div>

                    <div className="mt-3 flex-shrink-0">
                      <SeatDots seatedCount={seats} />
                    </div>

                    <dl className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm leading-snug">
                      <div className="flex justify-between gap-2">
                        <dt className="text-white/55">Occupied seats</dt>
                        <dd className="font-mono font-bold tabular-nums text-casino-emerald">{seats} / 8</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-white/55">Pot (local)</dt>
                        <dd className="font-mono font-bold tabular-nums text-yellow-300">${pot.toLocaleString()}</dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-center text-[11px] text-casino-emerald/85">Click → table view</p>
                  </motion.article>
                )
              })}
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-black/35 px-4 py-3">
              <button
                type="button"
                onClick={() => setFocusedTable(null)}
                className="rounded-lg border border-white/25 bg-white/5 px-4 py-2 text-sm font-bold text-white transition-colors hover:border-casino-emerald hover:bg-white/10"
              >
                ← Venue wall (all felts)
              </button>
              <p className="text-xs text-white/55 sm:text-sm">
                <span className="font-semibold text-white/80">Host emulation:</span> one felt enlarged; venue trivia & timers stay
                global above.
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-2" aria-label="Switch felt">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFocusedTable(n)}
                  className={`min-w-[3rem] rounded-lg border px-3 py-2 text-sm font-bold tabular-nums transition-colors ${
                    n === focusedTable
                      ? 'border-casino-emerald bg-casino-emerald/25 text-white shadow-[0_0_14px_rgba(0,255,180,0.25)]'
                      : 'border-white/15 bg-black/40 text-white/70 hover:border-white/35 hover:text-white'
                  }`}
                >
                  {n}
                </button>
              ))}
            </nav>

            <motion.article
              layout
              className="flex flex-col rounded-2xl border-2 border-casino-emerald/45 bg-black/60 p-6 shadow-[0_0_36px_rgba(0,255,180,0.12)] backdrop-blur-md sm:p-10"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-white/50">Focused table</div>
                  <div className="text-5xl font-black tabular-nums text-yellow-400 sm:text-6xl">{focusedTable}</div>
                </div>
                <span className={`rounded-lg px-3 py-2 text-xs font-black uppercase ${phaseAccent(VENUE.phase)}`}>
                  {phaseLabel(VENUE.phase)}
                </span>
              </div>

              <p className="mt-2 text-sm font-semibold text-casino-emerald/95">Receiving same phase & trivia as venue bar ↑</p>

              <div className="mt-8 flex justify-center">
                <SeatDots seatedCount={focusSeats} size="lg" />
              </div>

              <dl className="mx-auto mt-10 grid max-w-md grid-cols-2 gap-x-8 gap-y-4 border-t border-white/15 pt-8 text-center sm:text-left">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-white/50">Occupied seats</dt>
                  <dd className="mt-1 text-3xl font-black tabular-nums text-casino-emerald">{focusSeats} / 8</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-white/50">Pot (local)</dt>
                  <dd className="mt-1 text-3xl font-black tabular-nums text-yellow-300">${focusPot.toLocaleString()}</dd>
                </div>
              </dl>
            </motion.article>
          </div>
        )}
      </main>
    </div>
  )
}
