import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import {
  DISPLAY_PREVIEW_BANKROLLS,
  DISPLAY_PREVIEW_SYNCED_PHASE,
  DISPLAY_PREVIEW_TABLES,
  rehearsalSeatDisplayName,
} from '@qhe/core'
import type { DisplayVenueTileSnapshot, DisplayVenueWallSnapshot } from '@qhe/net'

import seatChipStackImg from './assets/seat-chip-stack.png'

const VENUE_SEAT_SLOTS = 8

/** Fixed crawl strips (Players + All tables): keep widths and page padding in sync */
const VENUE_CRAWL_STRIP_CLASS = 'w-80 sm:w-[22rem] lg:w-96'

/** Mirror {@link VENUE_CRAWL_STRIP_CLASS} for main shell horizontal padding when crawls mount */
const VENUE_CRAWL_PL_CLASS = 'pl-80 sm:pl-[22rem] lg:pl-96'
const VENUE_CRAWL_PR_CLASS = 'pr-80 sm:pr-[22rem] lg:pr-96'

/** Pre-start seating tour: one table hero + thumbnails; seconds per table. */
const SEATING_SPOTLIGHT_CYCLE_SEC = 10

/** Viewport scale for spotlight hero card (×0.9³ ≈ 27% inset from unscaled layout). */
const VENUE_SEATING_SPOTLIGHT_HERO_ZOOM = 0.729

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

function formatVenueBankroll(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0
  return `$${Math.max(0, n).toLocaleString()}`
}

/** Sum bankrolls for seats that have a player name — matches crawl "Chips on table". */
function totalChipsFromSeats(seatNames: string[], seatBankrolls: number[]): number {
  let total = 0
  for (let i = 0; i < VENUE_SEAT_SLOTS; i++) {
    if (seatNames[i]?.trim()) total += seatBankrolls[i] ?? 0
  }
  return total
}

function padSeatNames(raw: string[] | undefined): string[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    if (raw != null && raw[i] != null) {
      const t = String(raw[i]).trim()
      return t
    }
    return ''
  })
}

function padSeatBankrolls(raw: number[] | undefined): number[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    const v = raw?.[i]
    return typeof v === 'number' && Number.isFinite(v) ? v : 0
  })
}

/**
 * Felt div uses `inset-[12%_8%_15%_8%]` (top,right,bottom,left) — an axis-aligned ellipse
 * in %-space of the SeatRing wrapper: x% of width, y% of height.
 */
const TABLE_FELT_INSET_TOP = 0.12
const TABLE_FELT_INSET_RIGHT = 0.08
const TABLE_FELT_INSET_BOTTOM = 0.15
const TABLE_FELT_INSET_LEFT = 0.08

const TABLE_FELT_ELLIPSE = (() => {
  const innerW = 1 - TABLE_FELT_INSET_LEFT - TABLE_FELT_INSET_RIGHT
  const innerH = 1 - TABLE_FELT_INSET_TOP - TABLE_FELT_INSET_BOTTOM
  return {
    cx: TABLE_FELT_INSET_LEFT + innerW / 2,
    cy: TABLE_FELT_INSET_TOP + innerH / 2,
    /** Semi-axis in horizontal %-of-width units */
    rx: innerW / 2,
    /** Semi-axis in vertical %-of-height units */
    ry: innerH / 2,
  }
})()

/**
 * Rim of the visible felt ellipse. Seat index 0 centers at clock top; advances CCW when viewed from above.
 * @param radialScale 1 = on rim, < 1 inward toward table center along the same radial, > 1 outward (name chips).
 */
function feltEllipsePct(seatIndex: number, radialScale: number): { leftPct: number; topPct: number } {
  const θ = (seatIndex / VENUE_SEAT_SLOTS) * 2 * Math.PI - Math.PI / 2
  const { cx, cy, rx, ry } = TABLE_FELT_ELLIPSE
  const c = Math.cos(θ)
  const s = Math.sin(θ)
  return {
    leftPct: (cx + rx * radialScale * c) * 100,
    topPct: (cy + ry * radialScale * s) * 100,
  }
}

/** Polar angle θ for seat i (matches {@link feltEllipsePct}). */
function seatThetaRad(seatIndex: number): number {
  return (seatIndex / VENUE_SEAT_SLOTS) * 2 * Math.PI - Math.PI / 2
}

/** Nudge pole labels toward beltline (top downward, bottom upward); east/west stay put. */
const SEAT_NAME_LABEL_VERTICAL_NUDGE_PX_MD = 5
const SEAT_NAME_LABEL_VERTICAL_NUDGE_PX_LG = 7

function seatNameLabelVerticalNudgePx(seatIndex: number, size: 'md' | 'lg'): number {
  const amp = size === 'lg' ? SEAT_NAME_LABEL_VERTICAL_NUDGE_PX_LG : SEAT_NAME_LABEL_VERTICAL_NUDGE_PX_MD
  return -Math.sin(seatThetaRad(seatIndex)) * amp
}

/**
 * Rim point and outward unit normal on the inset felt ellipse (pixel space of wrapper `w×h`).
 * Normal is Euclidean for the ellipse with semi-axes Rx, Ry derived from frac-space rx, ry.
 */
function ellipseRimPxAndOutwardNormal(
  seatIndex: number,
  w: number,
  h: number
): { rimX: number; rimY: number; ux: number; uy: number; Rx: number; Ry: number } {
  const θ = seatThetaRad(seatIndex)
  const { cx, cy, rx, ry } = TABLE_FELT_ELLIPSE
  const Rx = rx * w
  const Ry = ry * h
  const cxx = cx * w
  const cyy = cy * h
  const c = Math.cos(θ)
  const s = Math.sin(θ)
  const rimX = cxx + Rx * c
  const rimY = cyy + Ry * s
  const gx = c / Rx
  const gy = s / Ry
  const len = Math.hypot(gx, gy)
  const ux = gx / len
  const uy = gy / len
  return { rimX, rimY, ux, uy, Rx, Ry }
}

/** Fallback label anchor when wrapper size unknown (SSR / first paint). */
function fallbackLabelEllipseScale(size: 'md' | 'lg', feltStacks: boolean): number {
  if (size === 'lg') return feltStacks ? 1.045 : 1.03
  return feltStacks ? 1.04 : 1.025
}

/** Dot diameters match Tailwind classes on seat markers ({@link SeatRingWithLabels}). */
function seatDotDiameterPx(rootRemPx: number, size: 'md' | 'lg'): number {
  if (size !== 'lg') return 2 * rootRemPx
  const sm =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(min-width:640px)').matches
  return (sm ? 3.15 : 2.8375) * rootRemPx
}

/**
 * Outward label anchor in wrapper % so labels sit outside seat dots, clear the chip band (lg hero),
 * avoid other seat markers, and spread along the tangent when adjacent names would crowd.
 */
function computeSeatLabelAnchorsPct(args: {
  w: number
  h: number
  size: 'md' | 'lg'
  feltSeatStacks: boolean
  seatNames: string[]
}): ({ leftPct: number; topPct: number } | null)[] {
  const { w, h, size, feltSeatStacks, seatNames } = args
  const empty = () =>
    Array.from({ length: VENUE_SEAT_SLOTS }, () => null as { leftPct: number; topPct: number } | null)
  if (!(w > 0 && h > 0)) return empty()

  const rootRem =
    typeof document !== 'undefined'
      ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      : 16
  const dotR = seatDotDiameterPx(rootRem, size) / 2
  /** Half of approx. name block inward toward the felt (smaller = labels sit tighter to the rim). */
  const labelHalfInwardPx =
    size === 'lg' ? (feltSeatStacks ? 14 : 18) : 12
  /** lg hero: chip PNG + bankroll radial band — modest push so names avoid larger stacks nearer the rim. */
  const chipBandClearancePx = feltSeatStacks && size === 'lg' ? 16 : 0
  const padPx = 1
  const neighborDotPadPx = 2
  const estLabelHalfWidthPx =
    size === 'lg' ? Math.min(0.34 * w, 12 * rootRem) / 2 : Math.min(0.5 * w, 8.5 * rootRem) / 2
  const labelPairMinDistPx = 2 * estLabelHalfWidthPx * 0.64 + 2

  const rimCache = Array.from({ length: VENUE_SEAT_SLOTS }, (_, j) =>
    ellipseRimPxAndOutwardNormal(j, w, h)
  )

  const out = empty()
  const priors: { x: number; y: number }[] = []

  const orderedSeats = Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => i).filter(
    (i) => (seatNames[i]?.trim() ?? '').length > 0
  )

  for (const i of orderedSeats) {
    const { rimX, rimY, ux, uy } = rimCache[i]!
    const tux = -uy
    const tuy = ux

    let dPx = dotR + padPx + labelHalfInwardPx + chipBandClearancePx
    let kTan = 0
    let lx = rimX
    let ly = rimY

    const dotsClear = (xx: number, yy: number) => {
      for (let j = 0; j < VENUE_SEAT_SLOTS; j++) {
        const rj = rimCache[j]!
        if (Math.hypot(xx - rj.rimX, yy - rj.rimY) < dotR + neighborDotPadPx) return false
      }
      return true
    }

    const labelsClear = (xx: number, yy: number) => {
      for (const p of priors) {
        if (Math.hypot(xx - p.x, yy - p.y) < labelPairMinDistPx) return false
      }
      return true
    }

    let placed = false
    for (let step = 0; step < 48 && !placed; step++) {
      lx = rimX + ux * dPx + tux * kTan
      ly = rimY + uy * dPx + tuy * kTan

      if (!dotsClear(lx, ly)) {
        dPx += 2
        continue
      }
      if (labelsClear(lx, ly)) {
        placed = true
        break
      }

      const dir = i % 2 === 0 ? 1 : -1
      kTan += dir * 6
      if (Math.abs(kTan) > 52) {
        kTan = 0
        dPx += 3
      }
    }

    if (!placed) {
      lx = rimX + ux * dPx + tux * kTan
      ly = rimY + uy * dPx + tuy * kTan
    }

    priors.push({ x: lx, y: ly })
    out[i] = { leftPct: (lx / w) * 100, topPct: (ly / h) * 100 }
  }

  return out
}

/**
 * Eight seat positions around the mini felt; optional name chips just outside each chair.
 */
function SeatRingWithLabels({
  seatedCount,
  seatNames,
  seatBankrolls,
  size = 'md',
  feltSeatStacks = false,
}: {
  seatedCount: number
  seatNames: string[]
  seatBankrolls: number[]
  size?: 'md' | 'lg'
  /** Spotlight hero: draw mini chip stack + bankroll on the felt by each seated player. */
  feltSeatStacks?: boolean
}) {
  const lgRing =
    'mx-auto aspect-[10/8] h-auto max-h-[min(min(68svh,57dvh),39rem)] w-[min(100%,calc(100dvw-2.5rem),54.625rem)] max-w-full shrink-0'
  /** Must keep height so %-positioned seats/names resolve; only abs children collapsed to zero without aspect. */
  const mdRing =
    'mx-auto aspect-[10/8] h-auto w-full max-w-[min(100%,21rem)] shrink-0 sm:max-w-[min(100%,22rem)]'
  const wrap = size === 'lg' ? lgRing : mdRing
  const dot = size === 'lg' ? 'h-[2.8375rem] w-[2.8375rem] sm:h-[3.15rem] sm:w-[3.15rem]' : 'h-8 w-8'
  const labelClass =
    size === 'lg'
      ? 'max-w-[min(12rem,34vw)] text-[1.125rem] leading-tight sm:text-[1.3rem] sm:leading-snug md:text-[1.5625rem]'
      : 'max-w-[min(7.125rem,46%)] text-[0.6875rem] leading-tight sm:max-w-[min(7.75rem,48%)] sm:text-xs md:text-sm'

  /** Bankroll stack on felt: radial scale toward seat (1 = on rim dot); larger = nearer table edge / seat marker. */
  const chipInnerScale = 0.635

  const ringElRef = useRef<HTMLDivElement>(null)
  const [ringPx, setRingPx] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = ringElRef.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const apply = () => {
      const r = el.getBoundingClientRect()
      const ww = r.width
      const hh = r.height
      if (ww > 0 && hh > 0)
        setRingPx((prev) => (prev.w === ww && prev.h === hh ? prev : { w: ww, h: hh }))
    }

    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const labelAnchorsPct = useMemo(
    () =>
      computeSeatLabelAnchorsPct({
        w: ringPx.w,
        h: ringPx.h,
        size,
        feltSeatStacks,
        seatNames,
      }),
    [feltSeatStacks, ringPx.h, ringPx.w, seatNames, size]
  )

  return (
    <div ref={ringElRef} className={`relative ${wrap}`}>
      <div
        className={`absolute rounded-[50%] border-amber-700/70 shadow-inner ${
          size === 'lg' ? 'border-2 sm:border-[3px]' : 'border-2'
        }`}
        style={{
          top: `${TABLE_FELT_INSET_TOP * 100}%`,
          right: `${TABLE_FELT_INSET_RIGHT * 100}%`,
          bottom: `${TABLE_FELT_INSET_BOTTOM * 100}%`,
          left: `${TABLE_FELT_INSET_LEFT * 100}%`,
          background: `
            repeating-linear-gradient(
              45deg,
              #245c36 0px,
              #245c36 2px,
              #1b4528 2px,
              #1b4528 4px
            ),
            linear-gradient(135deg, #2d7a4a, #1e502e)
          `,
        }}
      />
      {Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
        const seatRim = feltEllipsePct(i, 1)
        const chipPos = feltEllipsePct(i, chipInnerScale)
        const anchored = labelAnchorsPct[i]
        const fb = fallbackLabelEllipseScale(size, Boolean(feltSeatStacks && size === 'lg'))
        const fallbackPos = feltEllipsePct(i, fb)
        const labelPos = anchored ?? fallbackPos
        const filled = i < seatedCount
        const raw = seatNames[i]?.trim() ?? ''
        const chips = seatBankrolls[i] ?? 0
        const showFeltStack = Boolean(raw && feltSeatStacks && size === 'lg')
        const labelVy = seatNameLabelVerticalNudgePx(i, size)
        return (
          <div key={i}>
            <div
              className={`absolute ${dot} -translate-x-1/2 -translate-y-1/2 rounded-full border shadow ${
                filled
                  ? 'border-emerald-300/70 bg-black/85'
                  : 'border-white/20 bg-black/35'
              }`}
              style={{ left: `${seatRim.leftPct}%`, top: `${seatRim.topPct}%` }}
            />
            {showFeltStack ? (
              <div
                className="pointer-events-none absolute z-[3] flex flex-col items-center gap-0.5 px-0.5"
                style={{
                  left: `${chipPos.leftPct}%`,
                  top: `${chipPos.topPct}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <img
                  src={seatChipStackImg}
                  alt=""
                  width={96}
                  height={72}
                  draggable={false}
                  className="pointer-events-none h-[2.6925rem] w-auto max-w-[4.6rem] shrink-0 select-none object-contain opacity-95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:h-[3.0875rem] sm:max-w-[5.35rem]"
                />
                <span className="max-w-[10rem] text-center font-mono text-[1.16rem] font-extrabold leading-tight tabular-nums tracking-tight text-amber-50 sm:max-w-[11rem] sm:text-[1.26rem] md:text-[1.315rem] [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_2px_10px_rgba(0,0,0,0.85)]">
                  {formatVenueBankroll(chips)}
                </span>
              </div>
            ) : null}
            {raw ? (
              <div
                className={`pointer-events-none absolute text-center font-semibold leading-tight text-white/92 shadow-black/80 drop-shadow ${labelClass}`}
                style={{
                  left: `${labelPos.leftPct}%`,
                  top: `${labelPos.topPct}%`,
                  transform: `translate(-50%, calc(-50% + ${labelVy}px))`,
                }}
              >
                <span className="block max-w-full truncate">{raw}</span>
                {!(feltSeatStacks && size === 'lg') ? (
                  <span className="mt-0.5 block max-w-full truncate font-mono tabular-nums text-casino-emerald text-[0.625rem] sm:text-[0.6875rem] md:text-xs lg:text-sm">
                    {formatVenueBankroll(chips)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function phaseLabel(ph: string) {
  if (ph === 'lobby') return 'Lobby'
  if (ph === 'question') return 'Question setup'
  if (ph === 'betting') return 'Wagering'
  if (ph === 'answering') return 'Answering'
  if (ph === 'reveal') return 'Reveal'
  if (ph === 'showdown') return 'Showdown'
  if (ph === 'payout') return 'Payout'
  if (ph === 'intermission') return 'Break'
  return ph
}

function phaseAccent(ph: string) {
  if (ph === 'answering') return 'text-amber-200 ring-1 ring-amber-400/50'
  if (ph === 'showdown') return 'text-yellow-300 ring-1 ring-yellow-400/35'
  if (ph === 'question') return 'text-emerald-200/95'
  return 'text-white/85'
}

type VenueMosaicTileMode = 'grid' | 'hero' | 'crawl'

function VenueMosaicTableCard({
  row,
  mode,
  idx,
  skipMountIntro,
  isSpotlightThumb,
}: {
  row: DisplayVenueTileSnapshot
  mode: VenueMosaicTileMode
  idx: number
  skipMountIntro?: boolean
  isSpotlightThumb?: boolean
}) {
  const tn = row.tableNum
  const seats = row.seated
  const pot = row.pot
  const ph = row.phase
  const seatNames = padSeatNames(row.seatNames)
  const seatBankrolls = padSeatBankrolls(row.seatBankrolls)

  if (mode === 'crawl') {
    const spotlight = isSpotlightThumb === true
    const rowShell = spotlight
      ? 'border-amber-400/70 bg-black/55 ring-2 ring-amber-400/45 shadow-[0_0_20px_rgba(251,191,36,0.12)]'
      : 'border-white/[0.12] bg-black/35'

    let totalChips = 0
    const filledNames: string[] = []
    for (let i = 0; i < VENUE_SEAT_SLOTS; i++) {
      const nm = seatNames[i]?.trim()
      if (nm) {
        filledNames.push(nm)
        totalChips += seatBankrolls[i] ?? 0
      }
    }
    const openSeats = Math.max(0, VENUE_SEAT_SLOTS - seats)
    const rosterChips =
      filledNames.length === 0 ? null : (
        <ul className="list-none flex flex-wrap gap-1.5" aria-label={`Players at table ${tn}`}>
          {filledNames.map((nm, ri) => (
            <li
              key={`${tn}-r-${ri}-${nm}`}
              className="min-w-0 max-w-[min(100%,14rem)] rounded-full border border-white/[0.14] bg-black/40 px-2.5 py-1 text-[11px] font-semibold leading-snug text-white/90 shadow-sm sm:px-3 sm:text-xs"
            >
              <span className="block break-words">{nm}</span>
            </li>
          ))}
        </ul>
      )

    return (
      <div
        data-spotlight-tile={tn}
        role="group"
        aria-current={spotlight ? 'true' : undefined}
        className={`flex w-full min-w-0 gap-3 rounded-xl border p-3 backdrop-blur-md sm:gap-3.5 sm:p-3.5 ${rowShell}`}
      >
        <div
          className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl sm:h-14 sm:w-14 ${
            spotlight
              ? 'bg-amber-500/35 text-amber-50'
              : 'bg-white/[0.08] text-yellow-400'
          }`}
        >
          <span className="text-[9px] font-semibold uppercase leading-none tracking-wider text-white/55 sm:text-[10px]">
            Tbl
          </span>
          <span
            className={`font-black tabular-nums leading-none ${spotlight ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}
          >
            {tn}
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="text-base font-bold leading-snug text-white/95 sm:text-lg">Table {tn}</span>
            <span
              className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase leading-tight sm:text-xs ${phaseAccent(ph)}`}
            >
              {phaseLabel(ph)}
            </span>
          </div>
          <p className="text-sm leading-snug text-white/75 sm:text-base">
            <span className="font-mono font-semibold tabular-nums text-casino-emerald">
              {seats} / {VENUE_SEAT_SLOTS} seated
            </span>
            {openSeats > 0 ? (
              <span className="text-white/45"> · {openSeats} seat{openSeats !== 1 ? 's' : ''} open</span>
            ) : (
              <span className="text-white/45"> · full</span>
            )}
          </p>
          <p className="text-sm text-white/80 sm:text-base">
            <span className="text-white/55">Local pot</span>{' '}
            <span className="font-mono font-semibold tabular-nums text-yellow-200">${pot.toLocaleString()}</span>
            <span className="mx-1.5 text-white/30 sm:mx-2">·</span>
            <span className="text-white/55">Chips on table</span>{' '}
            <span className="font-mono font-semibold tabular-nums text-white/90">
              {formatVenueBankroll(totalChips)}
            </span>
          </p>
          {rosterChips != null ? (
            <div className="mt-1.5 text-white/92">{rosterChips}</div>
          ) : (
            <p className="text-xs leading-snug text-white/50 sm:text-sm">No players at this table yet</p>
          )}
        </div>
      </div>
    )
  }

  if (mode === 'hero') {
    const totalChips = totalChipsFromSeats(seatNames, seatBankrolls)

    return (
      <motion.article
        data-spotlight-tile={tn}
        role="region"
        aria-label={`Table ${tn}, seating`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ zoom: VENUE_SEATING_SPOTLIGHT_HERO_ZOOM }}
        className="mx-auto flex w-full max-w-full shrink-0 flex-col overflow-hidden rounded-2xl border-2 border-amber-500/45 bg-black/60 px-3 pb-3 pt-1 shadow-2xl backdrop-blur-md ring-2 ring-amber-400/20 sm:px-4 sm:pb-4 sm:pt-1.5 md:px-5"
      >
        <div className="-mt-1 shrink-0 pb-px">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold uppercase tracking-[0.14em] text-white/65 sm:text-lg">
                Table
              </div>
              <div className="-mt-1 text-[2.8925rem] font-black tabular-nums leading-[0.88] text-yellow-400 sm:text-[3.415rem] md:text-[3.8925rem] lg:text-[5.655rem]">
                {tn}
              </div>
            </div>
            <span
              className={`max-w-[min(11rem,46%)] shrink-0 truncate rounded-lg px-2.5 py-1.5 text-sm font-bold uppercase leading-snug sm:max-w-[12rem] sm:rounded-xl sm:px-3 sm:py-2 sm:text-base md:text-lg ${phaseAccent(ph)}`}
            >
              {phaseLabel(ph)}
            </span>
          </div>
        </div>

        <div className="-translate-y-3 flex shrink-0 flex-col items-center justify-start overflow-x-hidden px-1 pb-px pt-0 sm:-translate-y-4 md:-translate-y-5">
          <SeatRingWithLabels
            seatedCount={seats}
            seatNames={seatNames}
            seatBankrolls={seatBankrolls}
            size="lg"
            feltSeatStacks
          />
        </div>

        <dl className="relative z-[4] mt-1.5 shrink-0 space-y-1 border-t border-white/10 bg-black/55 pt-2 text-[1.125rem] leading-snug backdrop-blur-sm sm:mt-2 sm:space-y-1.5 sm:pt-2.5 sm:text-xl md:text-2xl lg:text-[2.08rem]">
          <div className="flex justify-between gap-3">
            <dt className="font-semibold text-white/70">Occupied seats</dt>
            <dd className="font-mono font-bold tabular-nums text-casino-emerald">
              {seats} / 8
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-semibold text-white/70">Pot (local)</dt>
            <dd className="font-mono font-bold tabular-nums text-yellow-300">${pot.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-semibold text-white/70">Chips on table</dt>
            <dd className="font-mono font-bold tabular-nums text-white/90">{formatVenueBankroll(totalChips)}</dd>
          </div>
        </dl>
      </motion.article>
    )
  }

  return (
    <motion.article
      data-spotlight-tile={tn}
      initial={skipMountIntro ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: skipMountIntro ? 0 : idx * 0.045,
        duration: skipMountIntro ? 0 : 0.35,
      }}
      className="flex flex-col rounded-xl border-2 border-yellow-700/35 bg-black/55 p-4 shadow-lg backdrop-blur-md sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-semibold uppercase tracking-[0.12em] text-white/60 sm:text-lg md:text-xl">
            Table
          </div>
          <div className="text-6xl font-black tabular-nums leading-none text-yellow-400 sm:text-7xl lg:text-8xl">
            {tn}
          </div>
        </div>
        <span
          className={`max-w-[min(10rem,48%)] shrink-0 truncate rounded-lg px-2.5 py-1.5 text-sm font-bold uppercase leading-tight sm:max-w-none sm:px-3.5 sm:py-2 sm:text-base md:text-lg ${phaseAccent(ph)}`}
        >
          {phaseLabel(ph)}
        </span>
      </div>

      <div className="mt-3 flex-shrink-0">
        <SeatRingWithLabels
          seatedCount={seats}
          seatNames={seatNames}
          seatBankrolls={seatBankrolls}
        />
      </div>

      <dl className="mt-4 space-y-2 border-t border-white/10 pt-4 text-lg leading-snug sm:text-xl md:text-2xl lg:text-3xl">
        <div className="flex justify-between gap-3">
          <dt className="font-semibold text-white/70">Occupied seats</dt>
          <dd className="font-mono font-bold tabular-nums text-casino-emerald">
            {seats} / 8
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-semibold text-white/70">Pot (local)</dt>
          <dd className="font-mono font-bold tabular-nums text-yellow-300">${pot.toLocaleString()}</dd>
        </div>
      </dl>
    </motion.article>
  )
}

/** Latin-first sort key: leading word of the display name (first name). */
function firstNameSortKey(displayName: string): string {
  const t = displayName.trim()
  if (!t) return ''
  const w = t.split(/\s+/)[0]
  return w ?? t
}

function rosterRowsFromTiles(
  tiles: DisplayVenueTileSnapshot[]
): { name: string; tableNum: number; bankroll: number }[] {
  const out: { name: string; tableNum: number; bankroll: number }[] = []
  for (const t of tiles) {
    const sn = t.seatNames
    const br = padSeatBankrolls(t.seatBankrolls)
    if (sn == null || sn.length === 0) continue
    for (let i = 0; i < sn.length; i++) {
      const raw = sn[i]?.trim()
      if (raw) out.push({ name: raw, tableNum: t.tableNum, bankroll: br[i] ?? 0 })
    }
  }
  out.sort((a, b) => {
    const cmp = firstNameSortKey(a.name).localeCompare(firstNameSortKey(b.name), undefined, {
      sensitivity: 'base',
    })
    if (cmp !== 0) return cmp
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
  return out
}

function VenueScrollingRoster({ tiles }: { tiles: DisplayVenueTileSnapshot[] }) {
  const rows = useMemo(() => rosterRowsFromTiles(tiles), [tiles])
  if (rows.length === 0) return null

  const durationSec = Math.max(28, Math.min(120, rows.length * 2.2))
  const doubled = [...rows, ...rows]

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-20 flex flex-col border-l border-yellow-600/50 bg-slate-950/94 shadow-[-8px_0_28px_rgba(0,0,0,0.4)] backdrop-blur-md ${VENUE_CRAWL_STRIP_CLASS}`}
      aria-label="Players and table assignments"
    >
      <div className="shrink-0 border-b border-white/10 px-3 py-3.5 sm:px-4 sm:py-4">
        <h2 className="text-2xl font-bold leading-none tracking-tight text-white/92 sm:text-3xl">
          Seating
        </h2>
      </div>
      <div
        className="relative min-h-0 flex-1 overflow-hidden px-2 py-1.5 sm:px-3 sm:py-2"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        <div
          className="venue-roster-animate flex flex-col gap-0"
          style={{ ['--venue-roster-secs' as string]: `${durationSec}s` }}
        >
          {doubled.map((r, idx) => (
            <div
              key={`${r.tableNum}-${r.name}-${idx}`}
              className="w-full min-w-0 border-b border-white/[0.08] py-3 sm:py-3.5"
              aria-label={`${r.name}, ${formatVenueBankroll(r.bankroll)}, Table ${r.tableNum}`}
            >
              <div className="w-full min-w-0 truncate text-xl font-bold leading-[1.15] text-white/95 sm:text-2xl md:text-3xl">
                {r.name}
              </div>
              <div className="mt-1 flex w-full min-w-0 items-baseline justify-between gap-2">
                <span className="min-w-0 flex-1 truncate font-mono text-sm font-bold tabular-nums tracking-tight text-yellow-400/92 sm:text-base">
                  Table {r.tableNum}
                </span>
                <span className="shrink-0 text-right font-mono text-lg font-bold tabular-nums leading-none text-casino-emerald sm:text-xl">
                  {formatVenueBankroll(r.bankroll)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

/** Fixed left strip — same width/height treatment as {@link VenueScrollingRoster}. */
function VenueAllTablesCrawl({
  tiles,
  spotlightTableNum,
  prefersReducedMotion,
}: {
  tiles: DisplayVenueTileSnapshot[]
  spotlightTableNum: number
  prefersReducedMotion: boolean
}) {
  const durationSec = Math.max(36, Math.min(120, Math.max(1, tiles.length) * 8))
  const doubled = useMemo(() => [...tiles, ...tiles], [tiles])

  const viewportRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [allTablesFit, setAllTablesFit] = useState(true)

  const recalcFit = useCallback(() => {
    const vp = viewportRef.current
    const ms = measureRef.current
    if (!vp || !ms) return
    setAllTablesFit(ms.scrollHeight <= vp.clientHeight + 2)
  }, [tiles, spotlightTableNum])

  useLayoutEffect(() => {
    recalcFit()
  }, [recalcFit])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => recalcFit())
    ro.observe(vp)
    window.addEventListener('resize', recalcFit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recalcFit)
    }
  }, [recalcFit])

  const showCrawlAnimation = !prefersReducedMotion && !allTablesFit
  const edgeFadeMask =
    !allTablesFit
      ? {
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
        }
      : undefined

  const tableRow = (row: (typeof tiles)[0], idx: number, key: string) => (
    <VenueMosaicTableCard
      key={key}
      row={row}
      mode="crawl"
      idx={idx}
      skipMountIntro
      isSpotlightThumb={row.tableNum === spotlightTableNum}
    />
  )

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 flex flex-col border-r border-yellow-600/50 bg-slate-950/94 shadow-[8px_0_28px_rgba(0,0,0,0.4)] backdrop-blur-md ${VENUE_CRAWL_STRIP_CLASS}`}
      aria-label="All tables"
    >
      <div className="shrink-0 border-b border-white/10 px-3 py-3.5 sm:px-4 sm:py-4">
        <h2 className="text-2xl font-bold leading-none tracking-tight text-white/92 sm:text-3xl">
          All tables
        </h2>
      </div>
      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 overflow-hidden px-2 py-1.5 sm:px-3 sm:py-2"
        style={edgeFadeMask}
      >
        {/* Off-screen column: height must match visible copy so we know if everything fits */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 -z-10 opacity-0"
          aria-hidden
        >
          <div ref={measureRef} className="flex flex-col gap-3">
            {tiles.map((row, idx) => tableRow(row, idx, `measure-${row.tableNum}`))}
          </div>
        </div>

        {prefersReducedMotion ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain py-1">
            {tiles.map((row, idx) => tableRow(row, idx, `a11y-${row.tableNum}`))}
          </div>
        ) : showCrawlAnimation ? (
          <div
            className="venue-roster-animate flex flex-col gap-3"
            style={{ ['--venue-roster-secs' as string]: `${durationSec}s` }}
          >
            {doubled.map((row, idx) =>
              tableRow(row, idx, `crawl-${row.tableNum}-${idx}`)
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 py-1">
            {tiles.map((row, idx) => tableRow(row, idx, `fit-${row.tableNum}`))}
          </div>
        )}
      </div>
    </aside>
  )
}

type VenueEightTablesPreviewProps = {
  /** null until first `displayVenueSnapshot` from socket */
  wall: DisplayVenueWallSnapshot | null
  /**
   * Skip Framer entrance on header / headline / tiles (mosaic briefly unmounts when
   * fullscreen felt covers it — replaying fades looks like a glitch).
   */
  skipMountIntro?: boolean
}

/**
 * Mosaic rows mirror each table session on the server; spotlight opens the matching full felt.
 * Headline shows only live question text + countdown from the server snapshot.
 * While **every** felt is still in **lobby** (pre-start), or when showing the **rehearsal** preview
 * without a live wall, the grid becomes a **seating spotlight tour**: one enlarged table on a timer
 * **All tables** is a fixed left crawl (same strip width/height as the players roster) when in this mode.
 */
export default function VenueEightTablesPreview({ wall, skipMountIntro = false }: VenueEightTablesPreviewProps) {
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null)
  const [seatingHeroIdx, setSeatingHeroIdx] = useState(0)
  const [seatingCycleTick, setSeatingCycleTick] = useState(0)
  const prefersReducedMotion = usePrefersReducedMotion()
  const seatingCycleStartRef = useRef(0)

  const headlineQuestionText = wall?.headlineQuestionText ?? null
  const answerDeadlineMs = wall?.answerDeadlineMs ?? null

  useEffect(() => {
    if (answerDeadlineMs == null) {
      setTimerSeconds(null)
      return
    }
    const tick = () =>
      setTimerSeconds(Math.max(0, Math.ceil((answerDeadlineMs - Date.now()) / 1000)))
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [answerDeadlineMs])

  const tileRows: DisplayVenueTileSnapshot[] =
    wall?.tiles != null && wall.tiles.length > 0
      ? [...wall.tiles].sort((a, b) => a.tableNum - b.tableNum)
      : wall?.tiles != null && wall.tiles.length === 0
        ? []
        : DISPLAY_PREVIEW_TABLES.map((snap, i) => {
            const seated = snap.seated
            const base = i * VENUE_SEAT_SLOTS
            const seatNames = Array.from({ length: VENUE_SEAT_SLOTS }, (_, j) =>
              j < seated ? rehearsalSeatDisplayName(base + j) : ''
            )
            const seatBankrolls = Array.from({ length: VENUE_SEAT_SLOTS }, (_, j) =>
              j < seated
                ? DISPLAY_PREVIEW_BANKROLLS[j % DISPLAY_PREVIEW_BANKROLLS.length]!
                : 0
            )
            return {
              tableNum: i + 1,
              seated,
              pot: snap.pot,
              phase: DISPLAY_PREVIEW_SYNCED_PHASE,
              seatNames,
              seatBankrolls,
            }
          })

  const hasLiveWall =
    wall != null && wall.tiles != null && wall.tiles.length > 0
  const showHeadline =
    hasLiveWall && (headlineQuestionText != null || answerDeadlineMs != null)

  const allTablesInLobby =
    tileRows.length > 0 && tileRows.every((t) => t.phase === 'lobby')
  /** Pre-start: all felts still in lobby, or rehearsal preview without a live snapshot. */
  const showSeatingSpotlightCycle =
    tileRows.length > 0 && (hasLiveWall ? allTablesInLobby : true)

  const seatingHeroRow = tileRows[seatingHeroIdx] ?? tileRows[0]

  useEffect(() => {
    setSeatingHeroIdx((i) => Math.min(i, Math.max(0, tileRows.length - 1)))
  }, [tileRows.length])

  useEffect(() => {
    if (!showSeatingSpotlightCycle || prefersReducedMotion || tileRows.length <= 1)
      return undefined
    const id = window.setInterval(() => {
      setSeatingHeroIdx((i) => (i + 1) % tileRows.length)
    }, SEATING_SPOTLIGHT_CYCLE_SEC * 1000)
    return () => window.clearInterval(id)
  }, [showSeatingSpotlightCycle, prefersReducedMotion, tileRows.length])

  useLayoutEffect(() => {
    seatingCycleStartRef.current = Date.now()
  }, [seatingHeroIdx])

  useEffect(() => {
    if (!showSeatingSpotlightCycle || prefersReducedMotion || tileRows.length <= 1)
      return undefined
    const id = window.setInterval(() => setSeatingCycleTick((n) => n + 1), 50)
    return () => window.clearInterval(id)
  }, [showSeatingSpotlightCycle, prefersReducedMotion, tileRows.length, seatingHeroIdx])

  const seatingCycleProgress = useMemo(() => {
    if (prefersReducedMotion || tileRows.length <= 1) return 0
    const elapsed = Date.now() - seatingCycleStartRef.current
    return Math.min(1, elapsed / (SEATING_SPOTLIGHT_CYCLE_SEC * 1000))
  }, [seatingCycleTick, seatingHeroIdx, prefersReducedMotion, tileRows.length])

  const showRoster = rosterRowsFromTiles(tileRows).length > 0

  return (
    <div
      className={`relative min-h-screen overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white ${
        showSeatingSpotlightCycle ? VENUE_CRAWL_PL_CLASS : ''
      } ${showRoster ? VENUE_CRAWL_PR_CLASS : ''}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(139,69,19,0.25) 2px, transparent 2px),
              linear-gradient(45deg, transparent 47%, rgba(160,82,45,0.12) 50%, transparent 53%)
            `,
            backgroundSize: '48px 48px, 64px 64px',
          }}
        />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-transparent px-4 py-2 sm:px-6 sm:py-2.5">
        <motion.div
          className="mx-auto flex w-full max-w-[1600px] justify-center"
          initial={skipMountIntro ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex min-w-0 justify-center">
            <div
              className="max-w-full w-[calc(min(86vw,(min(1600px,100vw)-2rem)*0.92)*0.96)] sm:w-[calc((min(1600px,100vw)-2rem-1.25rem)*0.48)] lg:w-[calc((min(1600px,100vw)-2rem-3.75rem)*0.24)]"
              style={{ aspectRatio: '958 / 592' }}
            >
              <QuizzEmWordmark layout="fill" />
            </div>
          </div>
        </motion.div>
      </header>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 pt-5 sm:px-6 sm:pt-6">
        {showHeadline ? (
          <motion.section
            className="mb-8 rounded-2xl border-2 border-casino-emerald/40 bg-black/65 p-6 shadow-[0_0_40px_rgba(0,255,180,0.08)] backdrop-blur-md sm:p-8"
            initial={skipMountIntro ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:gap-10">
              {headlineQuestionText ? (
                <p className="flex-1 text-balance text-center text-5xl font-bold leading-snug text-yellow-400 sm:text-left md:text-6xl lg:text-7xl">
                  {headlineQuestionText}
                </p>
              ) : (
                <div className="hidden flex-1 lg:block" aria-hidden />
              )}
              {answerDeadlineMs != null && typeof timerSeconds === 'number' ? (
                <div
                  className={`flex min-w-[9.5rem] shrink-0 flex-col items-center justify-center self-center rounded-xl border px-7 py-6 lg:self-stretch lg:justify-center ${
                    timerSeconds <= 10
                      ? 'border-amber-400/60 bg-amber-950/40 shadow-[0_0_28px_rgba(251,191,36,0.12)]'
                      : 'border-amber-500/35 bg-amber-950/30'
                  }`}
                >
                  <div className="font-mono text-8xl font-black tabular-nums tracking-tight text-amber-200 sm:text-9xl">
                    {timerSeconds}s
                  </div>
                </div>
              ) : null}
            </div>
          </motion.section>
        ) : null}
      </div>

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 pb-12 sm:px-6">
        {wall != null && tileRows.length === 0 ? (
          <motion.div
            className="rounded-2xl border border-yellow-700/35 bg-black/55 p-10 text-center shadow-xl backdrop-blur-md sm:p-14"
            initial={skipMountIntro ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-4xl font-semibold leading-snug text-white/92 sm:text-5xl md:text-6xl">
              Felts open here after the host assigns players from the lobby.
            </p>
            <p className="mx-auto mt-5 max-w-2xl text-2xl leading-relaxed text-white/65 sm:text-3xl md:text-4xl">
              Guests can keep joining from the briefing screen until seating runs.
            </p>
          </motion.div>
        ) : showSeatingSpotlightCycle && seatingHeroRow ? (
          <section
            aria-label="Seating spotlight tour"
            className="mx-auto flex max-h-[calc(100dvh-11.25rem)] min-h-0 w-full max-w-[min(1024px,min(96dvw,100%))] flex-col gap-3 overflow-hidden sm:gap-4"
          >
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              Spotlight showing table {seatingHeroRow.tableNum}
            </p>
            <div className="flex w-full min-w-0 shrink-0 justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <VenueMosaicTableCard
                  key={seatingHeroRow.tableNum}
                  row={seatingHeroRow}
                  mode="hero"
                  idx={0}
                  skipMountIntro={skipMountIntro}
                />
              </AnimatePresence>
            </div>
            <div className="shrink-0 space-y-3 sm:space-y-4">
              <p className="text-center text-sm text-white/50 sm:text-base md:text-lg">
                {prefersReducedMotion
                  ? `Seating spotlight — Table ${seatingHeroRow.tableNum} (auto-rotation off: reduced motion)`
                  : `Rotating seating · Table ${seatingHeroRow.tableNum} · ${seatingHeroIdx + 1} of ${tileRows.length}`}
              </p>
              {!prefersReducedMotion && tileRows.length > 1 ? (
                <div className="mx-auto max-w-3xl">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs text-white/50 sm:text-sm">
                    <span className="font-semibold uppercase tracking-wider text-white/45">Next table</span>
                    <span className="font-mono tabular-nums text-amber-200/90">
                      {Math.max(
                        0,
                        Math.ceil((1 - seatingCycleProgress) * SEATING_SPOTLIGHT_CYCLE_SEC)
                      )}
                      s
                    </span>
                  </div>
                  <div
                    className="h-2.5 w-full overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(seatingCycleProgress * 100)}
                    aria-label="Seating tour progress until the next table"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-700/95 to-amber-300/95"
                      style={{ width: `${seatingCycleProgress * 100}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-4">
            {tileRows.map((row, idx) => (
              <VenueMosaicTableCard
                key={row.tableNum}
                row={row}
                mode="grid"
                idx={idx}
                skipMountIntro={skipMountIntro}
              />
            ))}
          </div>
        )}
      </main>
      {showSeatingSpotlightCycle && seatingHeroRow ? (
        <VenueAllTablesCrawl
          tiles={tileRows}
          spotlightTableNum={seatingHeroRow.tableNum}
          prefersReducedMotion={prefersReducedMotion}
        />
      ) : null}
      {showRoster ? <VenueScrollingRoster tiles={tileRows} /> : null}
    </div>
  )
}
