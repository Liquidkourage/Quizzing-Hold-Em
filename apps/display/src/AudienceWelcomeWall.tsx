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

/** Builds a QR PNG via a public QR service (fallback if CSP blocks externals — image just hides). */
function qrImgSrc(joinUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=340x340&margin=14&data=${encodeURIComponent(joinUrl)}`
}

/** Full-screen pre-show join experience for venue-wall mode (not an overlay pop-up). */
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
      className="relative min-h-[100dvh] w-full overflow-x-hidden overflow-y-auto bg-[#04201c] text-white"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-[#0a1628] to-slate-950" />
        <div
          className="absolute -left-1/4 top-0 h-[140%] w-[150%] opacity-[0.12]"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 20%, rgba(52,211,153,0.55) 0%, transparent 45%),
              radial-gradient(circle at 70% 60%, rgba(251,191,36,0.25) 0%, transparent 40%)`,
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <motion.div
        className="relative z-10 mx-auto flex max-w-[1300px] flex-col px-6 pb-16 pt-8 sm:px-10 lg:pb-24 lg:pt-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <header className="flex flex-col items-center gap-4">
          <div className="w-[min(88vw,calc(min(1600px,100vw)-3rem)*0.5)] shrink-0" style={{ aspectRatio: '1024 / 655' }}>
            <QuizzEmWordmark layout="fill" />
          </div>
          <p className="text-center text-xl font-semibold uppercase tracking-[0.35em] text-emerald-300/95 sm:text-2xl">
            Join tonight&apos;s game
          </p>
        </header>

        <div className="mt-12 grid flex-1 items-start gap-12 lg:grid-cols-[minmax(280px,360px)_1fr] lg:gap-16">
          <section
            aria-label="Scan QR to open player app"
            className="flex flex-col items-center justify-start rounded-[2rem] border-2 border-emerald-400/40 bg-black/55 p-7 shadow-[0_0_60px_rgba(16,185,129,0.15)] lg:sticky lg:top-10"
          >
            <span className="text-center text-sm font-black uppercase tracking-[0.28em] text-emerald-200/90">
              Scan — fastest
            </span>
            {qrOk ? (
              <img
                src={qrImgSrc(joinUrl)}
                alt=""
                width={280}
                height={280}
                className="mt-5 rounded-2xl border border-white/20 bg-white p-3 shadow-xl"
                referrerPolicy="no-referrer"
                onError={() => setQrOk(false)}
              />
            ) : (
              <div className="mt-5 flex aspect-square w-[min(280px,70vw)] max-w-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/25 bg-white/5 p-6 text-center text-sm text-white/70">
                QR preview blocked — use the link on the right
              </div>
            )}
            <span className="mt-6 text-xs uppercase tracking-wide text-white/55">Opens player lobby</span>
          </section>

          <section className="flex min-w-0 flex-col gap-10">
            <div className="rounded-[2rem] border border-white/10 bg-black/35 p-8 shadow-inner backdrop-blur-sm sm:p-10">
              <p className="text-center font-mono text-sm font-semibold uppercase tracking-[0.2em] text-white/65">
                Your venue code
              </p>
              <div className="mt-4 bg-gradient-to-r from-transparent via-yellow-400/70 to-transparent py-px sm:via-yellow-400/90">
                <div className="bg-[#08221c] px-4 py-5 text-center font-mono text-5xl font-black tracking-[0.12em] text-yellow-400 tabular-nums sm:text-[3.65rem] sm:leading-none md:text-[4.75rem]">
                  {venueCode}
                </div>
              </div>

              <p className="mt-10 text-center text-lg font-semibold uppercase tracking-[0.2em] text-emerald-200/95">
                Or open this URL
              </p>
              <div className="mt-5 break-all rounded-xl border border-amber-500/35 bg-emerald-950/40 px-5 py-4 text-center font-mono text-lg font-bold text-amber-200 sm:text-2xl">
                {joinUrl}
              </div>

              <ol className="mt-10 grid gap-4 text-xl font-semibold leading-snug text-white sm:gap-5 sm:text-2xl">
                <li className="flex gap-5">
                  <span className="flex h-12 min-w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 font-black tabular-nums text-emerald-950">
                    1
                  </span>
                  <span className="pt-2">Use your camera or browser and open <strong className="text-amber-200">Player</strong> at the URL above.</span>
                </li>
                <li className="flex gap-5">
                  <span className="flex h-12 min-w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 font-black tabular-nums text-emerald-950">
                    2
                  </span>
                  <span className="pt-2">
                    Type{' '}
                    <strong className="font-mono text-yellow-400">{venueCode}</strong> as venue / room — then{' '}
                    <strong className="text-emerald-200">Join Game</strong>.
                  </span>
                </li>
                <li className="flex gap-5">
                  <span className="flex h-12 min-w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 font-black tabular-nums text-emerald-950">
                    3
                  </span>
                  <span className="pt-2">Leave <strong className="text-emerald-200">Lobby</strong> checked unless the host assigns you to a numbered table manually.</span>
                </li>
              </ol>
            </div>

            <section
              aria-label="Attendance"
              className="grid gap-4 sm:grid-cols-3"
            >
              {[
                { label: 'In lobby pool', hint: 'Before table assign', v: syncingCounts ? '—' : String(lobby ?? 0) },
                {
                  label: 'At tables',
                  hint: 'Seated humans',
                  v: syncingCounts ? '—' : String(atTables ?? 0),
                },
                {
                  label: 'Total checked in',
                  hint: 'No virtual seats counted',
                  v: syncingCounts ? '—' : String(enrolled ?? 0),
                  accent: 'text-yellow-300',
                },
              ].map(({ label, hint, v, accent }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-black/40 px-5 py-5 text-center ring-1 ring-white/5"
                >
                  <div className="text-[11px] font-black uppercase tracking-wider text-white/55">{label}</div>
                  <div className={`my-3 font-mono text-5xl font-black tabular-nums ${accent ?? 'text-white'}`}>
                    {v}
                  </div>
                  <div className="text-xs text-white/50">{hint}</div>
                </div>
              ))}
            </section>

            <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-emerald-950/60 to-black/55 px-8 py-8">
              <h2 className="text-center font-black uppercase tracking-[0.18em] text-emerald-200/95">
                Tonight in one glance
              </h2>
              <ul className="mt-6 space-y-4 text-xl leading-snug text-white/95 sm:text-2xl">
                <li className="flex gap-4">
                  <span className="mt-2 h-3 w-3 shrink-0 rounded-full bg-casino-gold shadow-neon-gold" />
                  Digit cards plus Hold&apos;em-style betting — trivia wins by numeric closeness after the reveal, not poker rank.
                </li>
                <li className="flex gap-4">
                  <span className="mt-2 h-3 w-3 shrink-0 rounded-full bg-casino-gold shadow-neon-gold" />
                  The host pushes questions and timing; keep this screen on the wall and watch your phone when it kicks off.
                </li>
              </ul>
              <p className="mt-8 text-center text-base text-emerald-200/80">
                Stand by — mosaic returns when your host taps <strong className="text-white">Start Game</strong>.
              </p>
            </section>
          </section>
        </div>
      </motion.div>
    </div>
  )
}
