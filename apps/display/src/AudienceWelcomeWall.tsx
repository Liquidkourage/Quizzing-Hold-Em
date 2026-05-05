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
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=9&data=${encodeURIComponent(joinUrl)}`
}

/** Effective UI scale (~match “90% zoom” legibility/spacing while browser is at 100%). */
const WALL_VIEWPORT_SCALE = 0.9
const INV_WALL_SCALE = 1 / WALL_VIEWPORT_SCALE

/**
 * Venue lobby wall · ~10 ft reads: large section titles + bounded hero row (no overlaps).
 */
export default function AudienceWelcomeWall({ venueCode, wall }: AudienceWelcomeWallProps) {
  const joinUrl = playerJoinHref()
  const syncingCounts = wall == null
  const lobby = syncingCounts ? null : wall.lobbyPlayerCount
  const atTables = syncingCounts ? null : wall.totalSeatedAtTables
  const enrolled = syncingCounts ? null : (lobby ?? 0) + (atTables ?? 0)
  const [qrOk, setQrOk] = useState(true)

  /** Single literal strings — tailwind JIT must see full arbitrary class sequences. */
  const sectionRibbon =
    'font-black uppercase tracking-[0.22em] text-amber-100/95 text-[clamp(1.15rem,_3.65vmin,_2.05rem)] [text-shadow:0_2px_18px_rgba(0,0,0,.45)]'

  const taglineBrand =
    'font-semibold uppercase tracking-[0.16em] text-emerald-200/95 text-[clamp(1.05rem,_3.05vmin,_1.75rem)]'

  const statRibbon =
    'font-black uppercase tracking-[0.14em] text-white/82 text-[clamp(0.92rem,_2.75vmin,_1.4rem)]'

  const statHint =
    'font-semibold text-white/68 text-[clamp(0.85rem,_2.35vmin,_1.2rem)]'

  const stepCircleClasses =
    'flex shrink-0 items-center justify-center rounded-xl bg-emerald-400 font-black text-emerald-950 shadow-[0_0_22px_rgba(52,211,153,0.32)] h-[clamp(2.35rem,6vmin,3.5rem)] min-w-[clamp(2.35rem,6vmin,3.5rem)] text-[clamp(1rem,3.05vmin,1.55rem)]'

  const stepLine =
    'text-[clamp(1.12rem,3.25vmin,2rem)] font-bold leading-snug text-white [text-shadow:0_2px_12px_rgba(0,0,0,.4)]'

  const footnote =
    'font-semibold leading-snug text-emerald-200/93 text-[clamp(0.9rem,_2.45vmin,_1.35rem)]'

  return (
    <div
      role="main"
      aria-label="Join this Quizz'em game"
      className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#031a17] antialiased text-white selection:bg-yellow-400/35"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/90 via-[#061c24] to-black" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:clamp(44px,5.5vmin,72px)_clamp(44px,5.5vmin,72px)]" />
      </div>

      <motion.div
        style={{
          width: `min(calc(100vw * ${INV_WALL_SCALE}), calc(1580px * ${INV_WALL_SCALE}))`,
          height: `calc(100dvh * ${INV_WALL_SCALE})`,
          transformOrigin: 'top center',
          transform: `translateX(-50%) scale(${WALL_VIEWPORT_SCALE})`,
        }}
        className="absolute left-1/2 top-0 z-10 mx-0 grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-y-[clamp(6px,_1vmin,_14px)] px-[clamp(12px,3.6vmin,48px)] py-[clamp(8px,_1.35vh,20px)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <header className="flex shrink-0 flex-col items-center">
          <div
            className="h-[clamp(46px,min(9.5vh,104px))] w-auto max-w-[min(70vw,620px)] shrink-0"
            style={{ aspectRatio: '1024 / 655' }}
          >
            <QuizzEmWordmark layout="fill" />
          </div>
          <p className={`mt-[clamp(6px,_0.8vmin,_14px)] text-center ${taglineBrand}`}>
            Join tonight&apos;s game
          </p>
        </header>

        {/* Row 2: absorbs overflow; sibling rows never overlap this band */}
        <div className="flex min-h-0 flex-col gap-[clamp(8px,_1.75vmin,_22px)] lg:flex-row lg:items-start lg:justify-between lg:gap-[clamp(10px,_2.5vmin,_32px)]">
            <section
              aria-label="Scan QR to open player app"
              className={`mx-auto flex w-[min(min(44vmin,_40vh),_430px)] max-w-[min(92vw,430px)] shrink-0 flex-col items-center rounded-[clamp(12px,_2vmin,_22px)] border-2 border-emerald-400/55 bg-black/65 p-[clamp(8px,_1.95vmin,_22px)] shadow-[0_0_60px_rgba(34,211,153,0.11)]`}
            >
              <span className={`${sectionRibbon} mb-[clamp(8px,_1.35vmin,_16px)] text-center leading-snug`}>
                Aim camera here
              </span>
              {qrOk ? (
                <div className="w-full rounded-2xl border-2 border-white bg-white p-[clamp(8px,_1.45vmin,_14px)] shadow-xl">
                  <img
                    src={qrImgSrc(joinUrl)}
                    alt=""
                    width={400}
                    height={400}
                    className="block h-auto w-full rounded-md"
                    referrerPolicy="no-referrer"
                    onError={() => setQrOk(false)}
                  />
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-white/35 bg-white/[0.04] px-6 py-10 text-center text-[clamp(1rem,2.6vmin,1.35rem)] font-semibold leading-snug text-amber-200">
                  QR blocked — use the URL beside this scan box
                </div>
              )}
              <span className={`${sectionRibbon} mt-[clamp(8px,_1.35vmin,_16px)] text-center opacity-90`}>
                Opens Player
              </span>
            </section>

            <section className="flex min-h-0 min-w-0 flex-1 flex-col justify-start gap-[clamp(8px,_1.95vmin,_20px)]">
              <div>
                <p className={`text-center lg:text-left ${sectionRibbon} mb-[clamp(8px,_1.2vmin,_12px)]`}>
                  Venue / room code
                </p>
                <div className="rounded-[clamp(10px,_1.6vmin,_20px)] border-[3px] border-yellow-400/85 bg-black/72 px-[clamp(8px,_2vmin,_26px)] py-[clamp(10px,_2.1vmin,_20px)] shadow-[inset_0_0_0_1px_rgba(251,191,36,0.18)]">
                  <div className="text-center font-mono text-[clamp(2.65rem,_13vmin,_7.85rem)] font-black leading-none tracking-[0.08em] text-yellow-400 lg:text-left">
                    {venueCode}
                  </div>
                </div>
              </div>

              <div className="rounded-[clamp(10px,_1.6vmin,_20px)] border-[3px] border-emerald-500/42 bg-emerald-950/38 px-[clamp(8px,_1.95vmin,_24px)] py-[clamp(10px,_1.85vmin,_18px)]">
                <p className={`${sectionRibbon} mb-[clamp(6px,_1.1vmin,_12px)] text-center lg:text-left`}>Player URL</p>
                <p className="break-words font-mono text-[clamp(0.94rem,_3.35vmin,_2.2rem)] font-bold leading-snug tracking-tight text-amber-200">
                  {joinUrl}
                </p>
              </div>

              <ol className="grid shrink-0 gap-[clamp(8px,_2.1vmin,_16px)]">
                <li className="flex items-start gap-[clamp(12px,_2.4vmin,_20px)]">
                  <span className={stepCircleClasses}>1</span>
                  <span className={`${stepLine} pt-[0.35vmin]`}>
                    Open <strong className="text-amber-200">Player</strong> — scan the QR or type the URL.
                  </span>
                </li>
                <li className="flex items-start gap-[clamp(12px,_2.4vmin,_20px)]">
                  <span className={stepCircleClasses}>2</span>
                  <span className={`${stepLine} pt-[0.35vmin]`}>
                    Code{' '}
                    <strong className="rounded-md bg-yellow-400/25 px-[0.35em] font-mono text-yellow-200">{venueCode}</strong>
                    {' — then '}
                    <strong className="text-emerald-300">Join Game</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-[clamp(12px,_2.4vmin,_20px)]">
                  <span className={stepCircleClasses}>3</span>
                  <span className={`${stepLine} pt-[0.35vmin]`}>
                    Keep <strong className="text-emerald-300">Lobby</strong> on unless your host assigns a table number.
                  </span>
                </li>
              </ol>
            </section>
        </div>

        <section
          aria-label="Attendance"
          className="grid shrink-0 grid-cols-3 gap-[clamp(8px,_1.95vmin,_18px)]"
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
              className={`rounded-[clamp(10px,_1.5vmin,_18px)] border-2 px-[clamp(8px,_1.65vmin,_14px)] py-[clamp(10px,_1.95vmin,_18px)] text-center backdrop-blur-sm ${
                accent ? 'border-yellow-500/50 bg-yellow-950/34' : 'border-white/16 bg-black/56'
              }`}
            >
              <div className={statRibbon}>{label}</div>
              <div
                className={`py-[clamp(6px,_1.35vmin,_12px)] font-mono tabular-nums tracking-tight ${
                  accent
                    ? 'text-[clamp(2.45rem,_10.25vmin,_6.55rem)] font-black text-yellow-300'
                    : 'text-[clamp(2.45rem,_10.25vmin,_6.55rem)] font-black text-white'
                }`}
              >
                {v}
              </div>
              <div className={statHint}>{hint}</div>
            </div>
          ))}
        </section>

        <p className={`shrink-0 text-center ${footnote}`}>
          Digit-card trivia with Hold&apos;em-style wagering — <span className="text-white">host runs the pace</span>. Wall
          shows all tables when they tap <strong className="text-white">Start Game</strong>.
        </p>
      </motion.div>
    </div>
  )
}
