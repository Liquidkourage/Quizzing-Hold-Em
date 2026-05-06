import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
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
 * Venue lobby / join wall: stacks below ~1280px width; three-column hero on xl+.
 * Uses grid `min-w-0`, fluid type, and capped QR height so 720p-class and 4K TVs stay readable.
 */
export default function AudienceWelcomeWall({ venueCode, wall }: AudienceWelcomeWallProps) {
  const joinUrl = playerJoinHref()
  const syncingCounts = wall == null
  const lobby = syncingCounts ? null : wall.lobbyPlayerCount
  const atTables = syncingCounts ? null : wall.totalSeatedAtTables
  const enrolled = syncingCounts ? null : (lobby ?? 0) + (atTables ?? 0)
  const [qrOk, setQrOk] = useState(true)
  const reducedMotion = useReducedMotion()

  /** Single literal strings — tailwind JIT must see full arbitrary class sequences.
   *  Prefer vw over vmin for headline sizes so zooming the browser scales more predictably
   *  (vmin balloons when the window is tall and crowded the vertical rhythm). */
  /** `min-w-0` + wrapping so wide tracking / long words cannot blow past grid tracks */
  const sectionRibbon =
    'min-w-0 font-black uppercase tracking-[0.2em] text-amber-50/95 break-words text-balance whitespace-normal text-[clamp(1.05rem,min(3.95vw,_3vh),_2.5rem)] [text-shadow:0_0_28px_rgba(251,191,36,0.28),0_3px_18px_rgba(0,0,0,.65)]'

  const taglineBrand =
    'min-w-0 break-words text-balance font-semibold uppercase tracking-[0.22em] text-amber-50 text-[clamp(1rem,min(3.55vw,_2.85vh),_2.2rem)] [text-shadow:0_0_22px_rgba(253,224,138,0.5),0_0_52px_rgba(234,179,8,0.22),0_2px_6px_rgba(0,0,0,.9)]'

  const statRibbon =
    'min-w-0 break-words text-balance font-black tracking-[0.13em] text-[clamp(1.05rem,min(3.35vw,_2.85vh),_2.22rem)] uppercase text-rose-50/92 [text-shadow:0_0_18px_rgba(251,113,133,0.18),0_2px_8px_rgba(0,0,0,.6)]'

  const statHint =
    'min-w-0 break-words text-balance font-semibold text-white/72 text-[clamp(1.05rem,min(2.72vw,_2.4vh),_1.92rem)]'

  const stepCircleClasses =
    'flex shrink-0 items-center justify-center rounded-lg border-2 border-amber-400/55 bg-emerald-500 font-black text-emerald-950 shadow-[0_0_22px_rgba(234,179,8,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] ring-2 ring-yellow-600/35 h-[clamp(2.28rem,_5.35vw,_3.92rem)] min-w-[clamp(2.28rem,_5.35vw,_3.92rem)] text-[clamp(0.98rem,_2.75vw,_1.52rem)]'

  /** Rules column — compact so three steps (+ optional scrollbar) avoid clipping the hero row */
  const stepLine =
    'min-w-0 break-words hyphens-auto text-[clamp(0.98rem,min(2.35vw,_2.1vh),_1.82rem)] font-bold leading-snug text-white [text-shadow:0_2px_12px_rgba(0,0,0,.4)]'

  /** “How to join” heading — keep below QR/join ribbon scale so the column packs */
  const stepsHeading =
    'min-w-0 break-words text-balance font-black uppercase tracking-[0.19em] text-amber-50/96 text-[clamp(1.05rem,min(2.92vw,_2.6vh),_1.92rem)] [text-shadow:0_0_20px_rgba(251,191,36,0.35),0_3px_18px_rgba(0,0,0,.55)]'

  const footnote =
    'font-semibold leading-snug text-emerald-100/88 text-[clamp(0.92rem,min(2.72vw,_2.35vh),_2.02rem)] [text-shadow:0_2px_12px_rgba(0,0,0,.55)]'

  /** Room code — vw + capped vh so short codes stay compact in the box without ultra-wide bars. */
  const venueMono =
    'max-w-full break-all text-center font-mono font-black leading-none tracking-[0.06em] text-[clamp(1.75rem,min(9vw,min(10vh,_3.75rem)),_5.25rem)] uppercase text-transparent bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-600 bg-clip-text [-webkit-background-clip:text] [filter:drop-shadow(0_2px_4px_rgba(0,0,0,.9))]'

  /** Venue code repeated in rules — bounded to step line scale so column height doesn’t blow out. */
  const venueCodeInline =
    'rounded bg-yellow-400/28 px-[0.3em] py-[0.05em] font-mono font-bold text-yellow-200 text-[clamp(1rem,_min(2.95vw,_3.75vh),_1.82rem)]'

  /** Join card URL line — larger than body mono for wall distance reading. */
  const joinUrlText =
    'break-words text-center font-mono font-bold leading-snug tracking-tight text-amber-200 text-[clamp(1.08rem,_min(3vw,_3.35vh),_2.35rem)]'

  return (
    <div
      role="main"
      aria-label="Join this Quizz'em game"
      className="relative h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[#05030c] antialiased text-white selection:bg-yellow-400/35"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Base felt + velvet house lights */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/80 via-[#061914] to-black" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-purple-950/45" />
        {/* Gold chandeliers — twin pools */}
        <motion.div
          className="absolute -left-[8%] -top-[28%] h-[72vmin] w-[72vmin] rounded-full blur-[72px]"
          aria-hidden
          style={{
            background: 'radial-gradient(circle,rgba(250,230,154,0.32)_0%,rgba(251,191,36,0.06)_42%,transparent_70%)',
          }}
          animate={reducedMotion ? undefined : { opacity: [0.14, 0.26, 0.14] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-[12%] -top-[22%] h-[62vmin] w-[62vmin] rounded-full blur-[64px]"
          aria-hidden
          style={{
            background: 'radial-gradient(circle,rgba(251,218,146,0.26)_0%,rgba(234,179,8,0.05)_46%,transparent_72%)',
          }}
          animate={reducedMotion ? undefined : { opacity: [0.1, 0.22, 0.1] }}
          transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        />
        {/* Felt weave */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:clamp(44px,5.5vmin,72px)_clamp(44px,5.5vmin,72px)] opacity-95" />
        {/* Red ramp light (subtle stakes) */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            background: 'radial-gradient(ellipse 90% 60% at 50% 100%,rgba(239,68,68,0.35)_0%,transparent 55%)',
          }}
        />
        {/* Cinema vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 78% 70% at 50% 45%,transparent 25%,rgba(0,0,0,0.55)_76%,rgba(0,0,0,0.92)_100%)',
          }}
        />
      </div>

      <motion.div
        className="relative z-10 mx-auto grid min-h-0 min-w-0 h-full max-h-none w-full max-w-none grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-y-[clamp(4px,_0.85vmin,_10px)] px-[clamp(14px,_2.85vw,_96px)] py-[clamp(6px,_1vh,_16px)] [@media(max-height:720px)]:gap-y-1 [@media(max-height:720px)]:py-1 [@media(max-height:720px)]:px-3 [@media(min-width:1920px)]:px-[clamp(96px,_5vw,_160px)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <header className="flex w-full max-w-full min-w-0 shrink-0 flex-col items-center px-[clamp(4px,_0.75vw,_14px)]">
          <div
            className="h-[clamp(32px,_7vmin,_82px)] w-auto max-w-[min(885px,_92vw)] shrink-0 [@media(max-height:720px)]:max-h-[9vh]"
            style={{ aspectRatio: '1024 / 655' }}
          >
            <QuizzEmWordmark layout="fill" />
          </div>
          <p className={`mt-[clamp(6px,_0.8vmin,_14px)] text-center ${taglineBrand}`}>
            Join tonight&apos;s game
          </p>
          <div className="mt-[clamp(6px,_0.75vmin,_12px)] h-[3px] w-[min(88%,760px)] shrink-0 rounded-full bg-gradient-to-r from-transparent via-amber-300/85 to-transparent shadow-[0_0_28px_rgba(251,191,36,0.45)]" />
        </header>

        {/* Row 2: [QR · join · rules]; wide 3-column only from xl (~1280px) so 720-class widths stack */}
        <div className="min-h-0 min-w-0">
          <div className="grid h-full min-h-0 min-w-0 grid-cols-1 gap-x-[clamp(12px,min(2.25vw,_28px),_40px)] gap-y-[clamp(12px,min(1.85vmin,_20px),_22px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] xl:items-stretch">
            <section
              aria-label="Scan QR to open player app"
              className={`flex h-full min-h-0 min-w-0 w-full max-w-full flex-col justify-self-center xl:justify-self-end rounded-[clamp(12px,_2vmin,_22px)] border-2 border-amber-400/45 bg-black/72 p-[clamp(8px,min(1.95vmin,_20px),_20px)] shadow-[inset_0_0_0_1px_rgba(251,211,141,0.12),0_0_52px_rgba(34,197,94,0.14),0_0_72px_rgba(234,179,8,0.08)] ring-2 ring-yellow-900/55`}
            >
              <span className={`${sectionRibbon} mb-[clamp(6px,_1vmin,_14px)] shrink-0 text-center leading-snug`}>
                Aim camera here
              </span>
              {qrOk ? (
                <div className="flex min-h-0 min-w-0 w-full flex-1 justify-center px-px">
                  <div className="box-border flex h-full max-h-[min(46dvh,min(520px,_55vw))] min-h-[120px] w-full max-w-[min(100%,min(48vw,_46dvh))] min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-amber-200/95 bg-white p-[clamp(6px,min(1.2vmin,_12px),_12px)] shadow-[inset_0_0_0_1px_rgba(254,249,231,0.9),0_24px_60px_-12px_rgba(234,179,8,0.35)] xl:max-h-[min(48dvh,min(560px,_50vw))]">
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
              className="mx-auto w-full min-w-0 max-w-full justify-self-center rounded-[clamp(10px,min(1.6vmin,_20px),_20px)] border-[3px] border-amber-500/55 bg-black/76 shadow-[inset_0_0_24px_-8px_rgba(234,179,8,0.12),0_0_48px_-6px_rgba(52,211,153,0.18)] ring-2 ring-purple-950/85 xl:mx-0 xl:max-w-[min(100%,38rem)]"
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
                <motion.div
                  className="inline-block w-max max-w-full rounded-[clamp(8px,_1.35vmin,_14px)] border-[3px] border-amber-300/95 bg-black/82 px-[clamp(8px,_1.5vmin,_18px)] py-[clamp(6px,_1.35vmin,_14px)]"
                  animate={
                    reducedMotion
                      ? undefined
                      : {
                          boxShadow: [
                            '0 0 16px rgba(234,179,8,0.28), inset 0 0 0 1px rgba(251,211,141,0.18)',
                            '0 0 34px rgba(234,179,8,0.48), inset 0 0 0 1px rgba(253,246,178,0.28)',
                            '0 0 16px rgba(234,179,8,0.28), inset 0 0 0 1px rgba(251,211,141,0.18)',
                          ],
                        }
                  }
                  transition={{ duration: 2.85, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className={venueMono}>{venueCode}</div>
                </motion.div>
              </div>
            </section>

            <div className="flex min-h-0 min-w-0 w-full max-w-full flex-col justify-self-center overflow-x-hidden overflow-y-auto rounded-[clamp(12px,_1.6vmin,_18px)] border border-yellow-900/55 bg-black/45 px-[clamp(8px,_1.35vmin,_16px)] py-[clamp(8px,_1.2vmin,_14px)] shadow-[inset_0_0_32px_-12px_rgba(251,191,36,0.07)] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.25)_transparent] xl:max-w-[min(100%,42rem)] xl:justify-self-start xl:rounded-none xl:border-0 xl:bg-transparent xl:px-0 xl:py-0 xl:pr-0.5 xl:shadow-none [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25">
              <h2 id="join-steps-title" className={`${stepsHeading} mb-[clamp(3px,_0.65vmin,_7px)] text-left leading-tight`}>
                How to join
              </h2>
              <ol className="grid shrink-0 gap-[clamp(4px,_1.05vmin,_9px)]" aria-labelledby="join-steps-title">
                <li className="flex items-start gap-[clamp(9px,_1.68vw,_16px)]">
                  <span className={stepCircleClasses}>1</span>
                  <span className={`${stepLine} pt-[0.06em]`}>
                    Open <strong className="text-amber-200">Player</strong> — use the <strong className="text-amber-200">URL on this screen</strong>, or scan the QR.
                  </span>
                </li>
                <li className="flex items-start gap-[clamp(9px,_1.68vw,_16px)]">
                  <span className={stepCircleClasses}>2</span>
                  <span className={`${stepLine} pt-[0.06em]`}>
                    Enter <strong className="text-yellow-300">venue code</strong>{' '}
                    <strong className={venueCodeInline}>{venueCode}</strong>
                    {' — then '}
                    <strong className="text-emerald-300">Join Game</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-[clamp(9px,_1.68vw,_16px)]">
                  <span className={stepCircleClasses}>3</span>
                  <span className={`${stepLine} pt-[0.06em]`}>
                    Keep <strong className="text-emerald-300">Lobby</strong> on unless your host assigns a table number.
                  </span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        <section
          aria-label="Attendance"
          className="grid min-h-0 min-w-0 shrink-0 grid-cols-1 gap-[clamp(8px,min(1.5vw,_18px),_20px)] xl:grid-cols-3"
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
              className={`min-h-0 min-w-0 rounded-[clamp(10px,min(1.5vmin,_18px),_18px)] border-2 px-[clamp(6px,min(1.35vmin,_14px),_14px)] py-[clamp(6px,min(1.65vmin,_16px),_16px)] text-center backdrop-blur-sm ${
                accent
                  ? 'border-yellow-400/70 bg-gradient-to-br from-yellow-950/55 via-red-950/40 to-purple-950/45 shadow-[0_0_40px_-4px_rgba(234,179,8,0.35),inset_0_1px_0_rgba(254,249,231,0.12)] ring-2 ring-yellow-600/35'
                  : 'border-white/18 bg-black/58 shadow-[inset_0_0_24px_-10px_rgba(251,191,36,0.06)]'
              }`}
            >
              <div className={statRibbon}>{label}</div>
              <div
                className={`py-[clamp(4px,min(1.1vmin,_10px),_10px)] font-mono tabular-nums tracking-tight leading-none ${
                  accent
                    ? 'text-[clamp(1.75rem,min(10vw,min(12vmin,_10dvh)),_6.5rem)] font-black text-yellow-300 [text-shadow:0_0_28px_rgba(253,224,138,0.45),0_2px_4px_rgba(0,0,0,.9)]'
                    : 'text-[clamp(1.75rem,min(10vw,min(12vmin,_10dvh)),_6.5rem)] font-black text-white'
                }`}
              >
                {v}
              </div>
              <div className={statHint}>{hint}</div>
            </div>
          ))}
        </section>

        <p className={`shrink-0 min-w-0 text-center hyphens-auto break-words px-1 ${footnote}`}>
          Digit-card trivia with Hold&apos;em-style wagering —{' '}
          <span className="font-semibold text-amber-100/95 [text-shadow:0_0_18px_rgba(251,191,36,0.25)]">host runs the pace</span>.
          Wall shows all tables when they tap{' '}
          <strong className="font-bold text-yellow-300 [text-shadow:0_0_22px_rgba(234,179,8,0.45)]">Start Game</strong>.
        </p>
      </motion.div>
    </div>
  )
}
