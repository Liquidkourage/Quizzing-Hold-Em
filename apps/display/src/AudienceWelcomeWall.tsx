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

/** Request a larger QR raster so it stays sharp when the column scales up on wide TVs. */
function qrImgSrc(joinUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=9&data=${encodeURIComponent(joinUrl)}`
}

/**
 * Venue lobby wall (widescreen-only): full-bleed width; content scales with vw/vmin for bar visibility.
 */
export default function AudienceWelcomeWall({ venueCode, wall }: AudienceWelcomeWallProps) {
  const joinUrl = playerJoinHref()
  const syncingCounts = wall == null
  const lobby = syncingCounts ? null : wall.lobbyPlayerCount
  const atTables = syncingCounts ? null : wall.totalSeatedAtTables
  const enrolled = syncingCounts ? null : (lobby ?? 0) + (atTables ?? 0)
  const [qrOk, setQrOk] = useState(true)

  /** Single literal strings — tailwind JIT must see full arbitrary class sequences.
   *  Prefer vw over vmin for headline sizes so zooming the browser scales more predictably
   *  (vmin balloons when the window is tall and crowded the vertical rhythm). */
  const sectionRibbon =
    'font-black uppercase tracking-[0.22em] text-amber-100/95 text-[clamp(1.05rem,_2.85vw,_1.65rem)] [text-shadow:0_2px_18px_rgba(0,0,0,.45)]'

  const taglineBrand =
    'font-semibold uppercase tracking-[0.16em] text-emerald-200/95 text-[clamp(1rem,_2.35vw,_1.5rem)]'

  const statRibbon =
    'font-black uppercase tracking-[0.14em] text-white/82 text-[clamp(0.85rem,_1.95vw,_1.22rem)]'

  const statHint =
    'font-semibold text-white/68 text-[clamp(0.8rem,_1.65vw,_1.1rem)]'

  const stepCircleClasses =
    'flex shrink-0 items-center justify-center rounded-xl bg-emerald-400 font-black text-emerald-950 shadow-[0_0_22px_rgba(52,211,153,0.32)] h-[clamp(2.1rem,4.25vw,3.2rem)] min-w-[clamp(2.1rem,4.25vw,3.2rem)] text-[clamp(0.95rem,_2.4vw,_1.35rem)]'

  const stepLine =
    'text-[clamp(1rem,_2.05vw,_1.65rem)] font-bold leading-snug text-white [text-shadow:0_2px_12px_rgba(0,0,0,.4)]'

  const footnote =
    'font-semibold leading-snug text-emerald-200/93 text-[clamp(0.82rem,_1.65vw,_1.15rem)]'

  /** Room code — vw + capped vh so short codes stay compact in the box without ultra-wide bars. */
  const venueMono =
    'text-left font-mono font-black leading-none tracking-[0.08em] text-yellow-400 text-[clamp(2.25rem,_min(11vw,_12vh),_5.5rem)]'

  return (
    <div
      role="main"
      aria-label="Join this Quizz'em game"
      className="relative h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-hidden bg-[#031a17] antialiased text-white selection:bg-yellow-400/35"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/90 via-[#061c24] to-black" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:clamp(44px,5.5vmin,72px)_clamp(44px,5.5vmin,72px)]" />
      </div>

      <motion.div
        className="relative z-10 mx-auto grid h-full min-h-0 w-full max-w-none grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-y-[clamp(4px,_0.85vmin,_10px)] px-[clamp(12px,_2.75vw,_80px)] py-[clamp(6px,_1vh,_16px)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <header className="flex shrink-0 flex-col items-center">
          <div
            className="h-[clamp(46px,min(9.5vh,104px))] w-auto max-w-[min(1100px,_58vw)] shrink-0"
            style={{ aspectRatio: '1024 / 655' }}
          >
            <QuizzEmWordmark layout="fill" />
          </div>
          <p className={`mt-[clamp(6px,_0.8vmin,_14px)] text-center ${taglineBrand}`}>
            Join tonight&apos;s game
          </p>
        </header>

        {/* Row 2: QR + join info — xl splits code/URL row to avoid metre-wide bordered boxes */}
        <div className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable] lg:overscroll-contain">
          <div className="grid min-w-0 grid-cols-1 gap-x-[clamp(16px,_3vw,_56px)] gap-y-[clamp(12px,_1.85vmin,_20px)] lg:grid-cols-[minmax(240px,_min(32vw,_40vh))_minmax(0,1fr)] lg:items-start">
            <section
              aria-label="Scan QR to open player app"
              className={`flex w-full flex-col items-center rounded-[clamp(12px,_2vmin,_22px)] border-2 border-emerald-400/55 bg-black/65 p-[clamp(8px,_1.95vmin,_20px)] shadow-[0_0_60px_rgba(34,211,153,0.11)] lg:sticky lg:top-0 lg:justify-self-start`}
            >
              <span className={`${sectionRibbon} mb-[clamp(8px,_1.35vmin,_16px)] text-center leading-snug`}>
                Aim camera here
              </span>
              {qrOk ? (
                <div className="w-full rounded-2xl border-2 border-white bg-white p-[clamp(8px,_1.45vmin,_14px)] shadow-xl">
                  <img
                    src={qrImgSrc(joinUrl)}
                    alt=""
                    width={520}
                    height={520}
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

            <div className="flex min-h-0 min-w-0 flex-col gap-[clamp(8px,_1.35vmin,_14px)]">
              <div className="grid min-w-0 grid-cols-1 gap-[clamp(10px,_1.5vw,_20px)] lg:grid-cols-2 lg:items-start">
                <div className="min-w-0">
                  <p className={`text-left ${sectionRibbon} mb-[clamp(6px,_1vmin,_10px)]`}>Venue / room code</p>
                  <div className="inline-block w-max max-w-full rounded-[clamp(10px,_1.6vmin,_18px)] border-[3px] border-yellow-400/85 bg-black/72 px-[clamp(8px,_1.6vmin,_20px)] py-[clamp(8px,_1.6vmin,_16px)] shadow-[inset_0_0_0_1px_rgba(251,191,36,0.18)]">
                    <div className={venueMono}>{venueCode}</div>
                  </div>
                </div>

                <div className="min-w-0 rounded-[clamp(10px,_1.6vmin,_18px)] border-[3px] border-emerald-500/42 bg-emerald-950/38 px-[clamp(8px,_1.5vmin,_20px)] py-[clamp(8px,_1.5vmin,_16px)]">
                  <p className={`${sectionRibbon} mb-[clamp(6px,_0.9vmin,_10px)] text-left`}>Player URL</p>
                  <p className="break-all font-mono text-[clamp(0.88rem,_min(2.15vw,_2.6vh),_1.55rem)] font-bold leading-snug tracking-tight text-amber-200">
                    {joinUrl}
                  </p>
                </div>
              </div>

              <ol className="grid shrink-0 gap-[clamp(6px,_1.35vmin,_12px)]">
                <li className="flex items-start gap-[clamp(10px,_1.75vw,_18px)]">
                  <span className={stepCircleClasses}>1</span>
                  <span className={`${stepLine} pt-[0.2em]`}>
                    Open <strong className="text-amber-200">Player</strong> — scan the QR or type the URL.
                  </span>
                </li>
                <li className="flex items-start gap-[clamp(10px,_1.75vw,_18px)]">
                  <span className={stepCircleClasses}>2</span>
                  <span className={`${stepLine} pt-[0.2em]`}>
                    Code{' '}
                    <strong className="rounded-md bg-yellow-400/25 px-[0.35em] font-mono text-yellow-200">{venueCode}</strong>
                    {' — then '}
                    <strong className="text-emerald-300">Join Game</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-[clamp(10px,_1.75vw,_18px)]">
                  <span className={stepCircleClasses}>3</span>
                  <span className={`${stepLine} pt-[0.2em]`}>
                    Keep <strong className="text-emerald-300">Lobby</strong> on unless your host assigns a table number.
                  </span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        <section
          aria-label="Attendance"
          className="grid shrink-0 grid-cols-3 gap-[clamp(6px,_1.5vw,_16px)]"
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
              className={`rounded-[clamp(10px,_1.5vmin,_18px)] border-2 px-[clamp(8px,_1.35vmin,_14px)] py-[clamp(8px,_1.65vmin,_16px)] text-center backdrop-blur-sm ${
                accent ? 'border-yellow-500/50 bg-yellow-950/34' : 'border-white/16 bg-black/56'
              }`}
            >
              <div className={statRibbon}>{label}</div>
              <div
                className={`py-[clamp(4px,_1.1vmin,_10px)] font-mono tabular-nums tracking-tight ${
                  accent
                    ? 'text-[clamp(1.55rem,_min(7vw,_8vh),_4.15rem)] font-black text-yellow-300'
                    : 'text-[clamp(1.55rem,_min(7vw,_8vh),_4.15rem)] font-black text-white'
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
