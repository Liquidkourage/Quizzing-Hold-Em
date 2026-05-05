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
    'font-black uppercase tracking-[0.2em] text-amber-100/95 text-[clamp(1.45rem,_3.95vw,_2.5rem)] [text-shadow:0_3px_22px_rgba(0,0,0,.5)]'

  const taglineBrand =
    'font-semibold uppercase tracking-[0.16em] text-emerald-200/95 text-[clamp(1.35rem,_3.55vw,_2.2rem)]'

  const statRibbon =
    'font-black uppercase tracking-[0.13em] text-white/82 text-[clamp(1.12rem,_2.85vw,_1.92rem)]'

  const statHint =
    'font-semibold text-white/68 text-[clamp(1.02rem,_2.35vw,_1.65rem)]'

  const stepCircleClasses =
    'flex shrink-0 items-center justify-center rounded-xl bg-emerald-400 font-black text-emerald-950 shadow-[0_0_28px_rgba(52,211,153,0.36)] h-[clamp(2.95rem,_6.85vw,_4.95rem)] min-w-[clamp(2.95rem,_6.85vw,_4.95rem)] text-[clamp(1.3rem,_3.55vw,_1.98rem)]'

  const stepLine =
    'text-[clamp(1.42rem,_3.05vw,_2.45rem)] font-bold leading-snug text-white [text-shadow:0_2px_14px_rgba(0,0,0,.45)]'

  const footnote =
    'font-semibold leading-snug text-emerald-200/93 text-[clamp(1.05rem,_2.35vw,_1.72rem)]'

  /** Room code — vw + capped vh so short codes stay compact in the box without ultra-wide bars. */
  const venueMono =
    'text-center font-mono font-black leading-none tracking-[0.08em] text-yellow-400 text-[clamp(2.25rem,_min(11vw,_12vh),_5.5rem)]'

  /** Venue code in steps row — same optical size as main chip, not step-line scale. */
  const venueCodeInline =
    'rounded-md bg-yellow-400/25 px-[0.35em] font-mono font-black text-yellow-200 text-[clamp(2.25rem,_min(11vw,_12vh),_5.5rem)]'

  /** Join card URL line — larger than body mono for wall distance reading. */
  const joinUrlText =
    'break-words text-center font-mono font-bold leading-snug tracking-tight text-amber-200 text-[clamp(1.08rem,_min(3vw,_3.35vh),_2.35rem)]'

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
            className="h-[clamp(39px,min(8.075vh,88px))] w-auto max-w-[min(935px,_49.3vw)] shrink-0"
            style={{ aspectRatio: '1024 / 655' }}
          >
            <QuizzEmWordmark layout="fill" />
          </div>
          <p className={`mt-[clamp(6px,_0.8vmin,_14px)] text-center ${taglineBrand}`}>
            Join tonight&apos;s game
          </p>
        </header>

        {/* Row 2: [QR · join card centered under logo · rules] */}
        <div className="min-h-0 min-w-0">
          <div className="grid h-full min-h-0 grid-cols-1 gap-x-[clamp(12px,_2.25vw,_40px)] gap-y-[clamp(12px,_1.85vmin,_20px)] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
            <section
              aria-label="Scan QR to open player app"
              className={`flex h-full min-h-0 w-full max-w-[min(100%,_min(34vw,_40vh))] flex-col justify-self-center rounded-[clamp(12px,_2vmin,_22px)] border-2 border-emerald-400/55 bg-black/65 p-[clamp(8px,_1.95vmin,_20px)] shadow-[0_0_60px_rgba(34,211,153,0.11)] lg:justify-self-end`}
            >
              <span className={`${sectionRibbon} mb-[clamp(6px,_1vmin,_14px)] shrink-0 text-center leading-snug`}>
                Aim camera here
              </span>
              {qrOk ? (
                <div className="flex min-h-0 w-full flex-1 justify-center px-px">
                  <div className="box-border flex h-full min-h-0 w-full max-w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-white p-[clamp(6px,_1.2vmin,_12px)] shadow-xl">
                    <img
                      src={qrImgSrc(joinUrl)}
                      alt=""
                      width={520}
                      height={520}
                      className="block h-auto max-h-full w-auto max-w-full rounded-md object-contain"
                      referrerPolicy="no-referrer"
                      onError={() => setQrOk(false)}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 items-center rounded-xl border-2 border-dashed border-white/35 bg-white/[0.04] px-6 py-10 text-center text-[clamp(1.38rem,_3.85vmin,_1.92rem)] font-semibold leading-snug text-amber-200">
                  QR blocked — check the centered join card for the URL and code.
                </div>
              )}
              <span className={`${sectionRibbon} mt-[clamp(6px,_1vmin,_14px)] shrink-0 text-center opacity-90`}>
                Opens Player
              </span>
            </section>

            <section
              aria-label="Player URL then venue room code"
              className="mx-auto w-full min-w-0 max-w-[min(100%,38rem)] justify-self-center rounded-[clamp(10px,_1.6vmin,_20px)] border-[3px] border-emerald-500/45 bg-black/72 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.12)] lg:mx-0"
            >
              <div className="px-[clamp(8px,_1.6vmin,_22px)] pb-[clamp(8px,_1.25vmin,_14px)] pt-[clamp(10px,_1.8vmin,_18px)] text-center">
                <p className={`${sectionRibbon} mb-[clamp(6px,_0.9vmin,_10px)] text-center`}>Player URL</p>
                <p className={joinUrlText}>{joinUrl}</p>
              </div>
              <div
                aria-hidden
                className="mx-[clamp(8px,_1.5vmin,_18px)] border-t border-dashed border-white/18"
              />
              <div className="flex flex-col items-center px-[clamp(8px,_1.6vmin,_22px)] pb-[clamp(10px,_1.8vmin,_18px)] pt-[clamp(8px,_1.35vmin,_14px)] text-center">
                <p className={`${sectionRibbon} mb-[clamp(6px,_0.95vmin,_10px)] text-center opacity-95`}>Venue / room code</p>
                <div className="inline-block w-max max-w-full rounded-[clamp(8px,_1.35vmin,_14px)] border-[3px] border-yellow-400/85 bg-black/80 px-[clamp(8px,_1.5vmin,_18px)] py-[clamp(6px,_1.35vmin,_14px)] shadow-[inset_0_0_0_1px_rgba(251,191,36,0.16)]">
                  <div className={venueMono}>{venueCode}</div>
                </div>
              </div>
            </section>

            <div className="flex min-h-0 min-w-0 w-full flex-col justify-self-center overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] lg:max-w-[min(100%,42rem)] lg:justify-self-start lg:overscroll-contain lg:pb-px lg:pl-px lg:pr-1">
              <h2 id="join-steps-title" className={`${sectionRibbon} mb-[clamp(6px,_0.95vmin,_10px)] text-left`}>
                How to join
              </h2>
              <ol className="grid shrink-0 gap-[clamp(6px,_1.35vmin,_12px)]" aria-labelledby="join-steps-title">
                <li className="flex items-start gap-[clamp(12px,_2.2vw,_24px)]">
                  <span className={stepCircleClasses}>1</span>
                  <span className={`${stepLine} pt-[0.2em]`}>
                    Open <strong className="text-amber-200">Player</strong> — use the <strong className="text-amber-200">URL on this screen</strong>, or scan the QR.
                  </span>
                </li>
                <li className="flex items-start gap-[clamp(12px,_2.2vw,_24px)]">
                  <span className={stepCircleClasses}>2</span>
                  <span className={`${stepLine} pt-[0.2em]`}>
                    Enter <strong className="text-yellow-300">venue code</strong>{' '}
                    <strong className={venueCodeInline}>{venueCode}</strong>
                    {' — then '}
                    <strong className="text-emerald-300">Join Game</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-[clamp(12px,_2.2vw,_24px)]">
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
                    ? 'text-[clamp(2.05rem,_min(9.5vw,_11.5vh),_5.85rem)] font-black text-yellow-300'
                    : 'text-[clamp(2.05rem,_min(9.5vw,_11.5vh),_5.85rem)] font-black text-white'
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
