import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import {
  displayBettingPhaseLabel,
  isVenueTileWageringPaused,
  venueTileActingSeatIndex,
} from '@qhe/core'
import type { DisplayVenueTileSnapshot, DisplayVenueWallSnapshot, SeatBettingAction } from '@qhe/net'

import seatChipStackImg from './assets/seat-chip-stack.png'
import DisplayTableLive from './App.tsx'
import type { VenueFeaturedWatch } from './useVenueWallFeaturedWatch.ts'
import ShowdownResultsPanel from './ShowdownResultsPanel'
import VenueMultiTableShowdown from './VenueMultiTableShowdown'
import {
  showdownCorrectAnswerFromTile,
  showdownRowsFromTile,
  sortShowdownRowsByDistance,
} from './showdownDisplay'
import {
  buildVenueWallTileRows,
  SEATING_SPOTLIGHT_CYCLE_SEC,
  SHOWDOWN_SPOTLIGHT_CYCLE_SEC,
  shouldUseVenueShowdownWall,
  VENUE_WALL_SEAT_SLOTS,
} from './venueWallModel'
import {
  capsuleBorderRadiusCss,
  capsuleBoundaryHitPx,
  seatDotCenterOnRailPct,
} from './tableRimGeometry'

const VENUE_SEAT_SLOTS = VENUE_WALL_SEAT_SLOTS

/** Same diamond floor as {@link DisplayTableLive} — keeps felt + tour chrome visually one panel. */
const VENUE_HERO_CARPET_STYLE: CSSProperties = {
  backgroundImage: `
      radial-gradient(circle at 25% 25%, rgba(139, 69, 19, 0.3) 3px, transparent 3px),
      radial-gradient(circle at 75% 75%, rgba(160, 82, 45, 0.3) 3px, transparent 3px),
      linear-gradient(45deg, transparent 48%, rgba(139, 69, 19, 0.15) 49%, rgba(139, 69, 19, 0.15) 51%, transparent 52%),
      linear-gradient(-45deg, transparent 48%, rgba(160, 82, 45, 0.15) 49%, rgba(160, 82, 45, 0.15) 51%, transparent 52%)
    `,
  backgroundSize: '40px 40px, 40px 40px, 80px 80px, 80px 80px',
  backgroundPosition: '0 0, 20px 20px, 0 0, 0 0',
}

/** Stacking inside each mini felt ({@link SeatRingWithLabels}): name + bankroll beside name always top; then center hint, badges, pile, rim. */
const SEAT_LAYER_DOT = 'z-[20]'
const SEAT_LAYER_FELT_CHIP_PILE = 'z-[115]'
const SEAT_LAYER_BLIND_OUT = 'z-[117]'
const SEAT_LAYER_ACTION_PANEL = 'z-[118]'
const SEAT_LAYER_NAME_CLUSTER = 'z-[120]'

/** Fixed crawl strips (Players + All tables): keep widths and page padding in sync */
const VENUE_CRAWL_STRIP_CLASS = 'w-80 sm:w-[22rem] lg:w-96'

/** Mirror {@link VENUE_CRAWL_STRIP_CLASS} for main shell horizontal padding when crawls mount */
const VENUE_CRAWL_PL_CLASS = 'pl-80 sm:pl-[22rem] lg:pl-96'
const VENUE_CRAWL_PR_CLASS = 'pr-80 sm:pr-[22rem] lg:pr-96'

/** Matches fixed aside edges — constrain full-bleed footers/tour dock to center column only. */
const VENUE_CENTER_BAND_LEFT_EDGE = 'left-80 sm:left-[22rem] lg:left-96'
const VENUE_CENTER_BAND_RIGHT_EDGE = 'right-80 sm:right-[22rem] lg:right-96'

/** Venue hero center column: ~10% smaller than legacy layout so side crawls + table read cleaner together. */
const VENUE_HERO_MAIN_MAX_W = 'max-w-[1440px]' // ×0.9 of 1600px
/** Embedded {@link DisplayTableLive} viewport height; keep in sync with {@link VENUE_HERO_FELT_MIN_H}. */
const VENUE_HERO_FELT_VPORT_H = 'h-[min(76.5dvh,846px)]' // ×0.9 of min(85dvh,940px)
const VENUE_HERO_FELT_MIN_H = 'min-h-[min(360px,43.2dvh)]' // ×0.9 of min(400px,48dvh)

/** Pre-start seating tour: one table hero + thumbnails; seconds per table. */

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

/** Toward-table-center hint by the acting seat: call amount only (active player only). */
function formatActingCallHint(amount: number): string {
  if (amount <= 0) return 'No call to match'
  return `Call ${formatVenueBankroll(amount)}`
}

/** Caption under Pot (local) on mosaic tiles — e.g. “Pat Q. to call: $40”. */
function mosaicPotSubtitleActingToCall(args: {
  actingSeatIndex: number | null
  seatNames: string[]
  actingCallAmount: number | null | undefined
}): string | null {
  if (args.actingSeatIndex == null) return null
  if (args.actingCallAmount == null || typeof args.actingCallAmount !== 'number') return null
  const seat = args.actingSeatIndex
  if (seat < 0 || seat >= VENUE_SEAT_SLOTS) return null
  const raw = args.seatNames[seat]?.trim() ?? ''
  const name = raw || `Seat ${seat + 1}`
  return `${name} to call: ${formatVenueBankroll(args.actingCallAmount)}`
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

/** Matches server `seatFolded` (or false when absent). */
function padSeatFolded(raw: boolean[] | undefined): boolean[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => raw?.[i] === true)
}

function padSeatLastBettingAction(
  raw: (SeatBettingAction | null | undefined)[] | undefined
): (SeatBettingAction | null)[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    const v = raw?.[i]
    if (v === 'check' || v === 'call' || v === 'raise' || v === 'fold' || v === 'allIn') return v
    return null
  })
}

const SEAT_BETTING_ACTION_LABELS: Record<SeatBettingAction, string> = {
  check: 'CHECK',
  call: 'CALL',
  raise: 'RAISE',
  fold: 'FOLD',
  allIn: 'ALL-IN',
}

const SEAT_BETTING_ACTION_PILL_CLASS: Record<SeatBettingAction, string> = {
  check: 'border-slate-400/45 bg-slate-900/92 text-slate-100',
  call: 'border-sky-500/40 bg-sky-950/90 text-sky-100',
  raise: 'border-amber-500/45 bg-amber-950/90 text-amber-100',
  fold: 'border-rose-400/45 bg-rose-950/92 text-rose-100',
  allIn: 'border-violet-500/45 bg-violet-950/90 text-violet-100',
}

function seatBettingActionLabel(action: SeatBettingAction): string {
  return SEAT_BETTING_ACTION_LABELS[action]
}

function seatBettingActionPillClass(action: SeatBettingAction): string {
  return SEAT_BETTING_ACTION_PILL_CLASS[action]
}

/** Mini-table wrapper aspect (width / height). */
const VENUE_RING_ASPECT_MD = 11 / 5
const VENUE_RING_ASPECT_LG = 14 / 8

/** Amber rail — mosaic uses full wrapper; full mode insets slightly. */
const VENUE_RAIL_INSET_TOP = 0.02
const VENUE_RAIL_INSET_RIGHT = 0.02
const VENUE_RAIL_INSET_BOTTOM = 0.02
const VENUE_RAIL_INSET_LEFT = 0.02
const VENUE_RAIL_INSET_MOSAIC = 0

/** Green felt inset inside the rail. */
const VENUE_FELT_INSET_TOP = 0.1
const VENUE_FELT_INSET_RIGHT = 0.06
const VENUE_FELT_INSET_BOTTOM = 0.13
const VENUE_FELT_INSET_LEFT = 0.06

function venueRailBoundsFrac() {
  const innerW = 1 - VENUE_RAIL_INSET_LEFT - VENUE_RAIL_INSET_RIGHT
  const innerH = 1 - VENUE_RAIL_INSET_TOP - VENUE_RAIL_INSET_BOTTOM
  return {
    cx: VENUE_RAIL_INSET_LEFT + innerW / 2,
    cy: VENUE_RAIL_INSET_TOP + innerH / 2,
    halfW: innerW / 2,
    halfH: innerH / 2,
    innerW,
    innerH,
  }
}

function venueFeltBoundsFrac() {
  const innerW = 1 - VENUE_FELT_INSET_LEFT - VENUE_FELT_INSET_RIGHT
  const innerH = 1 - VENUE_FELT_INSET_TOP - VENUE_FELT_INSET_BOTTOM
  return {
    cx: VENUE_FELT_INSET_LEFT + innerW / 2,
    cy: VENUE_FELT_INSET_TOP + innerH / 2,
    halfW: innerW / 2,
    halfH: innerH / 2,
    innerW,
    innerH,
  }
}

function venueSeatRimPxAndOutwardNormal(
  seatIndex: number,
  w: number,
  h: number,
  radialScale: number,
  target: 'rail' | 'felt' = 'rail'
): { rimX: number; rimY: number; ux: number; uy: number } {
  const bounds = target === 'rail' ? venueRailBoundsFrac() : venueFeltBoundsFrac()
  const cx = bounds.cx * w
  const cy = bounds.cy * h
  const halfW = bounds.halfW * w
  const halfH = bounds.halfH * h
  const θ = seatThetaRad(seatIndex)
  const hit = capsuleBoundaryHitPx(cx, cy, halfW, halfH, Math.cos(θ), Math.sin(θ))
  if (!hit) return { rimX: cx, rimY: cy, ux: 0, uy: -1 }
  return {
    rimX: cx + (hit.x - cx) * radialScale,
    rimY: cy + (hit.y - cy) * radialScale,
    ux: hit.nx,
    uy: hit.ny,
  }
}

/**
 * Seat rim in wrapper %. Seat index 0 at clock top; advances CCW when viewed from above.
 * @param radialScale 1 = on rail outer boundary, < 1 inward toward center.
 */
function venueSeatRimPct(
  seatIndex: number,
  radialScale: number,
  w = 0,
  h = 0,
  target: 'rail' | 'felt' = 'rail'
): { leftPct: number; topPct: number } {
  const aspect = w > 0 && h > 0 ? w / h : VENUE_RING_ASPECT_MD
  const ww = w > 0 ? w : 260 * aspect
  const hh = h > 0 ? h : 260
  const { rimX, rimY } = venueSeatRimPxAndOutwardNormal(seatIndex, ww, hh, radialScale, target)
  return { leftPct: (rimX / ww) * 100, topPct: (rimY / hh) * 100 }
}

/** Polar angle θ for seat i (matches {@link venueSeatRimPct}). */
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

type VenueWallBlindSeats = {
  dealerSeatIndex: number | null
  smallBlindSeatIndex: number | null
  bigBlindSeatIndex: number | null
}

function blindTagsForSeat(seatIndex: number, blindSeats: VenueWallBlindSeats) {
  const out: { key: string; label: string; short: string; pill: string }[] = []
  if (blindSeats.dealerSeatIndex === seatIndex) {
    out.push({
      key: 'btn',
      label: 'Dealer button',
      short: 'BTN',
      pill: 'border-amber-700/40 bg-amber-400 text-black shadow-sm',
    })
  }
  if (blindSeats.smallBlindSeatIndex === seatIndex) {
    out.push({
      key: 'sb',
      label: 'Small blind',
      short: 'SB',
      pill: 'border-sky-900/35 bg-sky-500 text-white shadow-sm',
    })
  }
  if (blindSeats.bigBlindSeatIndex === seatIndex) {
    out.push({
      key: 'bb',
      label: 'Big blind',
      short: 'BB',
      pill: 'border-rose-900/40 bg-rose-600 text-white shadow-sm',
    })
  }
  return out
}

function venueTileBlindSeats(row: DisplayVenueTileSnapshot): VenueWallBlindSeats | null {
  if (
    row.dealerSeatIndex === undefined &&
    row.smallBlindSeatIndex === undefined &&
    row.bigBlindSeatIndex === undefined
  ) {
    return null
  }
  return {
    dealerSeatIndex: row.dealerSeatIndex ?? null,
    smallBlindSeatIndex: row.smallBlindSeatIndex ?? null,
    bigBlindSeatIndex: row.bigBlindSeatIndex ?? null,
  }
}

function venueTileActingSeat(row: DisplayVenueTileSnapshot): number | null {
  return venueTileActingSeatIndex(row)
}

function mosaicPhaseLabel(row: DisplayVenueTileSnapshot): string {
  const ph = String(row.phase ?? '').trim().toLowerCase()
  if (ph === 'betting' && row.seated >= 2 && isVenueTileWageringPaused(row)) {
    return displayBettingPhaseLabel({
      isBettingOpen: row.isBettingOpen ?? undefined,
      currentPlayerIndex: row.currentPlayerIndex ?? undefined,
    })
  }
  return phaseLabel(row.phase)
}

function mosaicPhaseAccent(row: DisplayVenueTileSnapshot): string {
  if (isVenueTileWageringPaused(row) && row.seated >= 2)
    return 'text-emerald-100 ring-1 ring-emerald-400/45'
  return phaseAccent(row.phase)
}

/** Corner phase pill: paused betting uses sentence case and may wrap — other phases stay compact uppercase. */
function mosaicPhaseCornerTypography(row: DisplayVenueTileSnapshot): string {
  if (isVenueTileWageringPaused(row) && row.seated >= 2)
    return 'font-bold leading-snug normal-case whitespace-normal hyphens-none'
  return 'font-bold uppercase leading-tight truncate'
}


/** Fallback label anchor when wrapper size unknown (SSR / first paint). */
function fallbackLabelEllipseScale(size: 'md' | 'lg', feltStacks: boolean): number {
  if (size === 'lg') return feltStacks ? 1.045 : 1.03
  return feltStacks ? 1.04 : 1.025
}

/** Dot diameters match Tailwind classes on seat markers ({@link SeatRingWithLabels}). */
function seatDotDiameterPx(
  rootRemPx: number,
  size: 'md' | 'lg',
  mosaic = false
): number {
  if (mosaic) return 1.25 * rootRemPx
  if (size !== 'lg') return 1.75 * rootRemPx
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
    venueSeatRimPxAndOutwardNormal(j, w, h, 1)
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
  ringMode = 'mosaic',
  feltSeatStacks = false,
  blindSeats = null,
  seatFolded: seatFoldedIn,
  actingSeatIndex = null,
  showSeatBettingActions = false,
  seatLastBettingAction: seatLastBettingActionIn,
  actingCallAmount,
}: {
  seatedCount: number
  seatNames: string[]
  seatBankrolls: number[]
  size?: 'md' | 'lg'
  /** `mosaic` = rail + seat dots only (crawl tiles); `full` = names, actions, and felt stacks. */
  ringMode?: 'mosaic' | 'full'
  /** Spotlight hero: draw mini chip stack + bankroll on the felt by each seated player. */
  feltSeatStacks?: boolean
  /** Dealer / blind roles (indexes match `seatNames`). Null when unsupported or omitted by server snapshot. */
  blindSeats?: VenueWallBlindSeats | null
  /** Folded seats this hand (same indexing as `seatNames`); absent means none. */
  seatFolded?: boolean[]
  /** Pulse this seat rim during open betting; null hides. Matches `seatNames` index. */
  actingSeatIndex?: number | null
  /** While wagering: show each seat’s latest check / call / raise / fold / all-in this street. */
  showSeatBettingActions?: boolean
  /** Parallel to `seatNames`; from server `seatLastBettingAction`. */
  seatLastBettingAction?: (SeatBettingAction | null)[]
  /** Active seat only: chips to call (venue snapshot). */
  actingCallAmount?: number | null
}) {
  const seatFolded = padSeatFolded(seatFoldedIn)
  const seatLastBettingAction = padSeatLastBettingAction(seatLastBettingActionIn)
  const prefersReducedMotion = usePrefersReducedMotion()
  const isMosaic = ringMode === 'mosaic'
  const ringAspect = size === 'lg' ? VENUE_RING_ASPECT_LG : VENUE_RING_ASPECT_MD
  const railInsetTop = isMosaic ? VENUE_RAIL_INSET_MOSAIC : VENUE_RAIL_INSET_TOP
  const railInsetRight = isMosaic ? VENUE_RAIL_INSET_MOSAIC : VENUE_RAIL_INSET_RIGHT
  const railInsetBottom = isMosaic ? VENUE_RAIL_INSET_MOSAIC : VENUE_RAIL_INSET_BOTTOM
  const railInsetLeft = isMosaic ? VENUE_RAIL_INSET_MOSAIC : VENUE_RAIL_INSET_LEFT
  const feltBounds = venueFeltBoundsFrac()
  /** Spotlight hero — wide capsule; mosaic tiles use smaller md ring below. */
  const lgRing =
    'mx-auto aspect-[14/8] h-auto max-h-[min(min(68svh,57dvh),36rem)] w-[min(100%,calc(100dvw-2.5rem),68rem)] max-w-full shrink-0'
  /** Mosaic crawl — wide flat-top capsule, fixed height. */
  const mdRing = isMosaic
    ? 'relative mx-auto aspect-[11/5] h-[9.5rem] w-full max-w-full shrink-0'
    : 'mx-auto aspect-[13/8] h-auto w-full max-w-[min(100%,22rem)] shrink-0 sm:max-w-[min(100%,23rem)]'
  const wrap = size === 'lg' ? lgRing : mdRing
  const dot = isMosaic
    ? 'h-[1.35rem] w-[1.35rem] border-[1.5px]'
    : size === 'lg'
      ? 'h-[2.8375rem] w-[2.8375rem] sm:h-[3.15rem] sm:w-[3.15rem]'
      : 'h-7 w-7'
  /** Larger rim marker for the player on the clock — reads from the back of the room. */
  const dotActing = isMosaic
    ? 'h-[1.65rem] w-[1.65rem] border-[2px] ring-2 ring-cyan-400/70'
    : size === 'lg'
      ? 'h-[3.5rem] w-[3.5rem] sm:h-16 sm:w-16 md:h-[4.25rem] md:w-[4.25rem]'
      : 'h-10 w-10 sm:h-11 sm:w-11'
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

  const labelAnchorsPct = useMemo(() => {
    if (isMosaic) {
      return Array.from({ length: VENUE_SEAT_SLOTS }, () => null as { leftPct: number; topPct: number } | null)
    }
    return computeSeatLabelAnchorsPct({
      w: ringPx.w,
      h: ringPx.h,
      size,
      feltSeatStacks,
      seatNames,
    })
  }, [feltSeatStacks, isMosaic, ringPx.h, ringPx.w, seatNames, size])

  const rimW = ringPx.w
  const rimH = ringPx.h
  const railW = rimW * (1 - railInsetLeft - railInsetRight)
  const railH = rimH * (1 - railInsetTop - railInsetBottom)
  const railBorderRadius =
    railW > 0 && railH > 0
      ? capsuleBorderRadiusCss(railW, railH)
      : capsuleBorderRadiusCss(220 * ringAspect, 220)
  const feltBorderRadius =
    rimW > 0 && rimH > 0
      ? capsuleBorderRadiusCss(
          rimW * feltBounds.innerW,
          rimH * feltBounds.innerH
        )
      : railBorderRadius

  const mosaicDotRadiusPx = isMosaic ? 10.8 : 0

  return (
    <div ref={ringElRef} className={`relative overflow-visible ${wrap}`}>
      <div
        className={`absolute border-amber-700/90 shadow-md ${
          size === 'lg'
            ? 'border-2 bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 sm:border-[3px]'
            : 'border-2 bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950'
        }`}
        style={{
          top: `${railInsetTop * 100}%`,
          right: `${railInsetRight * 100}%`,
          bottom: `${railInsetBottom * 100}%`,
          left: `${railInsetLeft * 100}%`,
          borderRadius: railBorderRadius,
        }}
      />
      <div
        className={`absolute border-amber-700/70 shadow-inner ${
          size === 'lg' ? 'border-2 sm:border-[3px]' : 'border-2'
        }`}
        style={{
          top: `${VENUE_FELT_INSET_TOP * 100}%`,
          right: `${VENUE_FELT_INSET_RIGHT * 100}%`,
          bottom: `${VENUE_FELT_INSET_BOTTOM * 100}%`,
          left: `${VENUE_FELT_INSET_LEFT * 100}%`,
          borderRadius: feltBorderRadius,
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
        const filled = i < seatedCount
        if (isMosaic && !filled) return null

        const seatRim =
          isMosaic && railW > 0 && railH > 0
            ? (() => {
                const railLeft = rimW * railInsetLeft
                const railTop = rimH * railInsetTop
                const local = seatDotCenterOnRailPct(
                  i,
                  VENUE_SEAT_SLOTS,
                  railW,
                  railH,
                  mosaicDotRadiusPx
                )
                return {
                  leftPct: ((railLeft + (local.leftPct / 100) * railW) / rimW) * 100,
                  topPct: ((railTop + (local.topPct / 100) * railH) / rimH) * 100,
                }
              })()
            : venueSeatRimPct(i, 1, rimW, rimH)
        const chipPos = venueSeatRimPct(i, chipInnerScale, rimW, rimH, 'felt')
        const anchored = labelAnchorsPct[i]
        const fb = fallbackLabelEllipseScale(size, Boolean(feltSeatStacks && size === 'lg'))
        const fallbackPos = venueSeatRimPct(i, fb, rimW, rimH)
        const labelPos = anchored ?? fallbackPos
        const raw = seatNames[i]?.trim() ?? ''
        const mosaicInitials =
          isMosaic && raw.length > 0
            ? raw
                .split(/\s+/)
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
            : ''
        const chips = seatBankrolls[i] ?? 0
        const showFeltStack = Boolean(raw && feltSeatStacks && size === 'lg')
        const labelVy = seatNameLabelVerticalNudgePx(i, size)
        const isFolded = filled && seatFolded[i] === true
        const lastBetAct =
          showSeatBettingActions && filled ? seatLastBettingAction[i] ?? null : null
        const showFoldOut = isFolded && !(showSeatBettingActions && lastBetAct === 'fold')
        const isActing = filled && actingSeatIndex != null && actingSeatIndex === i && !isFolded
        const showActingCallLine =
          isActing &&
          showSeatBettingActions &&
          actingCallAmount != null &&
          typeof actingCallAmount === 'number'
        const showActionPanel = Boolean(lastBetAct != null || showActingCallLine)
        /** Below the name/stack cluster — keeps CHECK / CALL off the felt center. */
        const actionPanelBelowPx =
          (size === 'lg' ? 44 : 36) + (feltSeatStacks && size === 'lg' ? 10 : 0)
        const seatDotClass = (() => {
          if (isActing && prefersReducedMotion) {
            return 'border-[3px] border-amber-200/95 bg-neutral-950 shadow-[0_0_14px_rgba(234,179,8,0.4)]'
          }
          if (isActing) {
            return 'border-[3px] border-amber-300/85 bg-neutral-950 shadow-[0_0_14px_rgba(234,179,8,0.35)] ring-1 ring-amber-400/25'
          }
          if (isFolded) {
            return 'border-rose-500/50 bg-black/50 shadow-inner opacity-[0.78] saturate-[0.7]'
          }
          return filled ? 'border-emerald-300/70 bg-black/85' : 'border-white/20 bg-black/35'
        })()
        const actingSoftPulse = isMosaic
          ? 'pointer-events-none absolute left-1/2 top-1/2 z-0 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/12 motion-reduce:hidden'
          : size === 'lg'
            ? 'pointer-events-none absolute left-1/2 top-1/2 z-0 h-[4.5rem] w-[4.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/12 motion-reduce:hidden sm:h-[5rem] sm:w-[5rem]'
            : 'pointer-events-none absolute left-1/2 top-1/2 z-0 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/10 motion-reduce:hidden sm:h-[3.75rem] sm:w-[3.75rem]'
        return (
          <div key={i}>
            <div
              className={`absolute flex items-center justify-center ${SEAT_LAYER_DOT}`}
              style={{
                left: `${seatRim.leftPct}%`,
                top: `${seatRim.topPct}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {isActing && !prefersReducedMotion ? (
                <span aria-hidden className={`${actingSoftPulse} motion-safe:animate-pulse motion-safe:[animation-duration:2.8s]`} />
              ) : null}
              <div
                className={`relative z-[2] flex shrink-0 items-center justify-center ${isActing ? dotActing : dot} rounded-full border-2 shadow ${seatDotClass}`}
                aria-current={isActing ? true : undefined}
                aria-label={
                  raw
                    ? [
                        raw,
                        isActing ? 'has the wagering turn' : null,
                        isFolded ? 'folded' : null,
                        showActingCallLine
                          ? formatActingCallHint(actingCallAmount ?? 0)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(', ')
                    : `Seat ${i + 1}, empty`
                }
              >
                {isMosaic && filled && mosaicInitials ? (
                  <span className="text-[0.5rem] font-black leading-none tracking-tight text-amber-100/95">
                    {mosaicInitials}
                  </span>
                ) : null}
              </div>
            </div>
            {isMosaic ? null : (() => {
              if (blindSeats == null) return null
              const tags = blindTagsForSeat(i, blindSeats)
              if (tags.length === 0) return null
              const blindInset =
                feltSeatStacks && size === 'lg' ? 0.71 : size === 'lg' ? 0.8 : 0.76
              const rp = venueSeatRimPct(i, blindInset, rimW, rimH, 'felt')
              const badgeText =
                size === 'lg'
                  ? 'text-[8px] font-black leading-none tracking-tight sm:text-[9px]'
                  : 'text-[7px] font-black leading-none tracking-tight sm:text-[8px]'
              return (
                <div
                  className={`pointer-events-none absolute ${SEAT_LAYER_BLIND_OUT} flex flex-col items-center gap-px`}
                  style={{
                    left: `${rp.leftPct}%`,
                    top: `${rp.topPct}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {tags.map((t) => (
                    <span
                      key={t.key}
                      title={t.label}
                      aria-label={t.label}
                      className={`rounded border px-[3px] py-px uppercase ${badgeText} ${t.pill}`}
                    >
                      {t.short}
                    </span>
                  ))}
                </div>
              )
            })()}
            {!isMosaic && showFoldOut && raw ? (
              <div
                className={`pointer-events-none absolute ${SEAT_LAYER_BLIND_OUT} flex flex-col items-center`}
                style={{
                  left: `${venueSeatRimPct(i, 0.58, rimW, rimH, 'felt').leftPct}%`,
                  top: `${venueSeatRimPct(i, 0.58, rimW, rimH, 'felt').topPct}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span
                  className={`whitespace-nowrap rounded border border-rose-300/90 bg-rose-950/95 px-[3px] py-px font-black uppercase leading-none tracking-tight text-rose-100 shadow-[0_1px_4px_rgba(0,0,0,0.85)] ${
                    size === 'lg' ? 'text-[8px] sm:text-[9px]' : 'text-[7px] sm:text-[8px]'
                  }`}
                >
                  Out
                </span>
              </div>
            ) : null}
            {!isMosaic && showFeltStack ? (
              <div
                className={`pointer-events-none absolute ${SEAT_LAYER_FELT_CHIP_PILE} flex flex-col items-center gap-0.5 px-0.5 ${
                  isFolded ? 'opacity-45' : 'opacity-95'
                }`}
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
            {!isMosaic && raw ? (
              <div
                className={`pointer-events-none absolute ${SEAT_LAYER_NAME_CLUSTER} text-center font-semibold leading-tight shadow-black/80 drop-shadow ${labelClass} ${
                  isFolded ? 'text-white/60' : 'text-white/92'
                }`}
                style={{
                  left: `${labelPos.leftPct}%`,
                  top: `${labelPos.topPct}%`,
                  transform: `translate(-50%, calc(-50% + ${labelVy}px))`,
                }}
              >
                <span
                  className={`block max-w-full truncate ${isFolded ? 'line-through decoration-rose-300/85 decoration-2' : ''}`}
                >
                  {raw}
                </span>
                {(() => {
                  const showMonoStackUnderName = !(feltSeatStacks && size === 'lg')
                  return (
                    <>
                      {showMonoStackUnderName ? (
                        <span
                          className={`mt-0.5 block max-w-full truncate font-mono tabular-nums text-[0.625rem] sm:text-[0.6875rem] md:text-xs lg:text-sm ${
                            isFolded ? 'text-white/40' : 'text-casino-emerald'
                          }`}
                        >
                          {formatVenueBankroll(chips)}
                        </span>
                      ) : null}
                    </>
                  )
                })()}
              </div>
            ) : null}
            {!isMosaic && raw && showActionPanel ? (
              <div
                className={`pointer-events-none absolute ${SEAT_LAYER_ACTION_PANEL} flex flex-col items-center gap-1 text-center`}
                style={{
                  left: `${labelPos.leftPct}%`,
                  top: `${labelPos.topPct}%`,
                  transform: `translate(-50%, calc(-50% + ${labelVy + actionPanelBelowPx}px))`,
                }}
              >
                {showActingCallLine ? (
                  <span
                    className={
                      size === 'lg'
                        ? 'max-w-[min(100vw-2rem,20rem)] whitespace-normal rounded-lg border-2 border-amber-300/45 bg-neutral-950/95 px-2.5 py-1.5 text-sm font-bold tabular-nums leading-snug text-amber-50 shadow-md ring-1 ring-amber-400/25 sm:text-base'
                        : 'max-w-[min(90vw,12rem)] whitespace-normal rounded-md border-2 border-amber-300/35 bg-neutral-950/95 px-2 py-1 text-[0.65rem] font-bold tabular-nums leading-snug text-amber-50 shadow-md sm:text-xs'
                    }
                  >
                    {formatActingCallHint(actingCallAmount ?? 0)}
                  </span>
                ) : null}
                {lastBetAct != null ? (
                  <span
                    className={`max-w-full truncate border-2 px-1.5 py-0.5 font-black uppercase leading-tight tracking-wide shadow-md ${
                      size === 'lg'
                        ? 'text-sm sm:text-base md:text-lg'
                        : 'text-[0.7rem] sm:text-xs md:text-sm'
                    } ${seatBettingActionPillClass(lastBetAct)}`}
                  >
                    {seatBettingActionLabel(lastBetAct)}
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

type VenueMosaicTableCardProps = {
  row: DisplayVenueTileSnapshot
  isSpotlightThumb?: boolean
  /** Center wall shows full results — crawl tiles only need a winner line. */
  hideShowdownResults?: boolean
}

function VenueMosaicTableCard({
  row,
  isSpotlightThumb,
  hideShowdownResults = false,
}: VenueMosaicTableCardProps) {
  const tn = row.tableNum
  const seats = row.seated
  const pot = row.pot
  const ph = row.phase
  const seatNames = padSeatNames(row.seatNames)
  const seatBankrolls = padSeatBankrolls(row.seatBankrolls)
  const seatFolded = padSeatFolded(row.seatFolded)
  const blindSeatSnapshot = venueTileBlindSeats(row)
  const actingSeat = venueTileActingSeat(row)
  const seatLastBettingAction = padSeatLastBettingAction(row.seatLastBettingAction)
  const showSeatBettingActions = ph === 'betting'
  const inShowdown = ph === 'showdown'
  const showdownRows = inShowdown ? showdownRowsFromTile(row) : []
  const showdownAnswer = inShowdown ? showdownCorrectAnswerFromTile(row) : undefined
  const mosaicPotSubtitle = mosaicPotSubtitleActingToCall({
    actingSeatIndex: actingSeat,
    seatNames,
    actingCallAmount: row.actingCallAmount,
  })

  const spotlight = isSpotlightThumb === true
  const totalChips = totalChipsFromSeats(seatNames, seatBankrolls)
  const cardShell = spotlight
    ? 'rounded-xl border-2 border-amber-400/70 bg-black/65 shadow-[0_0_32px_rgba(251,191,36,0.22)] ring-2 ring-amber-400/35'
    : 'rounded-xl border-2 border-yellow-700/40 bg-black/55 shadow-lg'

  return (
      <article
        data-spotlight-tile={tn}
        role="group"
        aria-current={spotlight ? 'true' : undefined}
        aria-label={`Table ${tn}, mosaic tile`}
        className={`flex w-full min-w-0 flex-col gap-1.5 overflow-visible p-2 backdrop-blur-md sm:gap-2 sm:p-2.5 ${cardShell}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-2xl font-black tabular-nums leading-none text-yellow-400">Table {tn}</div>
          </div>
          <span
            className={`max-w-[min(9rem,46%)] shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold leading-tight sm:max-w-[10rem] sm:px-2.5 sm:py-1.5 sm:text-xs ${mosaicPhaseCornerTypography(row)} ${mosaicPhaseAccent(row)}`}
          >
            {mosaicPhaseLabel(row)}
          </span>
        </div>

        <div className="relative z-[1] flex shrink-0 justify-center overflow-visible">
          <SeatRingWithLabels
            ringMode="mosaic"
            seatedCount={seats}
            seatNames={seatNames}
            seatBankrolls={seatBankrolls}
            blindSeats={blindSeatSnapshot}
            seatFolded={seatFolded}
            actingSeatIndex={actingSeat}
            showSeatBettingActions={false}
            seatLastBettingAction={seatLastBettingAction}
            actingCallAmount={row.actingCallAmount}
          />
        </div>

        {seats > 0 ? (
          <ul className="max-h-[5.5rem] space-y-0.5 overflow-y-auto border-t border-white/10 pt-1.5 text-[0.7rem] leading-snug text-white/88">
            {Array.from({ length: seats }, (_, i) => {
              const name = seatNames[i]?.trim() ?? ''
              if (!name) return null
              const act = showSeatBettingActions ? seatLastBettingAction[i] : null
              const folded = seatFolded[i] === true
              const onClock = actingSeat === i && !folded
              return (
                <li key={i} className="flex min-w-0 items-center justify-between gap-1">
                  <span
                    className={`min-w-0 truncate ${folded ? 'text-white/45 line-through' : onClock ? 'font-bold text-amber-200' : ''}`}
                  >
                    {name}
                  </span>
                  {act != null ? (
                    <span
                      className={`shrink-0 rounded border px-1 py-px text-[0.55rem] font-black uppercase leading-none ${seatBettingActionPillClass(act)}`}
                    >
                      {seatBettingActionLabel(act)}
                    </span>
                  ) : onClock ? (
                    <span className="shrink-0 text-[0.6rem] font-bold uppercase tracking-wide text-cyan-300">
                      Turn
                    </span>
                  ) : (
                    <span className="shrink-0 font-mono text-[0.65rem] tabular-nums text-casino-emerald">
                      {formatVenueBankroll(seatBankrolls[i] ?? 0)}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : null}

        <dl className="min-w-0 space-y-1 border-t border-white/10 pt-1.5 text-[0.6875rem] leading-snug text-white/88 sm:text-sm">
          <div className="flex justify-between gap-2">
            <dt className="font-semibold text-white/65">Occupied</dt>
            <dd className="font-mono font-bold tabular-nums text-casino-emerald">
              {seats} / 8
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="font-semibold text-white/65">Pot</dt>
            <dd className="font-mono font-bold tabular-nums text-yellow-300">${pot.toLocaleString()}</dd>
          </div>
          {mosaicPotSubtitle != null ? (
            <div className="rounded-md border border-amber-400/25 bg-black/40 px-1.5 py-1">
              <p className="min-w-0 text-center text-[0.6875rem] font-bold leading-snug text-amber-100 sm:text-xs">
                {mosaicPotSubtitle}
              </p>
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            <dt className="font-semibold text-white/65">Chips on table</dt>
            <dd className="font-mono font-bold tabular-nums text-white/90">{formatVenueBankroll(totalChips)}</dd>
          </div>
        </dl>

        {inShowdown && showdownRows.length > 0 ? (
          hideShowdownResults ? (
            <motion.div className="rounded-lg border border-amber-500/30 bg-amber-950/35 px-2 py-1.5 text-center">
              <p className="text-[0.6rem] font-bold uppercase tracking-wider text-amber-200/70">Winner</p>
              <p className="truncate text-xs font-black text-amber-50 sm:text-sm">
                {(() => {
                  const { winnerKey } = sortShowdownRowsByDistance(showdownRows, showdownAnswer)
                  const winner = showdownRows.find(
                    (r) => `${r.seat}:${r.name}` === winnerKey && r.name.trim() !== ''
                  )
                  return winner?.name ?? '—'
                })()}
              </p>
            </motion.div>
          ) : (
            <div
              className="rounded-lg p-1"
              style={{
                background: 'linear-gradient(180deg, #5c3d1e 0%, #3d2810 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,220,160,0.1)',
              }}
            >
              <ShowdownResultsPanel
                compact
                correctAnswer={showdownAnswer}
                rows={showdownRows}
              />
            </div>
          )
        ) : null}
      </article>
  )
}

/** Latin-first sort key: leading word of the display name (first name). */
function firstNameSortKey(displayName: string): string {
  const t = displayName.trim()
  if (!t) return ''
  const w = t.split(/\s+/)[0]
  return w ?? t
}

/** Any numbered felt has advanced past lobby — venue lists switch to chip / bankroll leaderboard order. */
function venueWallGameplayActive(tiles: DisplayVenueTileSnapshot[]): boolean {
  return tiles.some((t) => t.phase !== 'lobby')
}

function comparePlayersByFirstNameThenFullName(a: { name: string }, b: { name: string }): number {
  const cmp = firstNameSortKey(a.name).localeCompare(firstNameSortKey(b.name), undefined, {
    sensitivity: 'base',
  })
  if (cmp !== 0) return cmp
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

function rosterRowsFromTiles(
  tiles: DisplayVenueTileSnapshot[]
): { name: string; tableNum: number; seatNum: number; bankroll: number }[] {
  const out: { name: string; tableNum: number; seatNum: number; bankroll: number }[] = []
  const leaderboardOrder = venueWallGameplayActive(tiles)
  for (const t of tiles) {
    const sn = t.seatNames
    const br = padSeatBankrolls(t.seatBankrolls)
    if (sn == null || sn.length === 0) continue
    for (let i = 0; i < sn.length; i++) {
      const raw = sn[i]?.trim()
      /** Physical numbered seat positions (same indexing as mosaic + hero). */
      if (raw) out.push({ name: raw, tableNum: t.tableNum, seatNum: i + 1, bankroll: br[i] ?? 0 })
    }
  }
  out.sort((a, b) => {
    if (leaderboardOrder) {
      if (b.bankroll !== a.bankroll) return b.bankroll - a.bankroll
      const c = comparePlayersByFirstNameThenFullName(a, b)
      if (c !== 0) return c
      return a.tableNum - b.tableNum
    }
    const cmp = firstNameSortKey(a.name).localeCompare(firstNameSortKey(b.name), undefined, {
      sensitivity: 'base',
    })
    if (cmp !== 0) return cmp
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
  return out
}

function VenueScrollingRoster({ tiles }: { tiles: DisplayVenueTileSnapshot[] }) {
  const gameOn = useMemo(() => venueWallGameplayActive(tiles), [tiles])
  const rows = useMemo(() => rosterRowsFromTiles(tiles), [tiles])
  if (rows.length === 0) return null

  const durationSec = Math.max(28, Math.min(120, rows.length * 2.2))
  const doubled = [...rows, ...rows]

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-20 flex flex-col border-l border-yellow-600/50 bg-slate-950/94 shadow-[-8px_0_28px_rgba(0,0,0,0.4)] backdrop-blur-md ${VENUE_CRAWL_STRIP_CLASS}`}
      aria-label={
        gameOn
          ? 'Player stacks ranked by bankroll across numbered tables.'
          : 'Players and table assignments by first name.'
      }
    >
      <div className="shrink-0 border-b border-white/10 px-3 py-3.5 sm:px-4 sm:py-4">
        <h2 className="text-2xl font-bold leading-none tracking-tight text-white/92 sm:text-3xl">
          {gameOn ? 'Stacks' : 'Seating'}
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
              key={`${r.tableNum}-${r.seatNum}-${r.name}-${idx}`}
              className="w-full min-w-0 border-b border-white/[0.08] py-3 sm:py-3.5"
              aria-label={`${r.name}, ${formatVenueBankroll(r.bankroll)}, Table ${r.tableNum} seat ${r.seatNum}`}
            >
              <div className="w-full min-w-0 truncate text-xl font-bold leading-[1.15] text-white/95 sm:text-2xl md:text-3xl">
                {r.name}
              </div>
              <div className="mt-1 flex w-full min-w-0 items-baseline justify-between gap-2">
                <span className="min-w-0 flex-1 truncate font-mono text-sm font-bold tabular-nums tracking-tight text-yellow-400/92 sm:text-base">
                  Table {r.tableNum} · Seat {r.seatNum}
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
  hideShowdownResults = false,
}: {
  tiles: DisplayVenueTileSnapshot[]
  spotlightTableNum: number
  prefersReducedMotion: boolean
  hideShowdownResults?: boolean
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

  const tableRow = (row: (typeof tiles)[0], key: string) => (
    <VenueMosaicTableCard
      key={key}
      row={row}
      isSpotlightThumb={row.tableNum === spotlightTableNum}
      hideShowdownResults={hideShowdownResults}
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
            {tiles.map((row) => tableRow(row, `measure-${row.tableNum}`))}
          </div>
        </div>

        {prefersReducedMotion ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain py-1">
            {tiles.map((row) => tableRow(row, `a11y-${row.tableNum}`))}
          </div>
        ) : showCrawlAnimation ? (
          <div
            className="venue-roster-animate flex flex-col gap-3"
            style={{ ['--venue-roster-secs' as string]: `${durationSec}s` }}
          >
            {doubled.map((row, idx) => tableRow(row, `crawl-${row.tableNum}-${idx}`))}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 py-1">
            {tiles.map((row) => tableRow(row, `fit-${row.tableNum}`))}
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
   * Skip Framer entrance on header / headline (brief unmounts across layout transitions should not replay fades).
   */
  skipMountIntro?: boolean
  featuredWatch: VenueFeaturedWatch
}

/**
 * Venue wall shell: venue headline plus **embedded** live felt (`DisplayTableLive`), crawl strips, and roster chrome.
 * Hero selection is driven by **`useVenueWallFeaturedWatch`** so the UI matches **`displayFocusTable`** pairing.
 */
export default function VenueEightTablesPreview({
  wall,
  skipMountIntro = false,
  featuredWatch,
}: VenueEightTablesPreviewProps) {
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

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

  const tileRows = useMemo(() => buildVenueWallTileRows(wall), [wall])
  const useShowdownWall = shouldUseVenueShowdownWall(tileRows)

  const hasLiveWall = wall != null && wall.tiles != null && wall.tiles.length > 0
  const showHeadline =
    hasLiveWall && (headlineQuestionText != null || answerDeadlineMs != null)

  const seatingHeroRow = useMemo(() => {
    const n = featuredWatch.featuredTableNum
    if (tileRows.length === 0) return undefined
    if (n == null) return tileRows[0]
    return tileRows.find((t) => t.tableNum === n) ?? tileRows[0]
  }, [tileRows, featuredWatch.featuredTableNum])

  const showRotatingTour = featuredWatch.showRotatingTour
  const seatingCycleProgress = featuredWatch.seatingCycleProgress
  const seatingTourIndex = featuredWatch.seatingTourIndex
  const showShowdownTour = featuredWatch.showShowdownTour
  const showdownCycleProgress = featuredWatch.showdownCycleProgress
  const showdownTourIndex = featuredWatch.showdownTourIndex
  const showdownTableCount = tileRows.filter((t) => t.phase === 'showdown').length

  const showRoster = rosterRowsFromTiles(tileRows).length > 0

  /** Reserve space for the fixed **All tables** crawl whenever numbered tiles render. */
  const padLeftForTablesCrawl = tileRows.length > 0

  const dockSeatingTourProgress =
    showRotatingTour && !prefersReducedMotion && tileRows.length > 1
  const dockShowdownTourProgress =
    showShowdownTour && !prefersReducedMotion && showdownTableCount > 1
  const dockTourProgress = dockSeatingTourProgress || dockShowdownTourProgress

  return (
    <div
      className={`relative min-h-screen overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white ${
        padLeftForTablesCrawl ? VENUE_CRAWL_PL_CLASS : ''
      } ${showRoster ? VENUE_CRAWL_PR_CLASS : ''}${
        dockTourProgress ? ' pb-[calc(7.75rem+env(safe-area-inset-bottom,0px))]' : ''
      }`}
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

      <main
        className={`relative z-10 mx-auto w-full ${VENUE_HERO_MAIN_MAX_W} pb-12 ${
          showHeadline && seatingHeroRow ? 'pt-0' : 'pt-2 sm:pt-3'
        } ${
          seatingHeroRow && (padLeftForTablesCrawl || showRoster) ? 'px-0 sm:px-0' : 'px-4 sm:px-6'
        }`}
      >
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
        ) : seatingHeroRow ? (
          <section
            aria-label={
              useShowdownWall
                ? 'Venue showdown wall; all tables in reveal'
                : showShowdownTour
                  ? 'Showdown tour; full results on each felt in focus'
                  : showRotatingTour
                    ? 'Seating spotlight tour; live felt in focus'
                    : 'Venue floor featured table'
            }
            className="mx-auto flex w-full max-w-none flex-col gap-2 overflow-visible sm:gap-3"
          >
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              Featured table {seatingHeroRow.tableNum}
            </p>

            {/* Headline: sticky top of center column; wordmark + question use full band between side crawls. */}
            {showHeadline ? (
              <motion.div
                className="sticky top-0 z-[45] mb-2 flex w-full min-w-0 items-stretch gap-2.5 rounded-b-2xl border-2 border-yellow-400/85 bg-black/82 px-2.5 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-md sm:gap-4 sm:px-4 sm:py-2.5 md:gap-5 md:px-5 md:py-3"
                style={{
                  paddingTop: 'max(0.35rem, env(safe-area-inset-top, 0px))',
                }}
                initial={skipMountIntro ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="pointer-events-none flex w-[clamp(6.75rem,min(22vw,9rem),11rem)] shrink-0 items-center self-center sm:w-[clamp(7.5rem,min(26vw,10rem),12rem)] md:w-[clamp(8.5rem,min(24vw,11rem),13rem)]">
                  <div
                    className="w-full shadow-black/70 drop-shadow-xl"
                    style={{ aspectRatio: '958 / 592' }}
                  >
                    <QuizzEmWordmark layout="fill" />
                  </div>
                </div>
                <motion.div
                  className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 rounded-xl border border-casino-emerald/35 bg-black/35 px-2.5 py-2 shadow-[inset_0_0_0_1px_rgba(0,255,180,0.06)] backdrop-blur-md sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-2.5 md:gap-4 md:px-5"
                  initial={skipMountIntro ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="min-w-0 flex-1">
                    {headlineQuestionText ? (
                      <p className="text-balance text-left text-lg font-bold leading-snug tracking-tight text-yellow-400 sm:text-xl sm:leading-snug md:text-2xl md:leading-snug lg:text-[1.75rem] xl:text-[2rem] 2xl:text-[2.15rem]">
                        {headlineQuestionText}
                      </p>
                    ) : (
                      <p className="sr-only">Answering in progress.</p>
                    )}
                  </div>
                  {answerDeadlineMs != null && typeof timerSeconds === 'number' ? (
                    <div
                      className={`flex shrink-0 flex-row items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 sm:flex-col sm:px-3 sm:py-2 sm:tabular-nums ${
                        timerSeconds <= 10
                          ? 'border-amber-400/55 bg-amber-950/45 shadow-[0_0_20px_rgba(251,191,36,0.1)]'
                          : 'border-amber-600/35 bg-amber-950/25'
                      }`}
                      aria-live="polite"
                      aria-label={`Time remaining ${timerSeconds} seconds`}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/50 sm:hidden">
                        Time
                      </span>
                      <div className="font-mono text-2xl font-black tracking-tight text-amber-200 sm:text-4xl md:text-5xl xl:text-6xl">
                        {timerSeconds}s
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </motion.div>
            ) : null}

            {useShowdownWall ? (
              <>
                {!showHeadline ? (
                  <motion.div className="pointer-events-none mb-2 w-[clamp(7.5rem,min(26vw,10rem),12rem)] sm:mb-3 sm:w-[clamp(8.5rem,min(24vw,11rem),13rem)]">
                    <div className="w-full shadow-black/70 drop-shadow-xl" style={{ aspectRatio: '958 / 592' }}>
                      <QuizzEmWordmark layout="fill" />
                    </div>
                  </motion.div>
                ) : null}
                <VenueMultiTableShowdown tiles={tileRows} />
              </>
            ) : (
            <motion.article
              className="relative w-full overflow-hidden rounded-2xl border-2 border-yellow-400/85 bg-black/55 shadow-xl backdrop-blur-md"
              initial={skipMountIntro ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {!showHeadline ? (
                <div className="pointer-events-none absolute left-3 top-2 z-30 w-[clamp(7.5rem,min(26vw,10rem),12rem)] sm:left-5 sm:top-3 sm:w-[clamp(8.5rem,min(24vw,11rem),13rem)]">
                  <div className="w-full shadow-black/70 drop-shadow-xl" style={{ aspectRatio: '958 / 592' }}>
                    <QuizzEmWordmark layout="fill" />
                  </div>
                </div>
              ) : null}

              {/* Live felt fills this slot; viewport bottom dock is sibling to `<main>` (padding on shell), not padded inside embed. */}
              <div
                className={`relative z-10 box-border flex ${VENUE_HERO_FELT_VPORT_H} ${VENUE_HERO_FELT_MIN_H} w-full min-w-0 shrink-0 overflow-hidden rounded-2xl border border-yellow-700/45`}
              >
                <DisplayTableLive
                  key={seatingHeroRow.tableNum}
                  feltTableHint={String(seatingHeroRow.tableNum)}
                  venueHeroTile={seatingHeroRow}
                  variant="embedded"
                  hideQuestionBanner
                />
              </div>

              {!dockTourProgress ? (
                <div className="relative z-20 overflow-hidden border-t border-yellow-700/40 px-4 py-3 pb-4 sm:px-5 sm:py-4">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                  <div className="pointer-events-none absolute inset-0 opacity-55">
                    <div className="h-full w-full" style={VENUE_HERO_CARPET_STYLE} />
                  </div>
                  <div className="relative z-10 space-y-2 sm:space-y-3">
                    <p className="text-center text-sm text-white/50 sm:text-base md:text-lg">
                      {showShowdownTour ? (
                        prefersReducedMotion ? (
                          `Showdown — Table ${seatingHeroRow.tableNum} (auto-rotation off: reduced motion)`
                        ) : (
                          `Showdown tour · Table ${seatingHeroRow.tableNum} · ${showdownTourIndex + 1} of ${showdownTableCount}`
                        )
                      ) : showRotatingTour ? (
                        prefersReducedMotion ? (
                          `Seating spotlight — Table ${seatingHeroRow.tableNum} (auto-rotation off: reduced motion)`
                        ) : (
                          `Rotating seating · Table ${seatingHeroRow.tableNum} · ${seatingTourIndex + 1} of ${tileRows.length}`
                        )
                      ) : (
                        `Featured table · Table ${seatingHeroRow.tableNum}`
                      )}
                    </p>
                  </div>
                </div>
              ) : null}
            </motion.article>
            )}
          </section>
        ) : null}
      </main>

      {seatingHeroRow && dockShowdownTourProgress ? (
        <motion.div
          className={`fixed bottom-0 z-[60] border-t border-yellow-500/55 bg-black/90 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-md ${
            padLeftForTablesCrawl ? VENUE_CENTER_BAND_LEFT_EDGE : 'left-0'
          } ${showRoster ? VENUE_CENTER_BAND_RIGHT_EDGE : 'right-0'}`}
          role="region"
          aria-label="Showdown tour across tables"
        >
          <div className="w-full px-4 sm:px-5 md:px-6">
            <div className="mx-auto w-full max-w-3xl">
              <p
                className="mb-3 text-center text-xs text-yellow-100/80 sm:text-sm md:text-base"
                aria-live="polite"
                aria-atomic="true"
              >
                Showdown · Table {seatingHeroRow.tableNum} · {showdownTourIndex + 1} of{' '}
                {showdownTableCount} — compact results on every tile in All tables
              </p>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs text-white/50 sm:text-sm">
                <span className="font-semibold uppercase tracking-wider text-white/45">
                  Next felt
                </span>
                <span className="font-mono tabular-nums text-amber-200/90">
                  {Math.max(
                    0,
                    Math.ceil((1 - showdownCycleProgress) * SHOWDOWN_SPOTLIGHT_CYCLE_SEC)
                  )}
                  s
                </span>
              </div>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(showdownCycleProgress * 100)}
                aria-label="Showdown tour progress until the next table"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-700/95 to-yellow-300/95"
                  style={{ width: `${showdownCycleProgress * 100}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
      {seatingHeroRow && dockSeatingTourProgress ? (
        <div
          className={`fixed bottom-0 z-[60] border-t border-yellow-700/50 bg-black/90 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-md ${
            padLeftForTablesCrawl ? VENUE_CENTER_BAND_LEFT_EDGE : 'left-0'
          } ${showRoster ? VENUE_CENTER_BAND_RIGHT_EDGE : 'right-0'}`}
          role="region"
          aria-label="Seating spotlight tour"
        >
          <div className="w-full px-4 sm:px-5 md:px-6">
            <div className="mx-auto w-full max-w-3xl">
              <p
                className="mb-3 text-center text-xs text-white/55 sm:text-sm md:text-base"
                aria-live="polite"
                aria-atomic="true"
              >
                Rotating seating · Table {seatingHeroRow.tableNum} · {seatingTourIndex + 1} of{' '}
                {tileRows.length}
              </p>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs text-white/50 sm:text-sm">
                <span className="font-semibold uppercase tracking-wider text-white/45">
                  Next table
                </span>
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
          </div>
        </div>
      ) : null}
      {tileRows.length > 0 && seatingHeroRow ? (
        <VenueAllTablesCrawl
          tiles={tileRows}
          spotlightTableNum={seatingHeroRow.tableNum}
          prefersReducedMotion={prefersReducedMotion}
          hideShowdownResults={useShowdownWall}
        />
      ) : null}
      {showRoster ? <VenueScrollingRoster tiles={tileRows} /> : null}
    </div>
  )
}
