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
  return `https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=10&data=${encodeURIComponent(joinUrl)}`
}

/**
 * Bar / banquet-hall TVs: vmin-based typography and full-viewport spacing so QR,
 * venue code, URL, counts, and copy read from ~10–20 ft on a typical 1080p 40"+
 * flat panel.
 */
export default function AudienceWelcomeWall({ venueCode, wall }: AudienceWelcomeWallProps) {
  const joinUrl = playerJoinHref()
  const syncingCounts = wall == null
  const lobby = syncingCounts ? null : wall.lobbyPlayerCount
  const atTables = syncingCounts ? null : wall.totalSeatedAtTables
  const enrolled = syncingCounts ? null : (lobby ?? 0) + (atTables ?? 0)
  const [qrOk, setQrOk] = useState(true)

  const caption = `text-[clamp(0.8rem,2.2vmin,1.375rem)] font-bold uppercase tracking-[0.2em] text-emerald-200/95`

  const stepCircle =
    `flex shrink-0 items-center justify-center rounded-xl bg-emerald-400 font-black text-emerald-950 shadow-[0_0_28px_rgba(52,211,153,0.35)] ` +
    ` h-[clamp(2.65rem,7.5vmin,4.25rem)] min-w-[clamp(2.65rem,7.5vmin,4.25rem)] text-[clamp(1.1rem,3.6vmin,1.85rem)]`

  const stepText =
    'text-[clamp(1.03rem,3.05vmin,1.95rem)] font-bold leading-snug text-white'

  return (
    <div
      role="main"
      aria-label="Join this Quizz'em game"
      className="relative flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-[#031a17] antialiased text-white selection:bg-yellow-400/35"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/90 via-[#061c24] to-black" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:clamp(44px,6vmin,80px)_clamp(44px,6vmin,80px)]" />
      </div>

      <motion.div
        className="relative z-10 flex h-full min-h-0 w-full flex-1 flex-col justify-between px-[clamp(12px,4vmin,52px)] py-[clamp(10px,1.8vh,28px)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Brand — deliberately compact so hero join legibility wins */}
        <header className="flex shrink-0 flex-col items-center">
          <div
            className="h-[clamp(52px,min(11vh,120px))] shrink-0 w-auto max-w-[min(72vw,640px)]"
            style={{ aspectRatio: '1024 / 655' }}
          >
            <QuizzEmWordmark layout="fill" />
          </div>
          <p className={`${caption} mt-[0.75vmin] opacity-95`}>Join tonight&apos;s game</p>
        </header>

        {/* Hero band: dominates screen — QR + oversized room / URL / steps */}
        <div className="grid min-h-0 flex-1 grid-cols-1 items-center gap-[clamp(14px,3.8vmin,40px)] py-[clamp(8px,1.8vmin,28px)] lg:grid-cols-[minmax(0,auto)_minmax(0,1.15fr)] lg:justify-items-start">
          <section
            aria-label="Scan QR to open player app"
            className={`mx-auto flex w-[min(min(54vmin,_48vh),520px)] max-w-[95vw] flex-col items-center justify-center rounded-[clamp(14px,2.5vmin,28px)] border-[3px] border-emerald-400/55 bg-black/65 p-[clamp(12px,2.8vmin,32px)] shadow-[0_0_80px_rgba(34,211,153,0.12)]`}
          >
            <span className={`${caption} mb-[clamp(10px,1.8vmin,20px)] text-center leading-tight`}>
              Aim camera here
            </span>
            {qrOk ? (
              <div className="w-full rounded-2xl border-[3px] border-white bg-white p-[clamp(10px,1.8vmin,18px)] shadow-2xl">
                <img
                  src={qrImgSrc(joinUrl)}
                  alt=""
                  width={440}
                  height={440}
                  className="block h-auto w-full"
                  referrerPolicy="no-referrer"
                  onError={() => setQrOk(false)}
                />
              </div>
            ) : (
              <div className={`rounded-2xl border-2 border-dashed border-white/35 bg-white/[0.04] px-8 py-14 text-center text-[clamp(1rem,2.8vmin,1.4rem)] font-semibold leading-snug text-amber-200/90`}>
                QR blocked — use the huge URL beside this box
              </div>
            )}
            <span className={`${caption} mt-[clamp(10px,1.8vmin,20px)] text-center opacity-85`}>Opens Player</span>
          </section>

          <section className="flex min-h-0 w-full flex-col justify-center gap-[clamp(12px,3.6vmin,40px)]">
            <div>
              <p className={`text-center lg:text-left ${caption} mb-[clamp(10px,1.6vmin,16px)]`}>
                Venue / room code
              </p>
              <div className="rounded-[clamp(12px,2vmin,28px)] border-4 border-yellow-400/85 bg-black/70 px-[clamp(10px,2.6vmin,32px)] py-[clamp(14px,2.8vmin,28px)] shadow-[inset_0_0_0_1px_rgba(251,191,36,0.2)]">
                <div className="text-center font-mono text-[clamp(3rem,_16vmin,_9.5rem)] font-black leading-none tracking-[0.08em] text-yellow-400 lg:text-left">
                  {venueCode}
                </div>
              </div>
            </div>

            <div className="rounded-[clamp(12px,2vmin,24px)] border-4 border-emerald-500/40 bg-emerald-950/40 px-[clamp(10px,2.4vmin,28px)] py-[clamp(14px,2.2vmin,24px)]">
              <p className={`${caption} mb-[clamp(8px,1.6vmin,14px)] text-center lg:text-left`}>Player URL</p>
              <p className="break-words font-mono text-[clamp(1rem,4.05vmin,2.65rem)] font-bold leading-snug tracking-tight text-amber-200">
                {joinUrl}
              </p>
            </div>

            <ol className="grid gap-[clamp(10px,2.8vmin,24px)]">
              <li className="flex items-start gap-[clamp(14px,2.8vmin,24px)]">
                <span className={stepCircle}>1</span>
                <span className={`${stepText} pt-[0.4vmin]`}>
                  Open <strong className="text-amber-200">Player</strong> — scan the QR{' '}
                  <span className="text-white/80">or type the URL</span>.
                </span>
              </li>
              <li className="flex items-start gap-[clamp(14px,2.8vmin,24px)]">
                <span className={stepCircle}>2</span>
                <span className={`${stepText} pt-[0.4vmin]`}>
                  Enter code{' '}
                  <strong className="rounded-md bg-yellow-400/25 px-[0.35em] font-mono text-yellow-300">{venueCode}</strong>
                  {' — then '}
                  <strong className="text-emerald-300">Join Game</strong>.
                </span>
              </li>
              <li className="flex items-start gap-[clamp(14px,2.8vmin,24px)]">
                <span className={stepCircle}>3</span>
                <span className={`${stepText} pt-[0.4vmin]`}>
                  Leave <strong className="text-emerald-300">Lobby</strong> checked unless your host assigns a table
                  number.
                </span>
              </li>
            </ol>
          </section>
        </div>

        {/* Head-count strip — billboard scale */}
        <section
          aria-label="Attendance"
          className="grid shrink-0 grid-cols-3 gap-[clamp(8px,2.2vmin,22px)]"
        >
          {[
            { label: 'Lobby pool', hint: 'Waiting for seats', v: syncingCounts ? '—' : String(lobby ?? 0) },
            { label: 'At tables', hint: 'Seated now', v: syncingCounts ? '—' : String(atTables ?? 0) },
            {
              label: 'Total in',
              hint: 'Humans (no CPUs)',
              v: syncingCounts ? '—' : String(enrolled ?? 0),
              accent: true,
            },
          ].map(({ label, hint, v, accent }) => (
            <div
              key={label}
              className={`rounded-[clamp(10px,1.8vmin,22px)] border-[3px] px-[clamp(6px,1.8vmin,16px)] py-[clamp(12px,2.4vmin,22px)] text-center backdrop-blur-sm ${
                accent
                  ? 'border-yellow-500/45 bg-yellow-950/35'
                  : 'border-white/15 bg-black/55'
              }`}
            >
              <div className="text-[clamp(0.7rem,2.05vmin,1.15rem)] font-black uppercase tracking-[0.12em] text-white/78">
                {label}
              </div>
              <div
                className={`py-[clamp(8px,1.8vmin,16px)] font-mono tabular-nums tracking-tight ${
                  accent
                    ? 'text-[clamp(2.85rem,12.5vmin,7.75rem)] font-black text-yellow-300'
                    : 'text-[clamp(2.85rem,12.5vmin,7.75rem)] font-black text-white'
                }`}
              >
                {v}
              </div>
              <div className="text-[clamp(0.7rem,1.85vmin,1.05rem)] font-semibold text-white/62">{hint}</div>
            </div>
          ))}
        </section>

        <p className="shrink-0 pt-[clamp(12px,2.2vmin,22px)] text-center text-[clamp(0.875rem,2.55vmin,1.6rem)] font-semibold leading-snug text-emerald-200/90">
          Digit-card trivia with Hold&apos;em-style wagering —{' '}
          <span className="text-white">host runs the pace</span>. Wall shows all tables once they tap{' '}
          <strong className="text-white">Start Game</strong>.
        </p>
      </motion.div>
    </div>
  )
}
