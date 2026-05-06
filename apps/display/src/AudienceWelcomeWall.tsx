import { useState, type ReactNode } from 'react'
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

/** Gold rail strokes at corners — long “┌” segments, not bordered squares (avoids checkbox look). */
function VegasCornerBrackets() {
  const inset = 'clamp(12px, 2vmin, 20px)'
  const arm = 'clamp(3.85rem, min(34vw, 26vh), 8.25rem)'
  const thickness = 'clamp(4px, 0.65vmin, 7px)'
  const common =
    'pointer-events-none absolute z-[2] rounded-full shadow-[0_0_20px_rgba(251,211,141,0.55),0_0_44px_rgba(234,179,8,0.2)]'

  return (
    <>
      <span
        className={`${common} bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ top: inset, left: inset, width: arm, height: thickness }}
        aria-hidden
      />
      <span
        className={`${common} bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ top: inset, left: inset, width: thickness, height: arm }}
        aria-hidden
      />
      <span
        className={`${common} bg-gradient-to-l from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ top: inset, right: inset, width: arm, height: thickness }}
        aria-hidden
      />
      <span
        className={`${common} bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ top: inset, right: inset, width: thickness, height: arm }}
        aria-hidden
      />
      <span
        className={`${common} bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ bottom: inset, left: inset, width: arm, height: thickness }}
        aria-hidden
      />
      <span
        className={`${common} bg-gradient-to-t from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ bottom: inset, left: inset, width: thickness, height: arm }}
        aria-hidden
      />
      <span
        className={`${common} bg-gradient-to-l from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ bottom: inset, right: inset, width: arm, height: thickness }}
        aria-hidden
      />
      <span
        className={`${common} bg-gradient-to-t from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ bottom: inset, right: inset, width: thickness, height: arm }}
        aria-hidden
      />
    </>
  )
}

/** Swept marquee light along the divider under the title. */
function VegasPulseDivider({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className="relative mt-[clamp(6px,_0.75vmin,_12px)] h-[clamp(8px,_1.05vmin,_11px)] w-[min(94%,920px)] shrink-0 overflow-hidden rounded-full border border-amber-400/65 bg-black/75 shadow-[0_0_40px_rgba(251,191,36,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]"
    >
      <div
        className="absolute inset-0 opacity-95"
        style={{
          background:
            'linear-gradient(90deg,rgba(239,68,68,0.22)_0%,rgba(251,211,141,0.55)_43%,rgba(52,211,153,0.26)_73%,rgba(124,58,237,0.18)_100%)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/22 to-transparent" />
      {active && (
        <motion.div
          className="absolute inset-y-[-40%] w-[42%]"
          initial={false}
          style={{
            background:
              'linear-gradient(70deg,rgba(255,255,255,0)_0%,rgba(255,253,240,0.92)_52%,rgba(255,255,255,0)_100%)',
            filter: 'blur(6px)',
            opacity: 0.92,
          }}
          animate={{ x: ['-100%', '320%'] }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: 'linear',
            repeatDelay: 0.15,
          }}
        />
      )}
    </div>
  )
}

/** Small flashy trust / stakes strip — readable at TV distance; motion optional. */
function VegasLoungeStrip({ reducedMotion }: { reducedMotion: boolean }) {
  const flash = reducedMotion ? '' : 'motion-safe:animate-vegas-gold-drip'
  const chip =
    'rounded-full px-[clamp(11px,_1.95vmin,_20px)] py-[clamp(5px,_0.85vmin,_8px)] text-[clamp(0.62rem,min(2.15vw,_0.92rem))] font-black uppercase shadow-lg'
  return (
    <div className="mt-[clamp(6px,_0.65vmin,_12px)] flex min-w-0 flex-wrap justify-center gap-x-[clamp(8px,_1.85vmin,_22px)] gap-y-[6px] px-1">
      <span
        className={`${chip} border border-rose-500/70 bg-gradient-to-br from-black/92 via-black/82 to-red-950/75 tracking-[0.32em] text-rose-100 shadow-[inset_0_1px_0_rgba(255,228,228,0.22),0_0_40px_-4px_rgba(239,68,68,0.45)] motion-reduce:border-rose-600/85 ${flash}`}
      >
        ♠ LIVE FLOOR ♦
      </span>
      <span
        className={`${chip} border border-yellow-400/80 bg-black/88 tracking-[0.28em] text-amber-100 shadow-[inset_0_1px_0_rgba(254,249,231,0.2),0_0_48px_-4px_rgba(234,179,8,0.55)] motion-reduce:border-amber-500/95 motion-safe:delay-300 ${flash}`}
      >
        HIGH STAKES TRIVIA
      </span>
      <span
        className={`${chip} border border-emerald-500/65 bg-black/88 tracking-[0.26em] text-emerald-100 shadow-[inset_0_1px_0_rgba(209,250,229,0.16),0_0_40px_-4px_rgba(52,211,153,0.35)] motion-reduce:border-emerald-500/90 motion-safe:delay-700 ${flash}`}
      >
        ★ SCAN TO PLAY ★
      </span>
    </div>
  )
}

function VegasAttentionPanel({
  showCorners,
  animateShimmer,
  className,
  children,
}: {
  showCorners: boolean
  animateShimmer: boolean
  className: string
  children: ReactNode
}) {
  const overlayBase =
    'pointer-events-none absolute inset-0 z-[1] rounded-[inherit] motion-reduce:transition-none motion-reduce:animate-none motion-reduce:opacity-[0.05]'
  const overlayLive =
    'animate-vegas-shimmer-cards mix-blend-soft-light opacity-[0.06] md:opacity-[0.098]'
  return (
    <div className={`relative isolate overflow-visible ${className}`}>
      {showCorners ? <VegasCornerBrackets /> : null}
      {animateShimmer ? (
        <div
          aria-hidden
          className={`${overlayBase} ${overlayLive}`}
          style={{
            background:
              'radial-gradient(circle_at_72%_10%,rgba(253,244,202,0.65)_0%,transparent_36%), radial-gradient(circle_at_18%_92%,rgba(52,211,153,0.55)_0%,transparent_42%), radial-gradient(circle_at_50%_50%,rgba(192,132,252,0.45)_0%,transparent_58%)',
          }}
        />
      ) : (
        <div
          aria-hidden
          className={`${overlayBase} opacity-[0.045] md:opacity-[0.06]`}
          style={{
            background:
              'radial-gradient(circle at 72% 10%,rgba(253,244,202,0.5)_0%,transparent 38%), radial-gradient(circle at 18% 92%,rgba(52,211,153,0.4)_0%,transparent 44%)',
          }}
        />
      )}
      <div className="relative z-[5] flex h-full min-h-0 min-w-0 flex-col">{children}</div>
    </div>
  )
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
    'min-w-0 font-black uppercase tracking-[0.22em] text-amber-50/98 break-words text-balance whitespace-normal text-[clamp(1.05rem,min(3.95vw,_3vh),_2.5rem)] [text-shadow:0_0_32px_rgba(251,191,36,0.45),0_0_72px_rgba(239,68,68,0.14),0_2px_4px_rgba(0,0,0,_0.95)]'

  const taglineBrand =
    'min-w-0 break-words text-balance font-semibold uppercase tracking-[0.26em] text-amber-50 text-[clamp(1.06rem,min(3.85vw,_2.95vh),_2.35rem)] [text-shadow:0_0_28px_rgba(253,224,138,0.58),0_0_88px_rgba(234,179,8,0.28),0_2px_8px_rgba(0,0,0,_0.95),0_-1px_0_rgba(127,29,29,0.32)]'

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

  /** Join card URL line — marquee-bright neon for TV distance */
  const joinUrlText =
    'break-words text-center font-mono font-black leading-snug tracking-tight text-amber-50 text-[clamp(1.12rem,min(3.28vw,_3.75vh),_2.68rem)] [text-shadow:0_0_22px_rgba(254,249,231,0.45),0_0_58px_rgba(251,191,36,0.42),0_0_112px_rgba(234,179,8,0.22),0_0_28px_rgba(239,68,68,0.12),0_1px_0_rgba(0,0,0,0.9)]'

  return (
    <div
      role="main"
      aria-label="Join this Quizz'em game"
      className="relative h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[#05030c] antialiased text-white selection:bg-yellow-400/35"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Base felt + velvet house lights */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/75 via-[#06483c] to-black" />
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
        {/* Red ramp light (subtle stakes) */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            background: 'radial-gradient(ellipse 90% 60% at 50% 100%,rgba(239,68,68,0.35)_0%,transparent 55%)',
          }}
        />
        {/* Bright felt bank — emerald wash from footer */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.21]"
          style={{
            background: 'radial-gradient(ellipse 98% 78% at 50% 108%,rgba(16,185,129,0.42)_0%,transparent 60%)',
          }}
        />
        {/* Drifting “confetti sparks” */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-screen opacity-[0.035] sm:opacity-[0.052]"
          style={{
            backgroundImage:
              'radial-gradient(circle at center,rgba(254,249,231,1)_0.55px,transparent 0.65px)',
            backgroundSize: '36px 33px',
          }}
          animate={reducedMotion ? undefined : { backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        />
        {/* Air / haze sparkle */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 mix-blend-overlay ${reducedMotion ? 'bg-white/[0.03]' : 'motion-safe:animate-vegas-twinkle-field bg-white/[0.055]'}`}
        />
        {/* Cinema vignette — lighter on the playable field so felt reads */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 82% 68% at 50% 44%, transparent 38%, rgba(0, 0, 0, 0.42) 72%, rgba(0, 0, 0, 0.82) 100%)',
          }}
        />
        {/* Felt texture AFTER vignette (otherwise grain/rail disappears) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.26] mix-blend-overlay md:opacity-[0.34]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(24, 106, 82, 0.92) 1.1px, transparent 1.65px)',
            backgroundSize: '5px 5px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.42] mix-blend-soft-light md:opacity-[0.5]"
          style={{
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
              "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='5' stitchTiles='stitch' result='n'/><feColorMatrix type='saturate' values='0' in='n'/></filter><rect width='100%' height='100%' filter='url(#f)' fill='%23033d30'/></svg>"
            )}")`,
            backgroundSize: 'min(148px, 22vmin) min(148px, 22vmin)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.48] mix-blend-overlay md:opacity-[0.56]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg,
                transparent 0px,
                transparent 28px,
                rgba(253,246,226,0.09) 29px,
                rgba(253,246,226,0.09) 30px,
                transparent 31px,
                transparent 68px),
              repeating-linear-gradient(-45deg,
                transparent 0px,
                transparent 28px,
                rgba(4,52,41,0.22) 29px,
                rgba(4,52,41,0.22) 30px,
                transparent 31px,
                transparent 68px),
              radial-gradient(ellipse 90% 78% at 50% 40%,rgba(224,246,229,0.18)_0%,transparent 55%),
              linear-gradient(108deg,rgba(255,255,255,0.14)_0%,transparent 36%,transparent 64%,rgba(0,0,0,0.12)_100%)
            `,
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-soft-light opacity-[0.082] md:opacity-[0.11]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(173deg,rgba(255,255,255,0)_0px,rgba(255,255,255,0)_6px,rgba(255,255,255,.08)_7px,rgba(255,255,255,.08)_8px,rgba(255,255,255,0)_9px,rgba(255,255,255,0)_16px)',
            backgroundSize: '100% 100%',
          }}
          animate={reducedMotion ? undefined : { opacity: [0.07, 0.14, 0.075] }}
          transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        className="relative z-10 mx-auto grid min-h-0 min-w-0 h-full max-h-none w-full max-w-none grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-y-[clamp(4px,_0.85vmin,_10px)] px-[clamp(14px,_2.85vw,_96px)] py-[clamp(6px,_1vh,_16px)] [@media(max-height:720px)]:gap-y-1 [@media(max-height:720px)]:py-1 [@media(max-height:720px)]:px-3 [@media(min-width:1920px)]:px-[clamp(96px,_5vw,_160px)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[3%] top-[clamp(72px,_12vh,_200px)] z-[11] hidden select-none justify-between px-[clamp(12px,_2vw,_72px)] sm:flex md:opacity-100"
        >
          {(['♠', '♥', '♦', '♣'] as const).map((s, i) => (
            <motion.span
              key={s}
              className="relative -top-[2vh] origin-center select-none text-[clamp(2.85rem,min(18vmin,_13vw),_15rem)] font-black leading-none text-amber-500/[0.075] blur-[3px]"
              aria-hidden
              style={{ textShadow: '0 0 80px rgba(234,179,8,0.12)' }}
              animate={
                reducedMotion ? undefined : { y: ['-1%', '3%', '-1%'], opacity: [0.065, 0.11, 0.065], rotate: [-1.25, 1.75, -1.25] }
              }
              transition={{
                duration: 8.2 + i * 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.6,
              }}
            >
              {s}
            </motion.span>
          ))}
        </div>

        <header className="flex w-full max-w-full min-w-0 shrink-0 flex-col items-center px-[clamp(4px,_0.75vw,_14px)]">
          <div
            className="h-[clamp(32px,_7vmin,_82px)] w-auto max-w-[min(885px,_92vw)] shrink-0 drop-shadow-[0_0_40px_rgba(251,191,36,0.18)] [@media(max-height:720px)]:max-h-[9vh]"
            style={{ aspectRatio: '1024 / 655' }}
          >
            <QuizzEmWordmark layout="fill" />
          </div>
          <p
            className={`mt-[clamp(6px,_0.8vmin,_14px)] text-center ${taglineBrand}${!reducedMotion ? ' motion-safe:animate-vegas-gold-drip motion-safe:delay-150' : ''}`}
          >
            Join tonight&apos;s game
          </p>
          <VegasPulseDivider active={!reducedMotion} />
          <VegasLoungeStrip reducedMotion={Boolean(reducedMotion)} />
        </header>

        {/* Row 2: [QR · join · rules]; wide 3-column only from xl (~1280px) so 720-class widths stack */}
        <div className="min-h-0 min-w-0">
          <div className="grid h-full min-h-0 min-w-0 grid-cols-1 gap-x-[clamp(12px,min(2.25vw,_28px),_40px)] gap-y-[clamp(12px,min(1.85vmin,_20px),_22px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] xl:items-stretch">
            <section aria-label="Scan QR to open player app" className="h-full min-h-0 min-w-0 w-full max-w-full justify-self-center xl:justify-self-end">
              <VegasAttentionPanel
                showCorners
                animateShimmer={!reducedMotion}
                className="h-full min-h-0 min-w-0 w-full max-w-full rounded-[clamp(12px,_2vmin,_22px)] border-2 border-amber-400/55 bg-black/72 p-[clamp(8px,min(1.95vmin,_20px),_20px)] shadow-[inset_0_0_0_1px_rgba(251,211,141,0.18),0_0_72px_-4px_rgba(34,197,94,0.2),0_0_100px_-6px_rgba(234,179,8,0.16)] ring-2 ring-yellow-900/55"
              >
                <span className={`${sectionRibbon} mb-[clamp(6px,_1vmin,_14px)] shrink-0 text-center leading-snug`}>
                  Aim camera here
                </span>
                {qrOk ? (
                  <div className="flex min-h-0 min-w-0 w-full flex-1 justify-center px-px">
                    <div className="box-border flex h-full max-h-[min(46dvh,min(520px,_55vw))] min-h-[120px] w-full max-w-[min(100%,min(48vw,_46dvh))] min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border-[3px] border-amber-300/98 bg-white p-[clamp(6px,min(1.2vmin,_12px),_12px)] shadow-[inset_0_0_0_2px_rgba(254,249,231,1),0_26px_80px_-14px_rgba(234,179,8,0.55),0_0_52px_rgba(239,68,68,0.14)] xl:max-h-[min(48dvh,min(560px,_50vw))]">
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
              </VegasAttentionPanel>
            </section>

            <section aria-label="Player URL then venue room code" className="mx-auto h-full min-h-0 w-full max-w-full justify-self-center xl:mx-0 xl:max-w-[min(100%,38rem)]">
              <VegasAttentionPanel
                showCorners
                animateShimmer={!reducedMotion}
                className="h-full min-h-0 min-w-0 w-full rounded-[clamp(10px,min(1.6vmin,_20px),_20px)] border-[3px] border-amber-500/65 bg-black/78 px-0 py-0 shadow-[inset_0_0_30px_-6px_rgba(234,179,8,0.16),0_0_64px_-8px_rgba(52,211,153,0.22),0_0_90px_-10px_rgba(124,58,237,0.12)] ring-2 ring-purple-950/90"
              >
                <div className="px-[clamp(8px,_1.6vmin,_22px)] pb-[clamp(8px,_1.25vmin,_14px)] pt-[clamp(10px,_1.8vmin,_18px)] text-center">
                  <p className={`${sectionRibbon} mb-[clamp(6px,_0.9vmin,_10px)] text-center`}>Player URL</p>
                  <p className={joinUrlText}>{joinUrl}</p>
                </div>
                <div aria-hidden className="mx-[clamp(8px,_1.5vmin,_18px)] border-t border-dashed border-white/22" />
                <div className="flex flex-col items-center px-[clamp(8px,_1.6vmin,_22px)] pb-[clamp(10px,_1.8vmin,_18px)] pt-[clamp(8px,_1.35vmin,_14px)] text-center">
                  <p className={`${sectionRibbon} mb-[clamp(6px,_0.95vmin,_10px)] text-center opacity-95`}>Venue / room code</p>
                  <motion.div
                    className="inline-block w-max max-w-full rounded-[clamp(8px,_1.35vmin,_14px)] border-[3px] border-amber-300/98 bg-black/82 px-[clamp(8px,_1.5vmin,_18px)] py-[clamp(6px,_1.35vmin,_14px)]"
                    animate={
                      reducedMotion
                        ? undefined
                        : {
                            boxShadow: [
                              '0 0 16px rgba(234,179,8,0.28), inset 0 0 0 1px rgba(251,211,141,0.18)',
                              '0 0 34px rgba(234,179,8,0.58), inset 0 0 0 1px rgba(253,246,178,0.28)',
                              '0 0 16px rgba(234,179,8,0.28), inset 0 0 0 1px rgba(251,211,141,0.18)',
                            ],
                          }
                    }
                    transition={{ duration: 2.85, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className={venueMono}>{venueCode}</div>
                  </motion.div>
                </div>
              </VegasAttentionPanel>
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
            <motion.div
              key={label}
              className={`min-h-0 min-w-0 rounded-[clamp(10px,min(1.5vmin,_18px),_18px)] border-2 px-[clamp(6px,min(1.35vmin,_14px),_14px)] py-[clamp(6px,min(1.65vmin,_16px),_16px)] text-center backdrop-blur-sm motion-reduce:!transform-none motion-reduce:!filter-none motion-reduce:animate-none will-change-transform motion-reduce:will-change-auto ${
                accent
                  ? 'border-yellow-300/95 bg-gradient-to-br from-yellow-950/65 via-red-950/48 to-purple-950/52 shadow-[0_0_58px_-2px_rgba(234,179,8,0.58),inset_0_1px_0_rgba(254,249,231,0.18),inset_0_-20px_50px_-30px_rgba(239,68,68,0.12)] ring-2 ring-amber-500/65'
                  : 'border-white/22 bg-black/62 shadow-[inset_0_0_34px_-12px_rgba(251,191,36,0.1),0_8px_32px_-10px_rgba(0,0,0,0.55)]'
              }`}
              animate={
                accent && !reducedMotion
                  ? {
                      scale: [1, 1.036, 1],
                      filter: ['brightness(1)', 'brightness(1.09) saturate(1.08)', 'brightness(1)'],
                    }
                  : undefined
              }
              transition={
                accent && !reducedMotion
                  ? {
                      duration: 2.75,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
                  : undefined
              }
            >
              <div className={statRibbon}>{label}</div>
              <div
                className={`py-[clamp(4px,min(1.1vmin,_10px),_10px)] font-mono tabular-nums tracking-tight leading-none ${
                  accent
                    ? 'text-[clamp(1.75rem,min(10vw,min(12vmin,_10dvh)),_6.5rem)] font-black text-yellow-200 [text-shadow:0_0_36px_rgba(253,224,138,0.65),0_0_92px_rgba(234,179,8,0.35),0_2px_4px_rgba(0,0,0,0.95)]'
                    : 'text-[clamp(1.75rem,min(10vw,min(12vmin,_10dvh)),_6.5rem)] font-black text-white'
                }`}
              >
                {v}
              </div>
              <div className={statHint}>{hint}</div>
            </motion.div>
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
