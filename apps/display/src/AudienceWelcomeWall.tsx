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

  /** Single literal strings — tailwind JIT must see full arbitrary class sequences.
   *  Prefer vw over vmin for headline sizes so zooming the browser scales more predictably
   *  (vmin balloons when the window is tall and crowded the vertical rhythm). */
  /** `min-w-0` + wrapping so wide tracking / long words cannot blow past grid tracks */
  const sectionRibbon =
    'min-w-0 font-black uppercase tracking-[0.2em] text-amber-100/95 break-words text-balance whitespace-normal text-[clamp(1.05rem,min(3.95vw,_3vh),_2.5rem)] [text-shadow:0_3px_22px_rgba(0,0,0,.5)]'

  const taglineBrand =
    'min-w-0 break-words text-balance font-semibold uppercase tracking-[0.16em] text-emerald-200/95 text-[clamp(1rem,min(3.55vw,_2.85vh),_2.2rem)]'

  const statRibbon =
    'min-w-0 break-words text-balance font-black uppercase tracking-[0.13em] text-white/82 text-[clamp(1.05rem,min(3.35vw,_2.85vh),_2.22rem)]'

  const statHint =
    'min-w-0 break-words text-balance font-semibold text-white/68 text-[clamp(1.05rem,min(2.72vw,_2.4vh),_1.92rem)]'

  const stepCircleClasses =
    'flex shrink-0 items-center justify-center rounded-lg bg-emerald-400 font-black text-emerald-950 shadow-[0_0_20px_rgba(52,211,153,0.32)] h-[clamp(2.28rem,_5.35vw,_3.92rem)] min-w-[clamp(2.28rem,_5.35vw,_3.92rem)] text-[clamp(0.98rem,_2.75vw,_1.52rem)]'

  /** Rules column — compact so three steps (+ optional scrollbar) avoid clipping the hero row */
  const stepLine =
    'min-w-0 break-words hyphens-auto text-[clamp(0.98rem,min(2.35vw,_2.1vh),_1.82rem)] font-bold leading-snug text-white [text-shadow:0_2px_12px_rgba(0,0,0,.4)]'

  /** “How to join” heading — keep below QR/join ribbon scale so the column packs */
  const stepsHeading =
    'min-w-0 break-words text-balance font-black uppercase tracking-[0.19em] text-amber-100/95 text-[clamp(1.05rem,min(2.92vw,_2.6vh),_1.92rem)] [text-shadow:0_3px_18px_rgba(0,0,0,.48)]'

  const footnote =
    'font-semibold leading-snug text-emerald-200/93 text-[clamp(0.92rem,min(2.72vw,_2.35vh),_2.02rem)]'

  /** Room code — vw + capped vh so short codes stay compact in the box without ultra-wide bars. */
  const venueMono =
    'max-w-full break-all text-center font-mono font-black leading-none tracking-[0.06em] text-yellow-400 text-[clamp(1.75rem,min(9vw,min(10vh,_3.75rem)),_5.25rem)]'

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
      className="relative h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[#031a17] antialiased text-white selection:bg-yellow-400/35"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/90 via-[#061c24] to-black" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:clamp(44px,5.5vmin,72px)_clamp(44px,5.5vmin,72px)]" />
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
        </header>

        {/* Row 2: [QR · join · rules]; wide 3-column only from xl (~1280px) so 720-class widths stack */}
        <div className="min-h-0 min-w-0">
          <div className="grid h-full min-h-0 min-w-0 grid-cols-1 gap-x-[clamp(12px,min(2.25vw,_28px),_40px)] gap-y-[clamp(12px,min(1.85vmin,_20px),_22px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] xl:items-stretch">
            <section
              aria-label="Scan QR to open player app"
              className={`flex h-full min-h-0 min-w-0 w-full max-w-full flex-col justify-self-center xl:justify-self-end rounded-[clamp(12px,_2vmin,_22px)] border-2 border-emerald-400/55 bg-black/65 p-[clamp(8px,min(1.95vmin,_20px),_20px)] shadow-[0_0_60px_rgba(34,211,153,0.11)]`}
            >
              <span className={`${sectionRibbon} mb-[clamp(6px,_1vmin,_14px)] shrink-0 text-center leading-snug`}>
                Aim camera here
              </span>
              {qrOk ? (
                <div className="flex min-h-0 min-w-0 w-full flex-1 justify-center px-px">
                  <div className="box-border flex h-full max-h-[min(46dvh,min(520px,_55vw))] min-h-[120px] w-full max-w-[min(100%,min(48vw,_46dvh))] min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-white p-[clamp(6px,min(1.2vmin,_12px),_12px)] shadow-xl xl:max-h-[min(48dvh,min(560px,_50vw))]">
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
              className="mx-auto w-full min-w-0 max-w-full justify-self-center rounded-[clamp(10px,min(1.6vmin,_20px),_20px)] border-[3px] border-emerald-500/45 bg-black/72 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.12)] xl:mx-0 xl:max-w-[min(100%,38rem)]"
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

            <div className="flex min-h-0 min-w-0 w-full max-w-full flex-col justify-self-center overflow-x-hidden overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.25)_transparent] xl:max-w-[min(100%,42rem)] xl:justify-self-start xl:pr-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25">
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
                accent ? 'border-yellow-500/50 bg-yellow-950/34' : 'border-white/16 bg-black/56'
              }`}
            >
              <div className={statRibbon}>{label}</div>
              <div
                className={`py-[clamp(4px,min(1.1vmin,_10px),_10px)] font-mono tabular-nums tracking-tight leading-none ${
                  accent
                    ? 'text-[clamp(1.75rem,min(10vw,min(12vmin,_10dvh)),_6.5rem)] font-black text-yellow-300'
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
          Digit-card trivia with Hold&apos;em-style wagering — <span className="text-white">host runs the pace</span>. Wall
          shows all tables when they tap <strong className="text-white">Start Game</strong>.
        </p>
      </motion.div>
    </div>
  )
}
