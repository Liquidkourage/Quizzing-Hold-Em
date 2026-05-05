import { useState } from 'react'
import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueWallSnapshot } from '@qhe/net'

export type AudienceWelcomeWallProps = {
  venueCode: string
  wall: DisplayVenueWallSnapshot | null
}

function playerJoinHref(): string {
  if (typeof window === 'undefined') return '/player/'
  return `${window.location.origin}/player/`
}

function qrImgSrc(joinUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(joinUrl)}`
}

/** Fits a typical 1080p wall display in one viewport (no scrolling). */
export default function AudienceWelcomeWall({ venueCode, wall }: AudienceWelcomeWallProps) {
  const joinUrl = playerJoinHref()
  const syncingCounts = wall == null
  const lobby = syncingCounts ? null : wall.lobbyPlayerCount
  const atTables = syncingCounts ? null : wall.totalSeatedAtTables
  const enrolled = syncingCounts ? null : (lobby ?? 0) + (atTables ?? 0)
  const [qrOk, setQrOk] = useState(true)

  return (
    <div
      role="main"
      aria-label="Join this Quizz'em game"
      className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#04201c] text-white"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-[#0a1628] to-slate-950" />
        <div
          className="absolute -left-1/4 top-0 h-[140%] w-[150%] opacity-[0.1]"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 20%, rgba(52,211,153,0.5) 0%, transparent 45%),
              radial-gradient(circle at 70% 60%, rgba(251,191,36,0.22) 0%, transparent 40%)`,
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>

      <motion.div
        className="relative z-10 mx-auto flex h-full min-h-0 max-w-[1400px] flex-col px-4 py-3 sm:px-6 sm:py-4 lg:px-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        <header className="flex shrink-0 flex-col items-center gap-1 sm:gap-1.5">
          <div
            className="w-[min(52vw,320px)] shrink-0 sm:w-[min(44vw,380px)]"
            style={{ aspectRatio: '1024 / 655' }}
          >
            <QuizzEmWordmark layout="fill" />
          </div>
          <p className="text-center text-xs font-bold uppercase tracking-[0.28em] text-emerald-300/95 sm:text-sm">
            Join tonight&apos;s game
          </p>
        </header>

        <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,200px)_1fr] lg:gap-6 xl:grid-cols-[minmax(0,220px)_1fr]">
          <section
            aria-label="Scan QR to open player app"
            className="flex flex-row items-center justify-center gap-3 rounded-2xl border border-emerald-400/35 bg-black/50 p-3 shadow-inner lg:flex-col lg:justify-start lg:p-4"
          >
            <span className="hidden text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/90 lg:block lg:text-center">
              Scan fastest
            </span>
            {qrOk ? (
              <img
                src={qrImgSrc(joinUrl)}
                alt=""
                width={168}
                height={168}
                className="shrink-0 rounded-xl border border-white/20 bg-white p-2 shadow-lg lg:mx-auto lg:mt-1"
                referrerPolicy="no-referrer"
                onError={() => setQrOk(false)}
              />
            ) : (
              <div className="flex aspect-square h-[136px] w-[136px] shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-white/25 bg-white/5 p-2 text-center text-[11px] leading-tight text-white/65 lg:mx-auto">
                QR blocked — use URL →
              </div>
            )}
            <span className="hidden text-[10px] uppercase tracking-wide text-white/50 lg:block lg:text-center">
              Opens player
            </span>
          </section>

          <section className="flex min-h-0 min-w-0 flex-col gap-2 lg:gap-3">
            <div className="grid min-h-0 shrink gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-3 backdrop-blur-sm sm:p-4">
                <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                  Venue code
                </p>
                <div className="mt-2 bg-gradient-to-r from-transparent via-yellow-400/65 to-transparent py-px">
                  <div className="bg-[#08221c] px-3 py-2 text-center font-mono text-[clamp(1.85rem,4.8vw,3.25rem)] font-black leading-none tracking-[0.1em] text-yellow-400">
                    {venueCode}
                  </div>
                </div>
                <p className="mt-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white/55">
                  Player URL
                </p>
                <div className="mt-1.5 break-all rounded-lg border border-amber-500/30 bg-emerald-950/35 px-3 py-2 text-center font-mono text-[clamp(0.7rem,1.35vw,0.95rem)] font-semibold leading-snug text-amber-200">
                  {joinUrl}
                </div>
              </div>

              <ol className="flex min-h-0 flex-col justify-center gap-2 rounded-2xl border border-white/10 bg-black/30 p-3 text-[clamp(0.8rem,1.5vw,1.05rem)] font-semibold leading-snug text-white/95 sm:p-3.5">
                <li className="flex gap-2.5">
                  <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-sm font-black text-emerald-950">
                    1
                  </span>
                  <span className="pt-0.5">
                    Open <strong className="text-amber-200">Player</strong> (scan or URL).
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-sm font-black text-emerald-950">
                    2
                  </span>
                  <span className="pt-0.5">
                    Code <strong className="font-mono text-yellow-400">{venueCode}</strong> →{' '}
                    <strong className="text-emerald-200">Join Game</strong>.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-sm font-black text-emerald-950">
                    3
                  </span>
                  <span className="pt-0.5">
                    Keep <strong className="text-emerald-200">Lobby</strong> on unless the host seats you at a table.
                  </span>
                </li>
              </ol>
            </div>

            <section
              aria-label="Attendance"
              className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3"
            >
              {[
                { label: 'Lobby', hint: 'Pre-assign', v: syncingCounts ? '—' : String(lobby ?? 0) },
                { label: 'Tables', hint: 'Seated', v: syncingCounts ? '—' : String(atTables ?? 0) },
                {
                  label: 'Total in',
                  hint: 'Humans',
                  v: syncingCounts ? '—' : String(enrolled ?? 0),
                  accent: 'text-yellow-300',
                },
              ].map(({ label, hint, v, accent }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 bg-black/45 px-2 py-2 text-center sm:px-3 sm:py-2.5"
                >
                  <div className="text-[9px] font-black uppercase tracking-wider text-white/50 sm:text-[10px]">
                    {label}
                  </div>
                  <div className={`font-mono text-[clamp(1.5rem,4vw,2.25rem)] font-black leading-none tabular-nums ${accent ?? 'text-white'}`}>
                    {v}
                  </div>
                  <div className="mt-0.5 text-[9px] text-white/45 sm:text-[10px]">{hint}</div>
                </div>
              ))}
            </section>

            <p className="shrink-0 text-center text-[10px] leading-snug text-emerald-200/75 sm:text-[11px] lg:text-xs">
              Digit-card trivia + Hold&apos;em-style betting — host drives the show. This wall switches to the table
              mosaic when they tap <strong className="text-white/90">Start Game</strong>.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  )
}
