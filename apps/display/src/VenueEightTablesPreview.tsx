import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PokerChip } from '@qhe/ui'
import {
  DISPLAY_PREVIEW_DEMO_QUESTION_TEXT,
  DISPLAY_PREVIEW_SYNCED_PHASE,
  DISPLAY_PREVIEW_SYNCED_SUBTITLE,
  DISPLAY_PREVIEW_TABLES,
} from '@qhe/core'

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

type VenueEightTablesPreviewProps = {
  venueCode: string
}

/**
 * Venue wall — eight mock felts (overview only). Spotlight from the host swaps to full live felt in `DisplayRouter`.
 * See repo rule: display-readonly.
 */
export default function VenueEightTablesPreview({ venueCode }: VenueEightTablesPreviewProps) {
  const [bannerSecondsLeft, setBannerSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    const deadline = Date.now() + 43_000
    const tick = () =>
      setBannerSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [])

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
          Event <span className="font-bold text-casino-emerald">{venueCode}</span>
          <span className="text-white/55"> · </span>
          <span className="text-white/65">parallel play, host-sync’d cue & beats</span>
        </p>
        <p className="mx-auto mt-3 max-w-3xl text-sm text-white/50">
          Read-only display (no on-screen controls). The host uses <strong className="text-white/70">Venue &amp; roster</strong> for
          all eight felts, to <strong className="text-white/70">spotlight</strong> one table (full live felt), or a single live felt.
          Ops URL:{' '}
          <code className="rounded bg-white/10 px-1.5 font-mono text-white/85">tablesPreview</code>.
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
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className={`rounded-lg px-3 py-1 text-sm font-black uppercase ${phaseAccent(DISPLAY_PREVIEW_SYNCED_PHASE)}`}>
                  {phaseLabel(DISPLAY_PREVIEW_SYNCED_PHASE)}
                </span>
                <span className="text-sm text-white/65">{DISPLAY_PREVIEW_SYNCED_SUBTITLE}</span>
              </div>
            </div>
            {DISPLAY_PREVIEW_SYNCED_PHASE === 'answering' && bannerSecondsLeft != null && (
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
            <p className="mt-2 text-xl font-semibold leading-snug text-yellow-400 sm:text-2xl">{DISPLAY_PREVIEW_DEMO_QUESTION_TEXT}</p>
            <p className="mt-3 text-xs leading-relaxed text-white/55 sm:text-sm">
              In production, the host advances one lifecycle for this room code; every playable table receives the same{' '}
              <strong className="text-white/85">phase</strong> and <strong className="text-white/85">question</strong>.
              Stacks, blinds, folds, pots, and rosters remain <strong className="text-white/85">local to each felt</strong>.
            </p>
          </div>
        </motion.section>
      </div>

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 pb-12 sm:px-6">
        <h2 className="mb-2 text-center text-sm font-bold uppercase tracking-[0.18em] text-white/45">
          Per-table — local pot & seats (read-only tiles)
        </h2>
        <p className="mx-auto mb-6 max-w-2xl text-center text-[13px] text-white/55">
          To show the <strong className="text-white/80">full live felt</strong> for one table, pick it under{' '}
          <strong className="text-white/75">Venue &amp; roster → Public TVs</strong> — never by touching this screen.
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DISPLAY_PREVIEW_TABLES.map((snap, idx) => {
                const tn = idx + 1
                const seats = snap.seated
                const pot = snap.pot
                return (
                  <motion.article
                    key={tn}
                    data-spotlight-tile={tn}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.045, duration: 0.35 }}
                    className="flex flex-col rounded-2xl border border-yellow-700/35 bg-black/55 p-4 shadow-xl backdrop-blur-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-white/55">Table</div>
                        <div className="text-3xl font-black tabular-nums text-yellow-400">{tn}</div>
                      </div>
                      <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase ${phaseAccent(DISPLAY_PREVIEW_SYNCED_PHASE)}`}>
                        {phaseLabel(DISPLAY_PREVIEW_SYNCED_PHASE)}
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
                  </motion.article>
                )
              })}
        </div>
      </main>
    </div>
  )
}
