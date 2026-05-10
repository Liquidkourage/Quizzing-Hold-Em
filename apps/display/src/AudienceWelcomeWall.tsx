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

/** Shown on the join card only; QR still embeds the full HTTPS URL. */
function joinUrlForDisplay(url: string): string {
  return url.replace(/^https:\/\//i, '').replace(/^http:\/\//i, '')
}

/** Request a larger QR raster for sharp scaling; margin=5 keeps a valid quiet zone with less empty border than the API default. */
function qrImgSrc(joinUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=640x640&margin=5&data=${encodeURIComponent(joinUrl)}`
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
      className="relative mt-[clamp(2px,_0.45vmin,_8px)] max-[height:900px]:mt-1 h-[clamp(7px,_0.95vmin,_11px)] max-[height:900px]:h-[clamp(6px,_0.85vmin,_9px)] w-[min(94%,920px)] shrink-0 overflow-hidden rounded-full border border-amber-400/65 bg-black/75 shadow-[0_0_40px_rgba(251,191,36,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]"
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

function VegasAttentionPanel({
  showCorners,
  animateShimmer,
  className,
  innerFlexClassName,
  children,
}: {
  showCorners: boolean
  animateShimmer: boolean
  className: string
  /** Overrides default inner flex wrapper (defaults to column flex + h-full). */
  innerFlexClassName?: string
  children: ReactNode
}) {
  const overlayBase =
    'pointer-events-none absolute inset-0 z-[1] rounded-[inherit] motion-reduce:transition-none motion-reduce:animate-none motion-reduce:opacity-[0.05]'
  const overlayLive =
    'animate-vegas-shimmer-cards mix-blend-soft-light opacity-[0.06] md:opacity-[0.098]'
  const innerFlex =
    innerFlexClassName ??
    'relative z-[5] flex h-full min-h-0 min-w-0 flex-col'
  return (
    <div className={`relative isolate overflow-hidden rounded-[inherit] ${className}`}>
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
      <div className={innerFlex}>{children}</div>
    </div>
  )
}

/** Scan-to-join column — narrow viewports stack full-width; `xl` fits the left ~30% band of the wall row (see parent grid). */
function WelcomeQrColumn({
  sectionRibbon,
  joinUrl,
  qrOk,
  setQrOk,
  reducedMotion,
}: {
  sectionRibbon: string
  joinUrl: string
  qrOk: boolean
  setQrOk: (ok: boolean) => void
  reducedMotion: boolean
}) {
  const sectionClass =
    'relative flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col items-center overflow-hidden justify-self-center xl:h-full xl:max-h-full xl:flex-1 xl:justify-start'

  const panelInnerFlex =
    'relative z-[5] flex min-h-0 min-w-0 max-h-full flex-1 flex-col justify-between gap-y-[clamp(4px,min(0.85vmin,_10px),_14px)] items-stretch overflow-hidden'

  const panelClass =
    `box-border w-fit max-w-full max-h-full min-h-0 min-w-0 overflow-hidden rounded-[clamp(12px,_2vmin,_22px)] border-2 border-amber-400/55 bg-black/72 px-[clamp(8px,min(1.35vmin,_14px),_16px)] py-[clamp(8px,min(1.95vmin,_20px),_20px)] shadow-[inset_0_0_0_1px_rgba(251,211,141,0.18),0_0_72px_-4px_rgba(34,197,94,0.2),0_0_100px_-6px_rgba(234,179,8,0.16)] ring-2 ring-yellow-900/55 xl:w-full xl:max-w-full [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:px-[clamp(8px,min(1.2vmin,_13px),_15px)]`

  const aimClass =
    `${sectionRibbon} shrink-0 w-full block text-center leading-[1.08] pb-0 px-[clamp(10px,min(2vmin,_22px),_28px)] [text-wrap:balance] xl:mb-0 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:relative [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:z-[46]`

  const midClass =
    'relative flex min-h-0 max-h-full w-full flex-1 flex-col items-center justify-center overflow-hidden min-w-0 px-[clamp(4px,min(0.85vmin,_8px),_10px)] xl:min-h-[min(20dvh,140px)] xl:justify-start xl:px-[clamp(10px,min(2.2vmin,_16px),_20px)] xl:py-[clamp(4px,min(0.95vmin,_8px),_12px)]'

  const whiteTileBase =
    'box-border flex min-h-[120px] w-max max-w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border-[3px] border-amber-300/98 bg-white p-[clamp(4px,min(0.85vmin,_8px),_10px)] shadow-[inset_0_0_0_2px_rgba(254,249,231,1),0_26px_80px_-14px_rgba(234,179,8,0.55),0_0_52px_rgba(239,68,68,0.14)] max-[height:880px]:shadow-[inset_0_0_0_2px_rgba(254,249,231,1),0_18px_64px_-12px_rgba(234,179,8,0.45),0_0_40px_rgba(239,68,68,0.12)] mx-auto'

  const whiteClass =
    `${whiteTileBase} aspect-square max-h-full w-auto max-w-[min(100%,min(96vw,min(62dvh,620px)))] shrink-0 max-[height:880px]:max-w-[min(100%,min(94vw,min(56dvh,560px)))] xl:mx-auto xl:aspect-square xl:h-auto xl:max-h-[min(100%,52dvh)] xl:w-full xl:max-w-full [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:max-h-[min(40vmin,40dvh,400px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:max-w-[min(40vmin,40dvh,400px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!p-[2px] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:shadow-[0_8px_48px_-6px_rgba(0,0,0,0.55),inset_0_0_0_2px_rgba(254,249,231,1),0_0_40px_rgba(234,179,8,0.35)]`

  const opensClass =
    `${sectionRibbon} shrink-0 w-full block text-center leading-[1.08] pt-0 px-[clamp(10px,min(2vmin,_22px),_28px)] opacity-90 [text-wrap:balance] xl:mt-0 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:relative [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:z-[46]`

  return (
    <section aria-label="Scan QR code: scan here to play" className={sectionClass}>
      <VegasAttentionPanel
        showCorners
        animateShimmer={!reducedMotion}
        innerFlexClassName={panelInnerFlex}
        className={panelClass}
      >
        <span className={aimClass}>Scan here</span>
        {qrOk ? (
          <div className={midClass}>
            <div className={whiteClass}>
              <img
                src={qrImgSrc(joinUrl)}
                alt=""
                width={640}
                height={640}
                className="block h-auto w-auto max-h-[min(92%,46dvh)] max-w-[92%] min-h-0 min-w-0 rounded-sm object-contain xl:max-h-[min(90%,48dvh)] xl:max-w-[90%]"
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
        <span className={opensClass}>to play</span>
      </VegasAttentionPanel>
    </section>
  )
}

/**
 * Venue join wall: header, then three horizontal bands (~30% + gutters) on `xl+` — QR, join & players, newcomer tips.
 */
type AttendanceSectionProps = {
  syncingCounts: boolean
  /** Total human players in the venue (lobby + seated). */
  enrolled: number | null
  reducedMotion: boolean
  playerCountLabelClass: string
  statTile1080: string
  statDigitBase: string
  statDigitAccentShadow: string
  /** Strip | under join legacy | stacked inside middle band with join card */
  layout: 'strip' | 'underJoin' | 'middle'
  className?: string
}

function AttendanceSection({
  syncingCounts,
  enrolled,
  reducedMotion,
  playerCountLabelClass,
  statTile1080,
  statDigitBase,
  statDigitAccentShadow,
  layout,
  className,
}: AttendanceSectionProps) {
  const display = syncingCounts ? '—' : String(enrolled ?? 0)

  const stripWrapClass =
    'relative z-[18] flex w-full min-h-0 shrink-0 justify-center [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:px-[clamp(12px,min(2.4vw,_48px),_56px)]'

  const underJoinWrapClass =
    'relative z-[18] isolate w-full max-w-[min(100%,38rem)] mx-auto min-h-0 shrink-0'

  const gridMiddleWrapClass = 'relative z-[18] isolate w-full min-h-0 shrink-0 mx-auto max-w-none'

  const tileShared =
    `${statTile1080} min-h-0 min-w-0 rounded-[clamp(10px,min(1.5vmin,_18px),_18px)] border-2 px-[clamp(8px,min(1.35vmin,_14px),_14px)] py-[clamp(8px,min(1.25vmin,_14px),_16px)] text-center backdrop-blur-sm motion-reduce:!transform-none motion-reduce:!filter-none motion-reduce:animate-none will-change-transform motion-reduce:will-change-auto border-yellow-300/95 bg-gradient-to-br from-yellow-950/65 via-red-950/48 to-purple-950/52 shadow-[0_0_40px_-4px_rgba(234,179,8,0.42),inset_0_1px_0_rgba(254,249,231,0.16),inset_0_-16px_40px_-26px_rgba(239,68,68,0.1)] ring-2 ring-amber-500/65 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:shadow-[0_0_28px_-6px_rgba(234,179,8,0.34),inset_0_1px_0_rgba(254,249,231,0.14),inset_0_-12px_32px_-22px_rgba(239,68,68,0.08)]`

  const stripTileClass = `${tileShared} w-full max-w-[min(100%,clamp(260px,38vw,440px))]`
  const underJoinTileClass = `${tileShared} w-full`
  const gridMiddleTileClass = `${tileShared} flex w-full min-h-0 flex-col justify-center`

  function wrapTileFor(layout: AttendanceSectionProps['layout']) {
    if (layout === 'strip') return { wrap: stripWrapClass, tile: stripTileClass }
    if (layout === 'underJoin') return { wrap: underJoinWrapClass, tile: underJoinTileClass }
    return { wrap: gridMiddleWrapClass, tile: gridMiddleTileClass }
  }

  const { wrap: wrapClass, tile: tileClass } = wrapTileFor(layout)

  return (
    <section
      aria-label="Players in this venue"
      className={`${wrapClass}${className ? ` ${className}` : ''}`}
    >
      <motion.div
        className={tileClass}
        animate={
          reducedMotion
            ? undefined
            : {
                scale: [1, 1.014, 1],
                filter: ['brightness(1)', 'brightness(1.09) saturate(1.08)', 'brightness(1)'],
              }
        }
        transition={reducedMotion ? undefined : { duration: 2.75, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className={playerCountLabelClass}>Players</div>
        <div className={`${statDigitBase} text-yellow-200 ${statDigitAccentShadow}`}>{display}</div>
      </motion.div>
    </section>
  )
}

function WelcomeJoinCard({
  className,
  venueCode,
  joinUrl,
  joinUrlText,
  venueMono,
  reducedMotion,
}: {
  className: string
  venueCode: string
  joinUrl: string
  joinUrlText: string
  venueMono: string
  reducedMotion: boolean
}) {
  const joinLeadClass =
    'min-w-0 text-balance whitespace-normal font-black uppercase tracking-[0.14em] text-amber-50/95 opacity-92 text-[clamp(0.88rem,min(2.52vw,_2.15vh),_1.55rem)] [text-shadow:0_0_20px_rgba(251,191,36,0.35),0_2px_4px_rgba(0,0,0,_0.9)]'

  const joinInnerFlex =
    'relative z-[5] flex min-h-0 min-w-0 h-full w-full flex-1 flex-col items-center justify-center gap-y-[clamp(10px,min(1.35vmin,_16px),_18px)] px-[clamp(8px,_1.5vmin,_20px)] py-[clamp(12px,min(1.5vmin,_22px),_26px)] text-center xl:h-auto xl:flex-none xl:justify-start xl:px-[clamp(10px,_1.55vmin,_22px)] xl:py-[clamp(10px,min(1.25vmin,_18px),_22px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:py-[clamp(12px,min(1.55vmin,_22px),_24px)]'

  return (
    <section aria-label="Alternative join instructions: URL and room code" className={className}>
      <VegasAttentionPanel
        showCorners
        animateShimmer={!reducedMotion}
        innerFlexClassName={joinInnerFlex}
        className="flex h-full min-h-0 min-w-0 w-full flex-col rounded-[clamp(10px,min(1.6vmin,_20px),_20px)] border-[3px] border-amber-500/65 bg-black/78 px-0 py-0 shadow-[inset_0_0_22px_-8px_rgba(234,179,8,0.11),0_0_42px_-10px_rgba(52,211,153,0.14),0_0_54px_-12px_rgba(124,58,237,0.07)] ring-2 ring-purple-950/90 xl:h-auto xl:overflow-hidden"
      >
        <p className={`${joinLeadClass} shrink-0`}>Or go to</p>
        <p
          className={`${joinUrlText} mx-auto w-full max-w-full shrink-0 px-[2px]`}
          aria-label={joinUrl}
        >
          {joinUrlForDisplay(joinUrl)}
        </p>
        <p className={`${joinLeadClass} shrink-0`}>and enter room code</p>
        <motion.div
          className="isolate mx-auto inline-block w-max max-w-full shrink-0 rounded-[clamp(8px,_1.25vmin,_12px)] border-[2px] border-amber-300/98 bg-black/82 px-[clamp(8px,_1.35vmin,_16px)] py-[clamp(4px,_1vmin,_10px)]"
          animate={
            reducedMotion
              ? undefined
              : {
                  boxShadow: [
                    '0 0 8px rgba(234,179,8,0.2), inset 0 0 0 1px rgba(251,211,141,0.16)',
                    '0 0 18px rgba(234,179,8,0.38), inset 0 0 0 1px rgba(253,246,178,0.22)',
                    '0 0 8px rgba(234,179,8,0.2), inset 0 0 0 1px rgba(251,211,141,0.16)',
                  ],
                }
          }
          transition={{ duration: 2.85, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className={venueMono}>{venueCode}</div>
        </motion.div>
      </VegasAttentionPanel>
    </section>
  )
}

function WelcomeNewPlayerTipsPanel({
  hintsTitleClass,
  reducedMotion,
}: {
  hintsTitleClass: string
  reducedMotion: boolean
}) {
  const bulletClass =
    'min-w-0 flex-1 text-balance font-semibold leading-[1.38] text-amber-50/96 [text-shadow:0_2px_14px_rgba(0,0,0,_0.82)] text-[clamp(1rem,min(3.15vw,_2.75vh),_1.52rem)] xl:leading-[1.42] xl:text-[clamp(1.05rem,min(3.35vw,_2.9vh),_1.58rem)]'

  const tips = [
    "Quizz'em is a trivia game played exactly like Texas Hold'em—answers are numeric, cards are single digits (e.g. 99, 1492, 90210).",
    'You get two private digit cards—a.k.a. hole cards—and everyone bets once on their phones (call, raise, fold). Then five digit community cards land; everyone bets again.',
    'When betting closes you have 45 seconds to: pick five digit cards to form your hand, arrange them into your answer (adding a decimal if you want), and submit your response.',
    'Whoever is closest to the correct number wins this round’s pot.',
  ] as const

  return (
    <section aria-label="How Quizz'em Hold'em is played" className="flex h-full min-h-0 min-w-0 w-full flex-col xl:h-auto xl:min-h-0">
      <VegasAttentionPanel
        showCorners
        animateShimmer={!reducedMotion}
        innerFlexClassName="relative z-[5] flex h-full min-h-0 min-w-0 w-full flex-1 flex-col justify-center xl:h-auto xl:flex-none xl:justify-start"
        className="flex min-h-0 min-w-0 h-full w-full flex-1 flex-col overflow-hidden rounded-[clamp(10px,min(1.6vmin,_20px),_20px)] border-[3px] border-amber-500/65 bg-black/78 px-0 py-0 shadow-[inset_0_0_22px_-8px_rgba(234,179,8,0.11),0_0_42px_-10px_rgba(52,211,153,0.14),0_0_54px_-12px_rgba(124,58,237,0.07)] ring-2 ring-purple-950/90 xl:h-auto xl:flex-none"
      >
        <div className="relative z-[1] flex h-full min-h-0 flex-col justify-center gap-y-[clamp(10px,min(1.2vmin,_14px),_16px)] px-[clamp(12px,_1.75vmin,_22px)] py-[clamp(12px,_1.65vmin,_22px)] xl:justify-start xl:gap-y-[clamp(12px,min(1.35vmin,_18px),_20px)]">
          <p className={`${hintsTitleClass} shrink-0 text-center`}>How to play</p>
          <ul className="m-0 flex min-h-0 list-none flex-col justify-center gap-y-[clamp(10px,min(1.2vmin,_13px),_16px)] p-0 xl:justify-start xl:gap-y-[clamp(12px,min(1.3vmin,_17px),_18px)]">
            {tips.map((t) => (
              <li key={t} className="flex items-start gap-x-[clamp(8px,_1.1vmin,_12px)]">
                <span className="mt-[0.42em] shrink-0 text-[0.75em] font-bold leading-none text-emerald-300/92" aria-hidden>
                  ●
                </span>
                <span className={bulletClass}>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </VegasAttentionPanel>
    </section>
  )
}

function WelcomeWallHeader({
  reducedMotion,
  taglineClass,
}: {
  reducedMotion: boolean
  taglineClass: string
}) {
  return (
    <header className="flex w-full max-w-full min-w-0 shrink-0 flex-col items-center px-[clamp(4px,_0.75vw,_14px)]">
      <div
        className="relative mx-auto w-auto max-w-[min(96vw,100%)] shrink-0 overflow-visible [height:min(max(41.6vh,_189px),min(800px,_77vh))] max-[height:720px]:[height:min(max(35.2vh,_147px),min(480px,_64vh))] xl:[height:min(max(54.4vh,_243px),min(960px,_83vh))]"
        style={{ aspectRatio: '955 / 592' }}
      >
        <QuizzEmWordmark layout="fill" />
      </div>
      <p className={`mt-[clamp(2px,_0.38vmin,_7px)] max-[height:900px]:mt-0.5 text-center normal-case ${taglineClass}`}>By Liquid Kourage Entertainment</p>
      <VegasPulseDivider active={!reducedMotion} />
    </header>
  )
}

export default function AudienceWelcomeWall({ venueCode, wall }: AudienceWelcomeWallProps) {
  const joinUrl = playerJoinHref()
  const syncingCounts = wall == null
  const enrolled = syncingCounts ? null : (wall.lobbyPlayerCount ?? 0) + (wall.totalSeatedAtTables ?? 0)
  const [qrOk, setQrOk] = useState(true)
  const reducedMotion = useReducedMotion()

  /** Single literal strings — tailwind JIT must see full arbitrary class sequences.
   *  Prefer vw over vmin for headline sizes so zooming the browser scales more predictably
   *  (vmin balloons when the window is tall and crowded the vertical rhythm). */
  /** `min-w-0` + wrapping so wide tracking / long words cannot blow past grid tracks */
  const sectionRibbon =
    'min-w-0 font-black uppercase tracking-[0.22em] text-amber-50/98 break-words text-balance whitespace-normal text-[clamp(1.05rem,min(3.95vw,_3vh),_2.5rem)] [text-shadow:0_0_32px_rgba(251,191,36,0.45),0_0_72px_rgba(239,68,68,0.14),0_2px_4px_rgba(0,0,0,_0.95)]'

  const hintsTitleClass =
    'min-w-0 font-black uppercase tracking-[0.17em] text-amber-50/97 break-words text-balance whitespace-normal text-[clamp(1.12rem,min(3.85vw,_3.1vh),_1.92rem)] [text-shadow:0_0_24px_rgba(251,191,36,0.45),0_2px_8px_rgba(0,0,0,_0.92)]'

  /** Credit under the wordmark — readable title case, subtler than headline chrome. */
  const taglineCredit =
    'min-w-0 break-words text-balance font-semibold tracking-[0.04em] text-amber-50/92 text-[clamp(0.82rem,min(2.45vw,_1.85vh),_1.28rem)] [text-shadow:0_0_14px_rgba(253,224,138,0.38),0_2px_8px_rgba(0,0,0,_0.88)]'

  /** “Players” label above the total count tile */
  const playerCountLabelClass =
    'min-w-0 break-words text-balance font-black tracking-[0.13em] text-[clamp(0.95rem,min(3.05vw,_2.55vh),_1.95rem)] uppercase text-emerald-50/94 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:tracking-[0.11em] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:text-[clamp(0.85rem,min(2.5vw,_1.95vh),_1.58rem)] [text-shadow:0_0_18px_rgba(167,243,208,0.28),0_2px_8px_rgba(0,0,0,.58)] mb-[clamp(3px,min(0.55vmin,_5px),_6px)]'
  const venueMono =
    'max-w-full break-all text-center font-mono font-black leading-none tracking-[0.06em] text-[clamp(1.45rem,min(7.5vw,min(8.5vh,_3.2rem)),_4.25rem)] uppercase text-transparent bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-600 bg-clip-text [-webkit-background-clip:text] [filter:drop-shadow(0_2px_4px_rgba(0,0,0,.9))]'

  /** Join card URL — Orbitron; break-all so long hosts wrap inside the middle column. */
  const joinUrlText =
    'hyphens-none break-all text-center font-orbitron font-black leading-[1.35] tracking-[0.04em] text-amber-50 text-[clamp(0.92rem,min(2.65vw,_2.95vh),_2.2rem)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:text-[clamp(0.88rem,min(2.35vw,_2.68vh),_1.95rem)] [text-shadow:0_0_22px_rgba(254,249,231,0.45),0_0_58px_rgba(251,191,36,0.42),0_0_112px_rgba(234,179,8,0.22),0_0_28px_rgba(239,68,68,0.12),0_1px_0_rgba(0,0,0,0.9)]'

  /** Tighter attendance strip on landscape 1080p-class TVs (≥1024 wide, ≤1080 tall); skips narrow/portrait. */
  const statTile1080 =
    '[@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:rounded-[clamp(8px,min(1.25vmin,_15px),_15px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:px-[clamp(5px,min(1.05vmin,_10px),_11px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:py-[clamp(3px,min(0.95vmin,_8px),_9px)]'

  /** Slightly taller digits limited on short viewports; default keeps large-TV punch. */
  const statDigitBase =
    'py-[clamp(3px,min(0.95vmin,_8px),_8px)] font-mono tabular-nums tracking-tight leading-none text-[clamp(1.55rem,min(8.5vw,min(10vmin,_8.5dvh)),_5.5rem)] font-black [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:py-[clamp(2px,min(0.55vmin,_5px),_5px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:text-[clamp(1.25rem,min(5.5vw,min(6.5vmin,_6dvh)),_3.85rem)]'

  const statDigitAccentShadow =
    '[text-shadow:0_0_36px_rgba(253,224,138,0.65),0_0_92px_rgba(234,179,8,0.35),0_2px_4px_rgba(0,0,0,0.95)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:[text-shadow:0_0_22px_rgba(253,224,138,0.55),0_0_54px_rgba(234,179,8,0.28),0_2px_3px_rgba(0,0,0,0.92)]'

  return (
    <div
      role="main"
      aria-label="Join this Quizz'em game"
      className="relative h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-x-hidden overflow-y-hidden overscroll-y-none bg-[#05030c] antialiased text-white selection:bg-yellow-400/35"
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
        {/* Cinema vignette — leave center open so felt reads */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 84% 70% at 50% 44%, transparent 44%, rgba(0, 0, 0, 0.38) 72%, rgba(0, 0, 0, 0.78) 100%)',
          }}
        />
        {/* Felt texture AFTER vignette (otherwise grain/rail disappears) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.52] mix-blend-soft-light md:opacity-[0.62]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 40% 35%, rgba(214, 245, 225, 0.55) 1.4px, transparent 2.1px), radial-gradient(circle at 50% 50%, rgba(15, 78, 58, 0.55) 1.1px, transparent 1.75px)',
            backgroundSize: '6px 6px, 5px 5px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.72] mix-blend-soft-light md:opacity-[0.82]"
          style={{
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
              "<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='5' stitchTiles='stitch' result='n'/><feColorMatrix type='saturate' values='0' in='n'/></filter><rect width='100%' height='100%' filter='url(#f)' fill='%23042f28'/></svg>"
            )}")`,
            backgroundSize: 'min(120px, 18vmin) min(120px, 18vmin)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.62] mix-blend-overlay md:opacity-[0.72]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg,
                transparent 0px,
                transparent 24px,
                rgba(253,246,226,0.16) 25px,
                rgba(253,246,226,0.16) 27px,
                transparent 28px,
                transparent 60px),
              repeating-linear-gradient(-45deg,
                transparent 0px,
                transparent 24px,
                rgba(3, 44, 36, 0.38) 25px,
                rgba(3, 44, 36, 0.38) 27px,
                transparent 28px,
                transparent 60px),
              radial-gradient(ellipse 92% 80% at 50% 40%, rgba(224, 246, 229, 0.28) 0%, transparent 58%),
              linear-gradient(108deg, rgba(255, 255, 255, 0.2) 0%, transparent 34%, transparent 66%, rgba(0, 0, 0, 0.14) 100%)
            `,
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-soft-light opacity-[0.14] md:opacity-[0.18]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(173deg,rgba(255,255,255,0)_0px,rgba(255,255,255,0)_5px,rgba(255,255,255,.14)_6px,rgba(255,255,255,.14)_8px,rgba(255,255,255,0)_9px,rgba(255,255,255,0)_15px)',
            backgroundSize: '100% 100%',
          }}
          animate={reducedMotion ? undefined : { opacity: [0.12, 0.26, 0.13] }}
          transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        className="relative z-10 mx-auto flex min-h-0 h-full max-h-full w-full max-w-none flex-col gap-y-[clamp(3px,_0.65vmin,_8px)] max-[height:920px]:gap-y-[clamp(5px,_1vmin,_10px)] px-[clamp(8px,_1.65vw,_56px)] py-[clamp(3px,_0.55vh,_10px)] max-[height:920px]:py-[clamp(4px,_0.58vh,_9px)] [@media(max-height:720px)]:gap-y-1 [@media(max-height:720px)]:py-1 [@media(max-height:720px)]:px-2 overflow-hidden"
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

        <div className="flex min-h-0 flex-1 flex-col gap-y-[clamp(1px,_0.35vmin,_4px)] max-[height:920px]:gap-y-[clamp(2px,_0.55vmin,_6px)] overflow-hidden xl:gap-y-[2px]">
          <WelcomeWallHeader reducedMotion={Boolean(reducedMotion)} taglineClass={taglineCredit} />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col w-full overflow-hidden pb-[clamp(2px,min(0.5vmin,_8px),_8px)] max-[height:920px]:pb-[clamp(4px,min(0.85vmin,_10px),_11px)]">
            <div
              aria-label="Join the game: scan, URL and room code, attendance"
              className="flex min-h-0 flex-1 flex-col gap-y-[clamp(4px,min(0.85vmin,_10px),_12px)] max-[height:920px]:gap-y-[clamp(4px,min(0.95vmin,_11px),_12px)] overflow-hidden xl:grid xl:grid-cols-[minmax(0,30%)_minmax(0,30%)_minmax(0,30%)] xl:gap-x-[5%] xl:gap-y-0 xl:items-start"
            >
              <div className="flex min-h-0 min-w-0 flex-col overflow-hidden xl:h-full xl:max-h-full">
                <WelcomeQrColumn
                  sectionRibbon={sectionRibbon}
                  joinUrl={joinUrl}
                  qrOk={qrOk}
                  setQrOk={setQrOk}
                  reducedMotion={Boolean(reducedMotion)}
                />
              </div>
              <div className="flex min-h-0 min-w-0 flex-col justify-start gap-y-[clamp(6px,min(1vmin,_12px),_14px)] overflow-hidden xl:h-full xl:flex-1 xl:gap-y-[clamp(6px,min(1vmin,_12px),_14px)]">
                <WelcomeJoinCard
                  className="flex min-h-0 min-w-0 w-full shrink-0 flex-col xl:min-h-0"
                  venueCode={venueCode}
                  joinUrl={joinUrl}
                  joinUrlText={joinUrlText}
                  venueMono={venueMono}
                  reducedMotion={Boolean(reducedMotion)}
                />
                <AttendanceSection
                  layout="middle"
                  syncingCounts={syncingCounts}
                  enrolled={enrolled}
                  reducedMotion={Boolean(reducedMotion)}
                  playerCountLabelClass={playerCountLabelClass}
                  statTile1080={statTile1080}
                  statDigitBase={statDigitBase}
                  statDigitAccentShadow={statDigitAccentShadow}
                />
              </div>
              <div className="hidden min-h-0 min-w-0 shrink-0 xl:flex xl:h-auto xl:min-h-0 xl:w-full xl:flex-col">
                <WelcomeNewPlayerTipsPanel
                  hintsTitleClass={hintsTitleClass}
                  reducedMotion={Boolean(reducedMotion)}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
