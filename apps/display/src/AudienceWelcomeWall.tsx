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
      className="relative mt-[clamp(4px,_0.65vmin,_10px)] max-[height:900px]:mt-1 h-[clamp(7px,_0.95vmin,_11px)] max-[height:900px]:h-[clamp(6px,_0.85vmin,_9px)] w-[min(94%,920px)] shrink-0 overflow-hidden rounded-full border border-amber-400/65 bg-black/75 shadow-[0_0_40px_rgba(251,191,36,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]"
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
    <div className={`relative isolate overflow-visible rounded-[inherit] ${className}`}>
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

type WelcomeQrMode = 'stack' | 'wide'

/** Scan-to-join column: `stack` for narrow layouts, `wide` for the `xl` two-column hero. */
function WelcomeQrColumn({
  mode,
  sectionRibbon,
  joinUrl,
  qrOk,
  setQrOk,
  reducedMotion,
}: {
  mode: WelcomeQrMode
  sectionRibbon: string
  joinUrl: string
  qrOk: boolean
  setQrOk: (ok: boolean) => void
  reducedMotion: boolean
}) {
  const stack = mode === 'stack'

  const sectionClass = stack
    ? 'relative h-auto min-h-0 min-w-0 w-full max-w-full justify-self-center overflow-visible'
    : 'relative h-full min-h-0 min-w-0 w-full max-w-full justify-self-center overflow-visible xl:justify-self-end'

  const panelInnerFlex = stack
    ? 'relative z-[5] flex min-h-0 min-w-0 flex-col justify-between gap-y-[clamp(6px,min(1.1vmin,_14px),_18px)]'
    : 'relative z-[5] flex h-full min-h-0 min-w-0 flex-col justify-between xl:justify-between'

  const panelClass = stack
    ? `min-h-0 min-w-0 w-full max-w-full overflow-visible rounded-[clamp(12px,_2vmin,_22px)] border-2 border-amber-400/55 bg-black/72 p-[clamp(8px,min(1.95vmin,_20px),_20px)] shadow-[inset_0_0_0_1px_rgba(251,211,141,0.18),0_0_72px_-4px_rgba(34,197,94,0.2),0_0_100px_-6px_rgba(234,179,8,0.16)] ring-2 ring-yellow-900/55 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:overflow-visible [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:p-[clamp(6px,min(1.35vmin,_14px),_14px)]`
    : `h-full min-h-0 min-w-0 w-full max-w-full flex-1 overflow-hidden rounded-[clamp(12px,_2vmin,_22px)] border-2 border-amber-400/55 bg-black/72 p-[clamp(8px,min(1.95vmin,_20px),_20px)] shadow-[inset_0_0_0_1px_rgba(251,211,141,0.18),0_0_72px_-4px_rgba(34,197,94,0.2),0_0_100px_-6px_rgba(234,179,8,0.16)] ring-2 ring-yellow-900/55 xl:flex-1 xl:min-h-0 xl:p-[clamp(12px,min(2vmin,_22px),_22px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:overflow-visible [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:p-[clamp(6px,min(1.35vmin,_14px),_14px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:pt-[clamp(12px,_1.65vmin,_20px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:-mt-[min(13dvh,156px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!h-[calc(100%+min(13dvh,156px))] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!min-h-[calc(100%+min(13dvh,156px))]`

  const aimClass =
    `${sectionRibbon} mb-[clamp(6px,_1vmin,_14px)] shrink-0 text-center leading-snug [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:relative [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:z-[46] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:mb-[clamp(14px,_1.75vmin,_24px)] xl:mb-0`

  const midClass = stack
    ? 'relative flex min-h-[min(28dvh,240px)] w-full flex-1 flex-col items-center justify-end [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:min-h-[min(24dvh,240px)]'
    : 'relative flex min-h-0 w-full flex-1 flex-col items-center justify-end [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:min-h-[min(24dvh,240px)] xl:flex-1 xl:min-h-0 xl:items-center xl:justify-center xl:gap-y-[clamp(14px,_1.85vmin,_24px)] xl:py-[clamp(10px,_1.35vmin,_18px)]'

  const whiteTileBase =
    'box-border flex min-h-[120px] w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border-[3px] border-amber-300/98 bg-white p-[clamp(5px,min(1.1vmin,_11px),_11px)] shadow-[inset_0_0_0_2px_rgba(254,249,231,1),0_26px_80px_-14px_rgba(234,179,8,0.55),0_0_52px_rgba(239,68,68,0.14)] max-[height:880px]:shadow-[inset_0_0_0_2px_rgba(254,249,231,1),0_18px_64px_-12px_rgba(234,179,8,0.45),0_0_40px_rgba(239,68,68,0.12)]'

  const whiteClass = stack
    ? `${whiteTileBase} h-full max-h-[min(46dvh,min(520px,_55vw))] max-w-[min(100%,min(48vw,_46dvh))] max-[height:880px]:max-h-[min(41dvh,min(480px,_52vw))] [@media(min-width:1280px)_and_(min-height:1081px)]:max-h-[min(48dvh,min(560px,_50vw))] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!absolute [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!bottom-0 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!left-1/2 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!right-auto [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!top-auto [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:![transform:translateX(-50%)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!z-[44] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!h-[min(36vmin,41dvh,378px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!w-[min(36vmin,41dvh,378px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!max-h-none [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!max-w-none [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!p-[3px] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:shadow-[0_8px_48px_-6px_rgba(0,0,0,0.55),inset_0_0_0_2px_rgba(254,249,231,1),0_0_40px_rgba(234,179,8,0.35)]`
    : `${whiteTileBase} aspect-square max-h-[min(100%,min(52dvh,44vw))] max-w-[min(100%,min(52dvh,44vw))] xl:!relative xl:!mx-auto xl:!max-h-none xl:!max-w-none xl:!shrink-0 xl:!p-[3px] xl:!h-[min(31vmin,36dvh,318px)] xl:!w-[min(31vmin,36dvh,318px)] xl:shadow-[0_8px_48px_-6px_rgba(0,0,0,0.55),inset_0_0_0_2px_rgba(254,249,231,1),0_0_40px_rgba(234,179,8,0.35)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!absolute [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!bottom-0 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!left-1/2 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!right-auto [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!top-auto [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:![transform:translateX(-50%)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!z-[44] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!h-[min(36vmin,41dvh,378px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!w-[min(36vmin,41dvh,378px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!max-h-none [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!max-w-none [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!p-[3px] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:shadow-[0_8px_48px_-6px_rgba(0,0,0,0.55),inset_0_0_0_2px_rgba(254,249,231,1),0_0_40px_rgba(234,179,8,0.35)]`

  const opensClass =
    `${sectionRibbon} mt-[clamp(6px,_1vmin,_14px)] shrink-0 text-center opacity-90 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:relative [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:z-[46] xl:mt-0`

  return (
    <section aria-label="Scan QR to open player app" className={sectionClass}>
      <VegasAttentionPanel
        showCorners
        animateShimmer={!reducedMotion}
        innerFlexClassName={panelInnerFlex}
        className={panelClass}
      >
        <span className={aimClass}>Aim camera here</span>
        {qrOk ? (
          <div className={midClass}>
            <div className={whiteClass}>
              <img
                src={qrImgSrc(joinUrl)}
                alt=""
                width={640}
                height={640}
                className="block h-auto min-h-0 min-w-0 max-h-[calc(100%-2px)] w-auto max-w-[calc(100%-2px)] rounded-sm object-contain [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:max-h-full [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:max-w-full"
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
        <span className={opensClass}>Opens Player</span>
      </VegasAttentionPanel>
    </section>
  )
}

/**
 * Venue join wall: single header; below `xl` stacks QR → join → player count; `xl+` uses two columns (QR | join + count).
 * Intended for landscape wall displays; portrait host previews are unsupported.
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
  /** Full-width centered (default) vs same column width as join card when `xl` uses two columns */
  layout: 'strip' | 'underJoin'
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

  const tileShared =
    `${statTile1080} min-h-0 min-w-0 rounded-[clamp(10px,min(1.5vmin,_18px),_18px)] border-2 px-[clamp(8px,min(1.35vmin,_14px),_14px)] py-[clamp(8px,min(1.25vmin,_14px),_16px)] text-center backdrop-blur-sm motion-reduce:!transform-none motion-reduce:!filter-none motion-reduce:animate-none will-change-transform motion-reduce:will-change-auto border-yellow-300/95 bg-gradient-to-br from-yellow-950/65 via-red-950/48 to-purple-950/52 shadow-[0_0_40px_-4px_rgba(234,179,8,0.42),inset_0_1px_0_rgba(254,249,231,0.16),inset_0_-16px_40px_-26px_rgba(239,68,68,0.1)] ring-2 ring-amber-500/65 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:shadow-[0_0_28px_-6px_rgba(234,179,8,0.34),inset_0_1px_0_rgba(254,249,231,0.14),inset_0_-12px_32px_-22px_rgba(239,68,68,0.08)]`

  const stripTileClass = `${tileShared} w-full max-w-[min(100%,clamp(280px,42vw,480px))]`
  const underJoinTileClass = `${tileShared} w-full`

  return (
    <section
      aria-label="Players in this venue"
      className={`${layout === 'strip' ? stripWrapClass : underJoinWrapClass}${className ? ` ${className}` : ''}`}
    >
      <motion.div
        className={layout === 'strip' ? stripTileClass : underJoinTileClass}
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
  sectionRibbon,
  joinUrlText,
  venueMono,
  reducedMotion,
}: {
  className: string
  venueCode: string
  joinUrl: string
  sectionRibbon: string
  joinUrlText: string
  venueMono: string
  reducedMotion: boolean
}) {
  return (
    <section aria-label="Player URL then venue room code" className={className}>
      <VegasAttentionPanel
        showCorners
        animateShimmer={!reducedMotion}
        className="h-full min-h-0 min-w-0 w-full rounded-[clamp(10px,min(1.6vmin,_20px),_20px)] border-[3px] border-amber-500/65 bg-black/78 px-0 py-0 shadow-[inset_0_0_22px_-8px_rgba(234,179,8,0.11),0_0_42px_-10px_rgba(52,211,153,0.14),0_0_54px_-12px_rgba(124,58,237,0.07)] ring-2 ring-purple-950/90 xl:flex-1 xl:min-h-0 xl:overflow-hidden [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:-mt-[min(8.5dvh,108px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!h-[calc(100%+min(8.5dvh,108px))] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!min-h-[calc(100%+min(8.5dvh,108px))]"
      >
        <div className="relative z-[1] px-[clamp(8px,_1.6vmin,_22px)] pb-[clamp(8px,_1.25vmin,_14px)] pt-[clamp(10px,_1.8vmin,_18px)] text-center xl:pb-[clamp(8px,_1.05vmin,_12px)] xl:pt-[clamp(10px,_1.35vmin,_16px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:pb-[clamp(14px,_1.55vmin,_22px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:pt-[clamp(12px,_1.85vmin,_22px)]">
          <p className={`${sectionRibbon} mb-[clamp(6px,_0.9vmin,_10px)] text-center`}>Player URL</p>
          <p className={joinUrlText}>{joinUrl}</p>
        </div>
        <div
          aria-hidden
          className="mx-[clamp(8px,_1.5vmin,_18px)] mt-[clamp(6px,_0.85vmin,_12px)] border-t border-dashed border-white/22 xl:mt-[clamp(8px,_1vmin,_14px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:mt-[clamp(12px,_1.35vmin,_20px)]"
        />
        <div className="flex flex-col items-center overflow-visible px-[clamp(8px,_1.6vmin,_22px)] pb-[clamp(14px,min(1.75vmin,_22px),_26px)] pt-[clamp(8px,_1.15vmin,_14px)] text-center xl:pb-[clamp(12px,min(1.35vmin,_18px),_20px)] xl:pt-[clamp(8px,_1vmin,_12px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:pb-[clamp(22px,min(2.65vmin,_34px),_36px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:pt-[clamp(14px,_1.65vmin,_22px)]">
          <p
            className={`${sectionRibbon} mb-[clamp(8px,_1.05vmin,_12px)] text-center opacity-95 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:mb-[clamp(14px,_1.55vmin,_20px)]`}
          >
            Venue / room code
          </p>
          <div className="mx-auto inline-block max-w-full px-[4px] pb-[clamp(6px,min(0.85vmin,_8px),_10px)] pt-[2px] xl:pb-[clamp(6px,min(0.72vmin,_8px),_10px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:pb-[clamp(12px,min(1.2vmin,_14px),_16px)]">
            <motion.div
              className="isolate inline-block w-max max-w-full rounded-[clamp(8px,_1.35vmin,_14px)] border-[3px] border-amber-300/98 bg-black/82 px-[clamp(8px,_1.5vmin,_18px)] py-[clamp(5px,_1.1vmin,_12px)]"
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
          </div>
        </div>
      </VegasAttentionPanel>
    </section>
  )
}

function WelcomeWallHeader({ reducedMotion, taglineBrand }: { reducedMotion: boolean; taglineBrand: string }) {
  return (
    <header className="flex w-full max-w-full min-w-0 shrink-0 flex-col items-center px-[clamp(4px,_0.75vw,_14px)]">
      <div
        className="relative mx-auto w-auto max-w-[min(96vw,100%)] shrink-0 overflow-visible drop-shadow-[0_0_48px_rgba(251,191,36,0.24)] [height:min(max(30vh,_128px),min(580px,_54vh))] max-[height:720px]:[height:min(max(26vh,_96px),min(340px,_44vh))] xl:[height:min(max(38vh,_168px),min(680px,_58vh))]"
        style={{ aspectRatio: '1024 / 655' }}
      >
        <QuizzEmWordmark layout="fill" />
      </div>
      <p
        className={`mt-[clamp(6px,_0.8vmin,_14px)] max-[height:900px]:mt-1 text-center ${taglineBrand}${!reducedMotion ? ' motion-safe:animate-vegas-gold-drip motion-safe:delay-150' : ''}`}
      >
        Join tonight&apos;s game
      </p>
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

  const taglineBrand =
    'min-w-0 break-words text-balance font-semibold uppercase tracking-[0.26em] text-amber-50 text-[clamp(1.06rem,min(3.85vw,_2.95vh),_2.35rem)] [text-shadow:0_0_28px_rgba(253,224,138,0.58),0_0_88px_rgba(234,179,8,0.28),0_2px_8px_rgba(0,0,0,_0.95),0_-1px_0_rgba(127,29,29,0.32)]'

  /** “Players” label above the total count tile */
  const playerCountLabelClass =
    'min-w-0 break-words text-balance font-black tracking-[0.13em] text-[clamp(1.05rem,min(3.35vw,_2.85vh),_2.22rem)] uppercase text-emerald-50/94 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:tracking-[0.11em] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:text-[clamp(0.9rem,min(2.72vw,_2.15vh),_1.72rem)] [text-shadow:0_0_18px_rgba(167,243,208,0.28),0_2px_8px_rgba(0,0,0,.58)] mb-[clamp(4px,min(0.65vmin,_6px),_8px]'
  const venueMono =
    'max-w-full break-all text-center font-mono font-black leading-none tracking-[0.06em] text-[clamp(1.75rem,min(9vw,min(10vh,_3.75rem)),_5.25rem)] uppercase text-transparent bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-600 bg-clip-text [-webkit-background-clip:text] [filter:drop-shadow(0_2px_4px_rgba(0,0,0,.9))]'

  /** Join card URL — Orbitron matches display chrome; avoids cold system monospace. */
  const joinUrlText =
    'hyphens-none break-words text-center font-orbitron font-black leading-snug tracking-[0.05em] text-amber-50 text-[clamp(1.06rem,min(3.08vw,_3.55vh),_2.72rem)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:text-[clamp(0.98rem,min(2.68vw,_3.05vh),_2.28rem)] [text-shadow:0_0_22px_rgba(254,249,231,0.45),0_0_58px_rgba(251,191,36,0.42),0_0_112px_rgba(234,179,8,0.22),0_0_28px_rgba(239,68,68,0.12),0_1px_0_rgba(0,0,0,0.9)]'

  /** Tighter attendance strip on landscape 1080p-class TVs (≥1024 wide, ≤1080 tall); skips narrow/portrait. */
  const statTile1080 =
    '[@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:rounded-[clamp(8px,min(1.25vmin,_15px),_15px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:px-[clamp(5px,min(1.05vmin,_10px),_11px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:py-[clamp(3px,min(0.95vmin,_8px),_9px)]'

  /** Slightly taller digits limited on short viewports; default keeps large-TV punch. */
  const statDigitBase =
    'py-[clamp(4px,min(1.1vmin,_10px),_10px)] font-mono tabular-nums tracking-tight leading-none text-[clamp(1.75rem,min(10vw,min(12vmin,_10dvh)),_6.5rem)] font-black [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:py-[clamp(2px,min(0.65vmin,_6px),_6px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:text-[clamp(1.38rem,min(6.2vw,min(7.25vmin,_6.75dvh)),_4.45rem)]'

  const statDigitAccentShadow =
    '[text-shadow:0_0_36px_rgba(253,224,138,0.65),0_0_92px_rgba(234,179,8,0.35),0_2px_4px_rgba(0,0,0,0.95)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:[text-shadow:0_0_22px_rgba(253,224,138,0.55),0_0_54px_rgba(234,179,8,0.28),0_2px_3px_rgba(0,0,0,0.92)]'

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
        className="relative z-10 mx-auto flex min-h-0 h-full max-h-none w-full max-w-none flex-col gap-y-[clamp(5px,_0.95vmin,_12px)] max-[height:920px]:gap-y-[clamp(8px,_1.35vmin,_15px)] px-[clamp(14px,_2.85vw,_96px)] py-[clamp(5px,_0.9vh,_14px)] max-[height:920px]:py-[clamp(6px,_0.85vh,_12px)] [@media(max-height:720px)]:gap-y-1.5 [@media(max-height:720px)]:py-1 [@media(max-height:720px)]:px-3"
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

        <div className="flex min-h-0 flex-1 flex-col gap-y-[clamp(5px,_0.95vmin,_12px)] max-[height:920px]:gap-y-[clamp(8px,_1.35vmin,_15px)]">
          <WelcomeWallHeader reducedMotion={Boolean(reducedMotion)} taglineBrand={taglineBrand} />

          <div className="relative z-10 min-h-0 flex-1 w-full overflow-x-clip pb-[clamp(4px,min(0.85vmin,_10px),_11px)] max-[height:920px]:pb-[clamp(6px,min(1.05vmin,_12px),_14px)]">
            <div className="flex h-full min-h-0 min-w-0 flex-col gap-x-[clamp(12px,min(2.25vw,_28px),_40px)] gap-y-[clamp(9px,min(1.45vmin,_16px),_18px)] max-[height:920px]:gap-y-[clamp(8px,min(1.25vmin,_14px),_15px)] xl:hidden">
              <WelcomeQrColumn
                mode="stack"
                sectionRibbon={sectionRibbon}
                joinUrl={joinUrl}
                qrOk={qrOk}
                setQrOk={setQrOk}
                reducedMotion={Boolean(reducedMotion)}
              />
              <WelcomeJoinCard
                className="mx-auto h-full min-h-0 w-full max-w-full justify-self-center"
                venueCode={venueCode}
                joinUrl={joinUrl}
                sectionRibbon={sectionRibbon}
                joinUrlText={joinUrlText}
                venueMono={venueMono}
                reducedMotion={Boolean(reducedMotion)}
              />
              <AttendanceSection
                layout="strip"
                syncingCounts={syncingCounts}
                enrolled={enrolled}
                reducedMotion={Boolean(reducedMotion)}
                playerCountLabelClass={playerCountLabelClass}
                statTile1080={statTile1080}
                statDigitBase={statDigitBase}
                statDigitAccentShadow={statDigitAccentShadow}
              />
            </div>

            <div className="hidden h-full min-h-0 min-w-0 gap-x-[clamp(12px,min(2.25vw,_40px),_48px)] gap-y-[clamp(8px,min(1.25vmin,_14px),_16px)] xl:grid xl:grid-cols-2 xl:items-stretch">
              <div className="flex min-h-0 min-w-0 flex-col xl:h-full">
                <WelcomeQrColumn
                  mode="wide"
                  sectionRibbon={sectionRibbon}
                  joinUrl={joinUrl}
                  qrOk={qrOk}
                  setQrOk={setQrOk}
                  reducedMotion={Boolean(reducedMotion)}
                />
              </div>
              <div className="flex min-h-0 flex-col gap-y-[clamp(8px,min(1.15vmin,_14px),_16px)]">
                <WelcomeJoinCard
                  className="mx-auto flex h-full min-h-0 w-full max-w-[min(100%,38rem)] flex-1 flex-col justify-self-center"
                  venueCode={venueCode}
                  joinUrl={joinUrl}
                  sectionRibbon={sectionRibbon}
                  joinUrlText={joinUrlText}
                  venueMono={venueMono}
                  reducedMotion={Boolean(reducedMotion)}
                />
                <AttendanceSection
                  layout="underJoin"
                  syncingCounts={syncingCounts}
                  enrolled={enrolled}
                  reducedMotion={Boolean(reducedMotion)}
                  playerCountLabelClass={playerCountLabelClass}
                  statTile1080={statTile1080}
                  statDigitBase={statDigitBase}
                  statDigitAccentShadow={statDigitAccentShadow}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
