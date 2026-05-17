import { Fragment, useEffect, useState, useCallback, useRef, useLayoutEffect, useMemo } from 'react'
import type { RefObject } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NumericPlayingCard, PokerChip } from '@qhe/ui'
import { onState, onToast, onDealingCards, onDealingCommunityCards, type DisplayVenueTileSnapshot } from '@qhe/net'
import type { GameState, GamePhase, PlayerState, SeatBettingAction, NumericCard } from '@qhe/core'
import {
  LOBBY_TABLE_ID,
  buildDisplayPreviewGameState,
  displayBlindSeatIndices,
  displayActingSeatIndex,
  chipsRequiredToCall,
} from '@qhe/core'
import confetti from 'canvas-confetti'
import { readDisplayVenueCode } from './displayUrlParams'
import { embeddedHeroDisplayState } from './embeddedVenueHeroState'
import {
  cacheDisplaySpotlightState,
  readDisplaySpotlightState,
} from './displaySpotlightStateCache'
import { heroSeatBlindMarkerPills } from './heroBlindMarkers'
import seatChipStackImg from './assets/seat-chip-stack.png'

/** Authoring viewport (logical px). Embedded venue heroes scale uniformly to fit the measured game plane; fullscreen uses live `gw/gh`. */
const EMBEDDED_FELT_LAYOUT_W = 1280
const EMBEDDED_FELT_LAYOUT_H = 940

/** Seat HUD panel — match Tailwind `w-[120px] min-h-[118px] p-3 border-2` on the player stack in {@link DisplayTableLive}. */
const SEAT_HUD_PANEL_MIN_H_PX = 118
/** {@link NumericPlayingCard} `normal` — packages/ui `sizeStyles.normal` */
const PLAYING_CARD_NORMAL_W_PX = 80
const PLAYING_CARD_NORMAL_H_PX = 112
/** Card root uses `margin: 10px` in {@link NumericPlayingCard} — include in seat / dealing geometry. */
const PLAYING_CARD_MARGIN_PX = 10
const PLAYING_CARD_LAYOUT_W_PX = PLAYING_CARD_NORMAL_W_PX + 2 * PLAYING_CARD_MARGIN_PX
const PLAYING_CARD_LAYOUT_H_PX = PLAYING_CARD_NORMAL_H_PX + 2 * PLAYING_CARD_MARGIN_PX
/** Second hole-card wrapper `marginLeft` — must match seat hand markup. */
const HOLE_HAND_STACK_OVERLAP_PX = -50
/** Two-card row width in panel-local px: 100 + (100 - 50) overlap extent. */
const HOLE_HAND_ROW_W_PX = PLAYING_CARD_LAYOUT_W_PX + PLAYING_CARD_LAYOUT_W_PX + HOLE_HAND_STACK_OVERLAP_PX
/** Tailwind `scale-[1.40625]` on the seat HUD panel. */
const SEAT_HUD_PANEL_SCALE = 1.40625
/** Tailwind `scale-50` on each hole-card wrapper (`origin-bottom`). */
const HOLE_CARD_WRAPPER_SCALE = 0.5
/** Mid-hand join: reveal persisted hole cards only if no `dealingCards` event follows. */
const HOLE_MIDJOIN_REVEAL_MS = 800
/** Flight-only nudge (plane px): negative Y = up, negative X = left. Does not move static seat cards. */
const HOLE_DEAL_FLIGHT_X_NUDGE_PX = -1
const HOLE_DEAL_FLIGHT_Y_NUDGE_PX = -5
const HOLE_DEAL_FLIGHT_SCALE_MULT = 1.08

function holeCardLayoutLeftFromPanelCenterPx(cardIndex: number): number {
  const rowHalfW = HOLE_HAND_ROW_W_PX / 2
  const firstLeft = -rowHalfW
  return cardIndex === 0
    ? firstLeft
    : firstLeft + PLAYING_CARD_LAYOUT_W_PX + HOLE_HAND_STACK_OVERLAP_PX
}

/**
 * Visual top-left of a hole card in the game-plane coordinate system.
 * Mirrors: seat center → panel `scale-[1.40625]` → hand `bottom-0` → wrapper `scale-50 origin-bottom`.
 */
function holeCardVisualTopLeftInPlanePx(
  planeW: number,
  planeH: number,
  seatDx: number,
  seatDy: number,
  cardIndex: number
): { x: number; y: number; scale: number } {
  const cs = SEAT_HUD_PANEL_SCALE
  const inner = HOLE_CARD_WRAPPER_SCALE
  const playerCenterX = planeW / 2 + seatDx
  const playerCenterY = planeH / 2 + seatDy

  const layoutLeftFromPanelCenter = holeCardLayoutLeftFromPanelCenterPx(cardIndex)
  const layoutTopFromPanelCenter = SEAT_HUD_PANEL_MIN_H_PX / 2 - PLAYING_CARD_LAYOUT_H_PX

  const visualLeftFromPanelCenter =
    layoutLeftFromPanelCenter + (PLAYING_CARD_LAYOUT_W_PX * (1 - inner)) / 2
  const visualTopFromPanelCenter =
    layoutTopFromPanelCenter + PLAYING_CARD_LAYOUT_H_PX * (1 - inner)

  return {
    x: playerCenterX + visualLeftFromPanelCenter * cs,
    y: playerCenterY + visualTopFromPanelCenter * cs,
    scale: inner * cs,
  }
}

type HoleCardPlaneEndpoint = { x: number; y: number; scale: number }

/** Map screen-space rect into the felt layer’s authoring coordinates (pre–outer-scale `clientWidth`). */
function holeCardRectToPlaneEndpoint(
  planeRoot: HTMLElement,
  cardRect: DOMRect
): HoleCardPlaneEndpoint | null {
  const planeRect = planeRoot.getBoundingClientRect()
  if (planeRect.width < 1 || planeRect.height < 1) return null
  const planeScaleX = planeRoot.clientWidth / planeRect.width
  const planeScaleY = planeRoot.clientHeight / planeRect.height
  const scaleFromW = (cardRect.width * planeScaleX) / PLAYING_CARD_LAYOUT_W_PX
  const scaleFromH = (cardRect.height * planeScaleY) / PLAYING_CARD_LAYOUT_H_PX
  return {
    x: (cardRect.left - planeRect.left) * planeScaleX,
    y: (cardRect.top - planeRect.top) * planeScaleY,
    // `x`/`y` are in plane px; `scale` must be too (not raw screen width ÷ layout).
    scale: (scaleFromW + scaleFromH) / 2,
  }
}

/** Nudge deal flights only — static anchors stay on measured seat slots. */
function tuneHoleCardDealFlightEndpoint(endpoint: HoleCardPlaneEndpoint): HoleCardPlaneEndpoint {
  return {
    x: endpoint.x + HOLE_DEAL_FLIGHT_X_NUDGE_PX,
    y: endpoint.y + HOLE_DEAL_FLIGHT_Y_NUDGE_PX,
    scale: endpoint.scale * HOLE_DEAL_FLIGHT_SCALE_MULT,
  }
}

/**
 * Matches cupholder ellipse math ({@link DisplayTableLive} large felt) — offset px from top-left of 810×605 rail box origin.
 */
function heroSeatCupOffsets(index: number, total: number): { ox: number; oy: number } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2
  const baseRadiusX = 392
  const baseRadiusY = 316
  let ox = Math.cos(angle) * baseRadiusX
  let oy = Math.sin(angle) * baseRadiusY
  const normalizedAngle = ((angle + Math.PI / 2) % (2 * Math.PI)) / (2 * Math.PI)
  const isTopRegion = normalizedAngle > 0.9 || normalizedAngle < 0.1
  const isBottomRegion = normalizedAngle > 0.4 && normalizedAngle < 0.6
  const isCorner =
    (normalizedAngle > 0.125 && normalizedAngle < 0.375) ||
    (normalizedAngle > 0.625 && normalizedAngle < 0.875)
  if (isTopRegion) {
    const bowAmount = Math.abs(Math.cos(angle)) * 24.3
    oy = -291.6 + bowAmount
  } else if (isBottomRegion) {
    const bowAmount = Math.abs(Math.cos(angle)) * 24.3
    oy = 291.6 - bowAmount
  } else if (isCorner) {
    ox = Math.cos(angle) * (baseRadiusX + 0.81)
    oy = Math.sin(angle) * (baseRadiusY + 0.81)
  }
  return { ox, oy }
}

/** Visual center-ish under pot / community arc on authoring table (px, same coords as cupholders). */
const HERO_TABLE_POT_ANCHOR = { cx: 406, cy: 298 } as const
const HERO_CUPHOLDER_ORIGIN = { left: 394, top: 293 } as const

function heroFeltPointTowardPot(
  rimLeftPx: number,
  rimTopPx: number,
  frac: number
): { leftPx: number; topPx: number } {
  return {
    leftPx: rimLeftPx + (HERO_TABLE_POT_ANCHOR.cx - rimLeftPx) * frac,
    topPx: rimTopPx + (HERO_TABLE_POT_ANCHOR.cy - rimTopPx) * frac,
  }
}

/**
 * Pucks / lammers stay rail-tight; chip piles sit farther toward the pot, offset **tangentially**
 * left vs right per seat index so badges and stacks never share the same on-screen corridor.
 */
function heroFeltSeatAssetPositions(
  rimLeftPx: number,
  rimTopPx: number,
  seatIndex: number
): { blindPx: { leftPx: number; topPx: number }; chipPx: { leftPx: number; topPx: number } } {
  const dx = HERO_TABLE_POT_ANCHOR.cx - rimLeftPx
  const dy = HERO_TABLE_POT_ANCHOR.cy - rimTopPx
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  /** Clockwise perpendicular in screen space — slide assets along the felt “belt”. */
  const tx = -uy
  const ty = ux
  const sign = seatIndex % 2 === 0 ? 1 : -1
  /** Half-width-ish gap between puck column and chip column (authoring px). */
  const tangentSepPx = 32

  const blindBase = heroFeltPointTowardPot(rimLeftPx, rimTopPx, 0.07)
  const chipBase = heroFeltPointTowardPot(rimLeftPx, rimTopPx, 0.32)

  return {
    blindPx: {
      leftPx: blindBase.leftPx + tx * tangentSepPx * sign,
      topPx: blindBase.topPx + ty * tangentSepPx * sign,
    },
    chipPx: {
      leftPx: chipBase.leftPx - tx * tangentSepPx * sign,
      topPx: chipBase.topPx - ty * tangentSepPx * sign,
    },
  }
}

function formatHeroStackMoney(amount: number): string {
  const n = Number.isFinite(amount) ? Math.round(amount) : 0
  return `$${Math.max(0, n).toLocaleString()}`
}

/** Large felt: same palette as venue mosaic, scaled for legibility at hero size. */
const HERO_SEAT_BETTING_ACTION_LABELS: Record<SeatBettingAction, string> = {
  check: 'CHECK',
  call: 'CALL',
  raise: 'RAISE',
  fold: 'FOLD',
  allIn: 'ALL-IN',
}

const HERO_SEAT_BETTING_ACTION_PILL_CLASS: Record<SeatBettingAction, string> = {
  check: 'border-slate-400/45 bg-slate-900/92 text-slate-100',
  call: 'border-sky-500/40 bg-sky-950/90 text-sky-100',
  raise: 'border-amber-500/45 bg-amber-950/90 text-amber-100',
  fold: 'border-rose-400/45 bg-rose-950/92 text-rose-100',
  allIn: 'border-violet-500/45 bg-violet-950/90 text-violet-100',
}

/** On-felt “to call” cue — between acting seat rim and pot anchor, stable in table-local px. */
function heroWagerCallBubblePositionPx(
  actingIndex: number,
  total: number,
  towardPotFrac = 0.42
): { leftPx: number; topPx: number } {
  const { ox, oy } = heroSeatCupOffsets(actingIndex, total)
  const rimLeft = HERO_CUPHOLDER_ORIGIN.left + ox
  const rimTop = HERO_CUPHOLDER_ORIGIN.top + oy
  const p = heroFeltPointTowardPot(rimLeft, rimTop, towardPotFrac)
  return { leftPx: p.leftPx, topPx: p.topPx }
}

function displayPhaseLabel(phase: GamePhase): string {
  switch (phase) {
    case 'lobby':
      return 'Lobby'
    case 'question':
      return 'Question'
    case 'betting':
      return 'Wagering'
    case 'answering':
      return 'Answering'
    case 'reveal':
      return 'Reveal'
    case 'showdown':
      return 'Showdown'
    case 'payout':
      return 'Payout'
    case 'intermission':
      return 'Intermission'
    default:
      return phase
  }
}

function displayStreetLabel(gs: GameState): string {
  const ph = gs.phase
  if (ph === 'lobby' || ph === 'question') return '—'
  const n = gs.round.communityCards.length
  if (n === 0) return 'Pre-flop'
  if (n === 3) return 'Flop'
  if (n === 4) return 'Turn'
  if (n >= 5) return 'River'
  return '—'
}

function displayTableLabel(tableId: string): string {
  return tableId === LOBBY_TABLE_ID ? 'Lobby' : `Table ${tableId}`
}

/** Mosaic / hero numbering (slots 1–8). Tile-sourced rosters encode physical index in synthetic ids. */
function heroDisplayedSeatNumber(player: PlayerState, contiguousOrderOneBased: number): number {
  const m = /^venue-wall-seat-.+-(\d+)$/.exec(player.id)
  if (m && m[1] != null) {
    const zero = Number(m[1])
    if (Number.isFinite(zero)) return zero + 1
  }
  return contiguousOrderOneBased
}

/** Venue-wall hero: combine phase + board label without stray em dash columns. */
function venueWallHeroMergedLine(gs: GameState): string {
  const ph = gs.phase
  const phaseLab = displayPhaseLabel(ph)
  const streetLab = displayStreetLabel(gs)
  if (ph === 'question') return phaseLab
  if (streetLab === '—') return phaseLab
  return `${phaseLab} · ${streetLab}`
}

function DisplayTableInfoBar({
  gameState,
  layout = 'default',
}: {
  gameState: GameState
  /** Full-width strip for embedded venue heroes (fills center band between crawls). */
  layout?: 'default' | 'venueHero'
}) {
  const venueHero = layout === 'venueHero'
  const seatedCount = gameState.players.reduce(
    (n, p) => n + (String(p.name ?? '').trim() !== '' ? 1 : 0),
    0
  )
  const potRaw = gameState.round?.pot
  const potShown =
    typeof potRaw === 'number' && Number.isFinite(potRaw) ? Math.max(0, Math.round(potRaw)) : 0

  if (venueHero) {
    const lobby = gameState.phase === 'lobby'
    return (
      <div className="w-full min-w-0">
        <div className="w-full border border-yellow-600 bg-black/90 px-3 py-3 backdrop-blur-md sm:px-5 sm:py-3.5">
          <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3 sm:items-center sm:gap-6">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55 md:text-xs">Table</div>
              <div className="text-xl font-bold tabular-nums text-yellow-400 sm:text-2xl md:text-3xl">
                {displayTableLabel(gameState.tableId ?? '1')}
              </div>
              <div className="mt-1 text-[13px] tabular-nums text-white/50 sm:text-sm">
                Blinds ${gameState.smallBlind} / ${gameState.bigBlind}
              </div>
            </div>

            <div className="sm:border-x sm:border-yellow-700/35 sm:py-1">
              {lobby ? (
                <>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55 md:text-xs">Status</div>
                  <div className="text-xl font-bold text-yellow-400 sm:text-2xl md:text-3xl">
                    {displayPhaseLabel(gameState.phase)}
                  </div>
                  <div className="mt-1 text-[13px] text-white/50 sm:text-sm">{seatedCount} seated</div>
                </>
              ) : (
                <>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55 md:text-xs">Pot</div>
                  <div className="font-black tabular-nums text-[1.85rem] text-yellow-400 sm:text-[2.125rem] md:text-4xl">
                    ${potShown.toLocaleString()}
                  </div>
                </>
              )}
            </div>

            <div>
              {!lobby ? (
                <>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55 md:text-xs">
                    Situation
                  </div>
                  <div className="mt-1 text-balance text-base font-semibold leading-snug text-yellow-400 sm:text-lg md:text-xl">
                    {venueWallHeroMergedLine(gameState)}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/55 md:text-xs">
                    &nbsp;
                  </div>
                  <div className="mt-2 text-sm leading-snug text-white/40 sm:text-base">
                    Game flow runs from the host console.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4">
      <div className="border border-yellow-600 bg-black/90 px-4 py-4 backdrop-blur-md md:rounded-t-lg md:py-5">
        <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4 md:gap-5">
          <div>
            <div className="text-base text-white md:text-xl">Felt</div>
            <div className="text-xl font-bold text-yellow-400 md:text-3xl">
              {displayTableLabel(gameState.tableId ?? '1')}
            </div>
          </div>
          <div>
            <div className="text-base text-white md:text-xl">Blinds</div>
            <div className="text-xl font-bold tabular-nums text-yellow-400 md:text-3xl">
              ${gameState.smallBlind} / ${gameState.bigBlind}
            </div>
          </div>
          <div>
            <div className="text-base text-white md:text-xl">Phase</div>
            <div className="text-xl font-bold text-yellow-400 md:text-3xl">{displayPhaseLabel(gameState.phase)}</div>
          </div>
          <div>
            <div className="text-base text-white md:text-xl">Street</div>
            <div className="text-xl font-bold text-yellow-400 md:text-3xl">{displayStreetLabel(gameState)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function useObservedClientSize(ref: RefObject<HTMLElement | null>): { w: number; h: number } {
  const [s, setS] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const publish = () =>
      setS({ w: Math.max(1, el.clientWidth), h: Math.max(1, el.clientHeight) })
    publish()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', publish)
      return () => window.removeEventListener('resize', publish)
    }
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    window.addEventListener('resize', publish)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', publish)
    }
  }, [ref])
  return s
}

type DisplayTableLiveProps = {
  /** Target felt 1–8 (or alphanumeric single-table URL) — drives demo scaffolding when socket state has not arrived. */
  feltTableHint: string
  /** `embedded` docks overlays inside the mounting container (venue-wall hero/single-TV card). */
  variant?: 'fullscreen' | 'embedded'
  /** When the parent already renders the headline question/timer (venue wall header). */
  hideQuestionBanner?: boolean
  /**
   * Venue mosaic row for this hero — reconstructs seated lobby when socket `state` is for another
   * numbered table or has not arrived (display sockets follow a single spotlight session).
   */
  venueHeroTile?: DisplayVenueTileSnapshot | null
}

function DisplayTableLive({
  feltTableHint,
  variant = 'fullscreen',
  hideQuestionBanner = false,
  venueHeroTile = null,
}: DisplayTableLiveProps) {
  const isEmbedded = variant === 'embedded'

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isDealing, setIsDealing] = useState(false)
  
  // Use ref to store the latest animation function to avoid dependency cycles
  const triggerCommunityDealingAnimationRef = useRef<(() => void) | null>(null)
  /** Same subtree as dealing flights — convert anchor `getBoundingClientRect` to plane px. */
  const feltLayerRef = useRef<HTMLDivElement>(null)
  const holeCardAnchorRefs = useRef<(HTMLDivElement | null)[][]>([])
  const holeCardDealEndpointsRef = useRef<Map<string, HoleCardPlaneEndpoint>>(new Map())
  const pendingHoleDealQueueRef = useRef<
    Array<{ id: string; playerIndex: number; cardIndex: number; digit: number }> | null
  >(null)
  const [holeDealLayoutEpoch, setHoleDealLayoutEpoch] = useState(0)
  const [dealingCards, setDealingCards] = useState<Array<{id: string, playerIndex: number, cardIndex: number, digit: number}>>([])
  const [hasDealtCards, setHasDealtCards] = useState(false) // Track if cards have been dealt - start false to hide initial cards
  /** Hole cards revealed by the last deal flight when socket/tile state has not caught up yet. */
  const [postDealHoleHands, setPostDealHoleHands] = useState<Record<number, NumericCard[]>>({})
  
  // Community card dealing animation state
  const [isDealingCommunity, setIsDealingCommunity] = useState(false)
  const [dealingCommunityCards, setDealingCommunityCards] = useState<Array<{id: string, cardIndex: number, digit: number, isRevealed: boolean}>>([])
  const [hasDealtCommunityCards, setHasDealtCommunityCards] = useState(false) // Start false - cards only show after dealing animation
  const [showDeck, setShowDeck] = useState(false) // Control deck visibility during animation
  
  // Shared community cards state - used by both animation and static display
  const [sharedCommunityCards, setSharedCommunityCards] = useState<Array<{digit: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}>>([])

  const gameStateRef = useRef<GameState | null>(null)
  gameStateRef.current = gameState

  const spotlightRoundKeyRef = useRef<string | null>(null)
  const isDealingRef = useRef(false)
  const midJoinHoleRevealTimerRef = useRef<number | null>(null)
  const pendingSpotlightRevealRef = useRef(false)
  isDealingRef.current = isDealing

  const revealPersistedCardsFromDisplayState = useCallback((gs: GameState) => {
    const anyHole = gs.players.some((p) => p.hand.length > 0)
    const anyCommunity = gs.round.communityCards.length > 0
    if (anyHole) setHasDealtCards(true)
    if (anyCommunity) {
      setHasDealtCommunityCards(true)
      setSharedCommunityCards(gs.round.communityCards.map((c) => ({ digit: c.digit })))
    }
  }, [])

  /** Host spotlight / venue hero table changed — drop stale socket snapshot and deal UI until `state` for this felt arrives. */
  useEffect(() => {
    const tid = feltTableHint.trim()
    pendingSpotlightRevealRef.current = true
    setGameState((prev) =>
      prev != null && tid !== '' && String(prev.tableId) === tid ? prev : null
    )
    spotlightRoundKeyRef.current = null
    setIsDealing(false)
    setDealingCards([])
    setIsDealingCommunity(false)
    setDealingCommunityCards([])
    setShowDeck(false)
    pendingHoleDealQueueRef.current = null
    setHasDealtCards(false)
    setHasDealtCommunityCards(false)
    setSharedCommunityCards([])
    setPostDealHoleHands({})

    if (tid) {
      const cached = readDisplaySpotlightState(tid)
      if (cached) {
        setGameState(cached)
        revealPersistedCardsFromDisplayState(cached)
        pendingSpotlightRevealRef.current = false
      }
    }
  }, [feltTableHint, revealPersistedCardsFromDisplayState])

  useEffect(() => {
    const tid = feltTableHint.trim()
    const unsubscribe = onState((newGameState) => {
      if (isEmbedded && tid !== '' && String(newGameState.tableId) !== tid) {
        return
      }

      // Clear client-side community card state when server has no cards (new round, etc.)
      if (!newGameState?.round?.communityCards || newGameState.round.communityCards.length === 0) {
        setSharedCommunityCards([])
        setHasDealtCommunityCards(false)
        setDealingCommunityCards([])
        setIsDealingCommunity(false)
      }

      setGameState(newGameState)
      if (isEmbedded && tid !== '' && String(newGameState.tableId) === tid) {
        cacheDisplaySpotlightState(newGameState)
        if (pendingSpotlightRevealRef.current && !isDealingRef.current) {
          revealPersistedCardsFromDisplayState(newGameState)
          pendingSpotlightRevealRef.current = false
        }
      }
    })
    return unsubscribe
  }, [feltTableHint, isEmbedded, revealPersistedCardsFromDisplayState])

  // Celebration confetti on showdown
  useEffect(() => {
    if (gameState?.phase !== 'showdown') return

    const end = Date.now() + 5000
    const interval = setInterval(() => {
      confetti({
        particleCount: 90,
        spread: 70,
        startVelocity: 45,
        gravity: 0.9,
        ticks: 200,
        origin: { x: Math.random() * 0.6 + 0.2, y: 0.2 + Math.random() * 0.2 }
      })
    }, 450)
    const finaleTimeout = setTimeout(() => {
      confetti({ particleCount: 220, spread: 100, startVelocity: 55, origin: { y: 0.6 } })
    }, 2600)
    const stopTimeout = setTimeout(() => clearInterval(interval), Math.max(0, end - Date.now()))

    return () => {
      clearInterval(interval)
      clearTimeout(finaleTimeout)
      clearTimeout(stopTimeout)
    }
  }, [gameState?.phase])

  useEffect(() => {
    const unsubscribe = onToast((message) => {
      setToastMessage(message)
      setTimeout(() => setToastMessage(null), 3000)
    })
    return unsubscribe
  }, [])

  // Offline / standalone: rehearsal preview. Embedded venue wall: lobby shell until socket `state` —
  // do not use {@link buildDisplayPreviewGameState} (shows fake answering + three-board “Flop”).
  const [demoGameState, setDemoGameState] = useState<GameState>(() =>
    buildDisplayPreviewGameState(readDisplayVenueCode(), feltTableHint)
  )

  useEffect(() => {
    setDemoGameState(buildDisplayPreviewGameState(readDisplayVenueCode(), feltTableHint))
  }, [feltTableHint])

  const displayGameState = useMemo(() => {
    if (!isEmbedded) return gameState ?? demoGameState
    return embeddedHeroDisplayState(
      gameState,
      feltTableHint,
      venueHeroTile ?? undefined,
      readDisplayVenueCode()
    )
  }, [isEmbedded, gameState, feltTableHint, venueHeroTile, demoGameState])

  /** Live socket state already includes hole cards (hero spotlight / mid-hand join) — do not wait for deal animation. */
  const feltHasPersistedHoleCards = useMemo(
    () => displayGameState.players.some((p) => p.hand.length > 0),
    [displayGameState.players]
  )

  const feltHasPersistedCommunityCards =
    displayGameState.round.communityCards.length > 0

  /** Mid-hand join on the same spotlight table (no table hop): reveal if no deal animation follows. */
  useEffect(() => {
    if (midJoinHoleRevealTimerRef.current) {
      window.clearTimeout(midJoinHoleRevealTimerRef.current)
      midJoinHoleRevealTimerRef.current = null
    }
    if (!feltHasPersistedHoleCards || isDealing) return

    if (pendingSpotlightRevealRef.current) {
      setHasDealtCards(true)
      if (feltHasPersistedCommunityCards) {
        setHasDealtCommunityCards(true)
      }
      pendingSpotlightRevealRef.current = false
      return
    }

    midJoinHoleRevealTimerRef.current = window.setTimeout(() => {
      midJoinHoleRevealTimerRef.current = null
      if (!isDealingRef.current) {
        setHasDealtCards(true)
      }
    }, HOLE_MIDJOIN_REVEAL_MS)

    return () => {
      if (midJoinHoleRevealTimerRef.current) {
        window.clearTimeout(midJoinHoleRevealTimerRef.current)
        midJoinHoleRevealTimerRef.current = null
      }
    }
  }, [feltHasPersistedHoleCards, feltHasPersistedCommunityCards, isDealing, gameState?.round?.roundId])

  useEffect(() => {
    if (!feltHasPersistedCommunityCards || isDealingCommunity) return
    const id = window.setTimeout(() => {
      if (!isDealingCommunity) {
        setHasDealtCommunityCards(true)
      }
    }, HOLE_MIDJOIN_REVEAL_MS)
    return () => window.clearTimeout(id)
  }, [feltHasPersistedCommunityCards, isDealingCommunity, gameState?.round?.roundId])

  const blindSeatMarkers = useMemo(
    () =>
      displayBlindSeatIndices(
        displayGameState.players.length,
        displayGameState.round.dealerIndex
      ),
    [displayGameState.players.length, displayGameState.round.dealerIndex]
  )

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setPrefersReducedMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const heroFeltTableId = feltTableHint.trim()
  const socketStateMatchesHero =
    gameState != null && heroFeltTableId !== '' && String(gameState.tableId) === heroFeltTableId

  const heroBettingHud = useMemo(() => {
    const gs = displayGameState
    const n = gs.players.length
    const phase = gs.phase
    const isBetting = phase === 'betting'
    const open = gs.round.isBettingOpen !== false
    const acting = displayActingSeatIndex(gs.phase, n, {
      currentPlayerIndex: gs.round.currentPlayerIndex,
      isBettingOpen: gs.round.isBettingOpen,
    })

    const showSeatPills = isBetting && n > 0
    const lastActs = gs.round.lastSeatBettingAction

    const tileMatches =
      isEmbedded &&
      venueHeroTile != null &&
      heroFeltTableId !== '' &&
      venueHeroTile.tableNum === Number.parseInt(heroFeltTableId, 10)

    let callLabel: string | null = null
    let showCallBubble = false

    if (isBetting && open && acting != null && acting >= 0 && acting < n) {
      const p = gs.players[acting]!
      const first = String(p.name ?? '').split(/\s+/)[0] || 'Player'
      let amt = 0
      if (socketStateMatchesHero) {
        amt = chipsRequiredToCall(gs, p.id)
      } else if (tileMatches && venueHeroTile?.actingCallAmount != null) {
        const a = venueHeroTile.actingCallAmount
        amt = typeof a === 'number' && Number.isFinite(a) ? Math.max(0, Math.round(a)) : 0
      }

      showCallBubble = true
      callLabel = amt <= 0 ? `${first} · No bet to match` : `${first} · Call ${formatHeroStackMoney(amt)}`
    }

    return {
      acting,
      open,
      showSeatPills,
      lastActs,
      showCallBubble,
      callLabel,
    }
  }, [displayGameState, socketStateMatchesHero, isEmbedded, venueHeroTile, heroFeltTableId])

  // Compute showdown winner id (used for seat glow)
  const showdownWinnerId = (() => {
    try {
      if (displayGameState.phase !== 'showdown') return undefined
      const correct = displayGameState.round.question?.answer
      if (typeof correct !== 'number') return undefined
      let bestId: string | undefined
      let bestDist = Infinity
      for (const p of displayGameState.players) {
        const sa = p.submittedAnswer
        if (p.hasFolded || typeof sa !== 'number') continue
        const d = Math.abs(sa - correct)
        if (d < bestDist) { bestDist = d; bestId = p.id }
      }
      return bestId
    } catch {
      return undefined
    }
  })()
  const showdownWinnerName = showdownWinnerId
    ? (displayGameState.players.find(p => p.id === showdownWinnerId)?.name || '')
    : ''

  // Chips flight animation + payout tick
  const [chipFlights, setChipFlights] = useState<Array<{ id: number; delay: number; ox: number; oy: number; rot: number }>>([])
  const [payoutTick, setPayoutTick] = useState<number>(0)

  useEffect(() => {
    if (displayGameState.phase !== 'showdown') {
      setChipFlights([])
      setPayoutTick(0)
      return
    }
    if (!showdownWinnerId) return
    const pot = displayGameState.round.pot || 0
    if (pot <= 0) return

    // Compute positions
    const winnerIndex = displayGameState.players.findIndex(p => p.id === showdownWinnerId)
    if (winnerIndex < 0) return
    // Prime seat computation (used later in chip-flight layer)
    getPlayerPosition(winnerIndex, displayGameState.players.length)

    // Generate chips
    const chips: Array<{ id: number; delay: number; ox: number; oy: number; rot: number }> = []
    const N = 18
    for (let i = 0; i < N; i++) {
      chips.push({ id: i, delay: Math.random() * 0.6, ox: (Math.random() - 0.5) * 60, oy: (Math.random() - 0.5) * 40, rot: (Math.random() - 0.5) * 90 })
    }
    setChipFlights(chips)

    // Animate payout tick up
    const duration = 1800
    const start = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      setPayoutTick(Math.round(pot * p))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)

    // Cleanup after a while
    const cleanup = setTimeout(() => setChipFlights([]), 2600)
    return () => clearTimeout(cleanup)
  }, [displayGameState.phase, showdownWinnerId, displayGameState.players.length])

  const registerHoleCardAnchor = useCallback(
    (playerIndex: number, cardIndex: number, el: HTMLDivElement | null) => {
      const rows = holeCardAnchorRefs.current
      while (rows.length <= playerIndex) rows.push([])
      const row = rows[playerIndex]!
      while (row.length <= cardIndex) row.push(null)
      row[cardIndex] = el
    },
    []
  )

  const refreshHoleCardDealEndpoints = useCallback((playerCount: number) => {
    const root = feltLayerRef.current
    const next = new Map<string, HoleCardPlaneEndpoint>()
    if (root) {
      for (let p = 0; p < playerCount; p++) {
        for (let c = 0; c < 2; c++) {
          const anchor = holeCardAnchorRefs.current[p]?.[c]
          if (!anchor) continue
          const pt = holeCardRectToPlaneEndpoint(root, anchor.getBoundingClientRect())
          if (pt) next.set(`${p}-${c}`, pt)
        }
      }
    }
    holeCardDealEndpointsRef.current = next
  }, [])

  // Function to trigger dealing animation
  const triggerDealingAnimation = useCallback(() => {
    const cards: Array<{ id: string; playerIndex: number; cardIndex: number; digit: number }> = []

    for (let cardIndex = 0; cardIndex < 2; cardIndex++) {
      displayGameState.players.forEach((player, playerIndex) => {
        if (player.hand.length > cardIndex) {
          cards.push({
            id: `dealing-${playerIndex}-${cardIndex}`,
            playerIndex,
            cardIndex,
            digit: player.hand[cardIndex].digit,
          })
        } else {
          cards.push({
            id: `dealing-${playerIndex}-${cardIndex}`,
            playerIndex,
            cardIndex,
            digit: Math.floor(Math.random() * 9) + 1,
          })
        }
      })
    }

    pendingHoleDealQueueRef.current = cards
    setDealingCards([])
    setHasDealtCards(false)
    setPostDealHoleHands({})
    setShowDeck(true)
    setIsDealing(true)
    setHoleDealLayoutEpoch((n) => n + 1)
  }, [displayGameState.players])

  useLayoutEffect(() => {
    if (!isDealing) return
    const cards = pendingHoleDealQueueRef.current
    if (!cards || cards.length === 0) return
    pendingHoleDealQueueRef.current = null

    const playerCount = displayGameState.players.length
    refreshHoleCardDealEndpoints(playerCount)
    requestAnimationFrame(() => {
      refreshHoleCardDealEndpoints(playerCount)
    })

    cards.forEach((card, index) => {
      window.setTimeout(() => {
        setDealingCards((prev) => [...prev, card])
      }, index * 200)
    })

    const endMs = cards.length * 200 + 1000
    const dealtSnapshot = cards.reduce<Record<number, NumericCard[]>>((acc, c) => {
      const row = acc[c.playerIndex] ?? []
      row[c.cardIndex] = { digit: c.digit as NumericCard['digit'] }
      acc[c.playerIndex] = row
      return acc
    }, {})

    const endTimer = window.setTimeout(() => {
      setIsDealing(false)
      setDealingCards([])
      setShowDeck(false)
      setHasDealtCards(true)
      setPostDealHoleHands(dealtSnapshot)

      if (!gameStateRef.current) {
        const updatedPlayers = displayGameState.players.map((player, playerIndex) => {
          const fromDeal = dealtSnapshot[playerIndex]
          const hasHole = player.hand.length >= 2
          return {
            ...player,
            hand: hasHole ? player.hand : (fromDeal?.length ? fromDeal : player.hand),
          }
        })
        setDemoGameState((prev) => ({
          ...prev,
          players: updatedPlayers,
        }))
      }
    }, endMs)

    return () => window.clearTimeout(endTimer)
  }, [isDealing, holeDealLayoutEpoch, refreshHoleCardDealEndpoints])

  // Function to trigger community card dealing animation
  const triggerCommunityDealingAnimation = useCallback(() => {
    const currentGameState = displayGameState
    
    // ONLY use server community cards - NO RANDOM FALLBACK
    if (currentGameState.round.communityCards.length === 0) {
      return // Don't run animation if no server cards
    }
    
    // Use server community cards
    const cardsToUse = currentGameState.round.communityCards.map(card => ({ digit: card.digit }))
    
    // IMMEDIATELY set the shared community cards so static display uses the same values
    setSharedCommunityCards(cardsToUse)
    
    // Start animation immediately with these cards (dealing state already set by event listener)
    setDealingCommunityCards([])
    setShowDeck(true) // Show deck for community cards animation
    
    // Create dealing cards using the cards to use
    const cards: Array<{id: string, cardIndex: number, digit: number, isRevealed: boolean}> = []
    
    cardsToUse.forEach((card, index) => {
      cards.push({
        id: `community-dealing-${index}`,
        cardIndex: index,
        digit: card.digit,
        isRevealed: false // Start face down
      })
    })
    
    // Phase 1: Deal cards face down
    cards.forEach((card, index) => {
      setTimeout(() => {
        setDealingCommunityCards(prev => [...prev, card])
      }, index * 200) // 200ms delay between each card
    })
    
    // Phase 2: Reveal all cards after dealing
    setTimeout(() => {
      setDealingCommunityCards(prev => prev.map(card => ({ ...card, isRevealed: true })))
    }, cards.length * 200 + 500) // Wait for all cards to be dealt + 500ms
    
    // Phase 3: End animation and update server state with these cards
    setTimeout(() => {
      setIsDealingCommunity(false)
      setDealingCommunityCards([])
      setShowDeck(false) // Hide deck after community cards deal
      setHasDealtCommunityCards(true) // Mark that community cards have been dealt
      
      // No need to update demo state - we're using shared community cards state
    }, cards.length * 200 + 500 + 1000) // Wait for dealing + reveal + 1s
  }, [displayGameState]) // Include displayGameState to get fresh state
  
  // Store the latest function in the ref
  useEffect(() => {
    triggerCommunityDealingAnimationRef.current = triggerCommunityDealingAnimation
  }, [triggerCommunityDealingAnimation])

  useEffect(() => {
    const tid = feltTableHint.trim()
    const unsubscribe = onDealingCards(() => {
      if (midJoinHoleRevealTimerRef.current) {
        window.clearTimeout(midJoinHoleRevealTimerRef.current)
        midJoinHoleRevealTimerRef.current = null
      }
      pendingSpotlightRevealRef.current = false
      setIsDealing(true)
      setHasDealtCards(false)
      setPostDealHoleHands({})

      window.setTimeout(() => {
        const gs = gameStateRef.current
        if (isEmbedded && tid !== '' && gs != null && String(gs.tableId) !== tid) {
          setIsDealing(false)
          return
        }
        triggerDealingAnimation()
      }, 100)
    })
    return unsubscribe
  }, [feltTableHint, isEmbedded, triggerDealingAnimation])

  useEffect(() => {
    const tid = feltTableHint.trim()
    const unsubscribe = onDealingCommunityCards(() => {
      const gs = gameStateRef.current
      if (isEmbedded && tid !== '' && gs != null && String(gs.tableId) !== tid) {
        return
      }

      // IMMEDIATELY set dealing state to prevent static cards from showing
      setIsDealingCommunity(true)
      setHasDealtCommunityCards(false) // Hide static cards during animation

      // Wait for the state update to arrive, then trigger animation
      setTimeout(() => {
        const latest = gameStateRef.current
        if (isEmbedded && tid !== '' && latest != null && String(latest.tableId) !== tid) {
          setIsDealingCommunity(false)
          return
        }
        if (triggerCommunityDealingAnimationRef.current) {
          triggerCommunityDealingAnimationRef.current()
        }
      }, 200) // Wait 200ms for state update to arrive
    })
    return unsubscribe
  }, [feltTableHint, isEmbedded])

  // Reset deal UI when the same spotlight table starts a new round (not when hopping tables).
  useEffect(() => {
    if (!gameState?.round?.roundId) return
    const key = `${gameState.tableId}:${gameState.round.roundId}`
    if (spotlightRoundKeyRef.current === key) return
    spotlightRoundKeyRef.current = key

    const anyHole = gameState.players.some((p) => p.hand.length > 0)
    const anyCommunity = gameState.round.communityCards.length > 0

    if (!anyHole) {
      setHasDealtCards(false)
      setPostDealHoleHands({})
    }
    if (!anyCommunity) {
      setHasDealtCommunityCards(false)
      setSharedCommunityCards([])
    }
    setDealingCommunityCards([])
    setIsDealingCommunity(false)
  }, [gameState?.tableId, gameState?.round?.roundId, gameState?.players, gameState?.round?.communityCards])

  const [answerSecondsLeft, setAnswerSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    const gs = displayGameState
    const deadline = gs.round?.answerDeadline
    const inAnswering = gs.phase === 'answering'

    if (!inAnswering || deadline == null) {
      setAnswerSecondsLeft(null)
      return
    }

    const tick = () => {
      const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setAnswerSecondsLeft(s)
    }
    tick()
    const id = window.setInterval(tick, 200)
    return () => window.clearInterval(id)
  }, [displayGameState.phase, displayGameState.round?.answerDeadline])

  const shellRef = useRef<HTMLDivElement>(null)
  const gamePlaneRef = useRef<HTMLDivElement>(null)
  const shellSize = useObservedClientSize(shellRef)
  const gamePlaneSize = useObservedClientSize(gamePlaneRef)

  if (!displayGameState) {
    return (
      <div className="min-h-screen bg-casino-gradient flex items-center justify-center">
        <div className="text-center">
          <motion.h1 
            className="text-8xl font-black text-casino-emerald mb-8"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            🎰 QUIZZING HOLD-EM
          </motion.h1>
          <motion.div 
            className="text-3xl text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Connecting to server...
          </motion.div>
        </div>
      </div>
    )
  }

  /** Negative = move felt + seats up in fullscreen; embedded venue uses overlay HUD + full-height plane, so keep 0 to center vertically. */
  const displayTableLiftPx = variant === 'embedded' ? 0 : -88

  /**
   * Pixel offset of the player HUD box center from the game plane center (same coords as `fdW`×`fdH`).
   * Used by `getPlayerPosition`, dealing flight paths, and chip flights — do not parse `calc(50% + … - 55px)` with parseFloat
   * (that only reads the first `px` group and misplaces animations until static cards replace them).
   */
  const getPlayerSeatOffsetFromPlaneCenterPx = (index: number, total: number) => {
    const { ox: cupholderX, oy: cupholderY } = heroSeatCupOffsets(index, total)
    const cupholderDistance = Math.sqrt(cupholderX * cupholderX + cupholderY * cupholderY) || 1
    const directionX = cupholderX / cupholderDistance
    const directionY = cupholderY / cupholderDistance
    let extensionDistance = 142
    const isCornerPosition = index % 2 === 1
    extensionDistance = isCornerPosition ? extensionDistance * 1.1 : extensionDistance * 0.9
    const playerX = cupholderX + directionX * extensionDistance
    const playerY = cupholderY + directionY * extensionDistance
    return {
      dx: playerX - 55,
      dy: playerY + displayTableLiftPx - 60,
    }
  }

  // Calculate player positions around the table (perfectly aligned with cupholders / felt overlays)
  const getPlayerPosition = (index: number, total: number) => {
    const { dx, dy } = getPlayerSeatOffsetFromPlaneCenterPx(index, total)
    return {
      x: `calc(50% + ${dx}px)`,
      y: `calc(50% + ${dy}px)`,
    }
  }

  const gwFallback = typeof window !== 'undefined' ? window.innerWidth : 1280
  const ghFallback = typeof window !== 'undefined' ? window.innerHeight : 720
  /** Game plane px — animations are authored against this rectangle. */
  const gw = gamePlaneSize.w > 0 ? gamePlaneSize.w : gwFallback
  const gh = gamePlaneSize.h > 0 ? gamePlaneSize.h : ghFallback
  /** Shell px — overlays (chips/toasts) anchored to layout root (viewport in fullscreen mode). */
  const sw = shellSize.w > 0 ? shellSize.w : gwFallback
  const sh = shellSize.h > 0 ? shellSize.h : ghFallback

  /** Coordinate space for dealing/community math (matches the positioned subtree). */
  const fdW = isEmbedded ? EMBEDDED_FELT_LAYOUT_W : gw
  const fdH = isEmbedded ? EMBEDDED_FELT_LAYOUT_H : gh
  const embeddedHorizPad = 36
  /** Seats/cards protrude vertically beyond nominal layout px; shrinking scale avoids top/bottom clip. */
  const embeddedSeatOverhangY = 120
  const embeddedFeltScale =
    isEmbedded && gw > 1 && gh > 1
      ? Math.min(
          1,
          (gw - embeddedHorizPad) / EMBEDDED_FELT_LAYOUT_W,
          (gh - embeddedSeatOverhangY) / EMBEDDED_FELT_LAYOUT_H
        ) * 0.96
      : 1
  /** Viewport overlays in fullscreen mode; hero-clipped overlays when embedded. */
  const dockCls = isEmbedded ? 'absolute' : 'fixed'

  const showQuestionStrip = Boolean(displayGameState.round.question) && !hideQuestionBanner

  /** Full-bleed game plane under a bottom docked HUD (venue wall hides question banner). */
  const embeddedHudOverlay = isEmbedded && !showQuestionStrip
  /** Fine vertical offset for scaled authoring rect inside the measured game plane (`px`). */
  const embeddedScaledLayerNudgeYPx = 0

  return (
    <div
      ref={shellRef}
      className={
        isEmbedded
          ? 'relative flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
      }
    >
      {/* Casino Floor Background */}
      <div className="absolute inset-0">
        {/* Base casino floor */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
        
        {/* Much more visible carpet pattern overlay */}
        <div className="absolute inset-0 opacity-60">
          <div className="w-full h-full" style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(139, 69, 19, 0.3) 3px, transparent 3px),
              radial-gradient(circle at 75% 75%, rgba(160, 82, 45, 0.3) 3px, transparent 3px),
              linear-gradient(45deg, transparent 48%, rgba(139, 69, 19, 0.15) 49%, rgba(139, 69, 19, 0.15) 51%, transparent 52%),
              linear-gradient(-45deg, transparent 48%, rgba(160, 82, 45, 0.15) 49%, rgba(160, 82, 45, 0.15) 51%, transparent 52%)
            `,
            backgroundSize: '40px 40px, 40px 40px, 80px 80px, 80px 80px',
            backgroundPosition: '0 0, 20px 20px, 0 0, 0 0'
          }}></div>
        </div>
        
        {/* Ambient lighting effects */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 via-transparent to-blue-500/5"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-red-500/3 via-transparent to-green-500/3"></div>
        
        {/* Overhead lighting spots */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-radial from-yellow-200/10 to-transparent rounded-full"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-radial from-yellow-200/10 to-transparent rounded-full"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-gradient-radial from-blue-200/8 to-transparent rounded-full"></div>
        
        {/* Wall texture */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(90deg, transparent 98%, rgba(255, 255, 255, 0.1) 100%),
              linear-gradient(0deg, transparent 98%, rgba(255, 255, 255, 0.1) 100%)
            `,
            backgroundSize: '20px 20px'
          }}></div>
        </div>
      </div>

      {/* Toast Messages */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className={`${dockCls} top-4 right-4 z-50 bg-black/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-5 text-lg text-white`}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>



      <div
        className={
          isEmbedded
            ? 'relative z-10 flex min-h-0 min-w-0 flex-1 flex-col p-0'
            : 'relative z-10 p-2'
        }
      >
        {!isEmbedded ? (
          <motion.div
            className="mb-1 text-center"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="mb-1 flex items-center justify-center gap-2 text-5xl font-black text-yellow-400 md:text-6xl">
              🎰 <PokerChip size="lg" className="mx-1" />
              {'Quizz\u2019em'}
            </h1>
            <div className="text-xl text-white md:text-2xl">
              Phase:{' '}
              <span className="font-bold text-yellow-400">{displayGameState.phase}</span>
              {!gameState && <span className="ml-2 text-red-400">(DEMO MODE - 8 Players)</span>}
            </div>
          </motion.div>
        ) : null}

        {/* Question + answering timer — readable from the whole room */}
        {showQuestionStrip ? (
          <motion.div
            className={
              isEmbedded
                ? 'relative z-40 mb-2 shrink-0 px-1 sm:px-2'
                : 'fixed top-28 left-0 right-0 z-40 px-3 sm:px-6'
            }
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-2xl border-2 border-yellow-500/50 bg-black/90 p-5 shadow-2xl backdrop-blur-md sm:flex-row sm:items-stretch">
              <div className="min-w-0 flex-1 text-center">
                <div className="mb-2 text-2xl font-semibold text-white md:text-3xl">🎯 Current question</div>
                <div className="text-balance text-4xl font-bold leading-snug text-yellow-400 sm:text-5xl md:text-6xl">
                  {displayGameState.round.question!.text}
                </div>
              </div>

              {displayGameState.phase === 'answering' ? (
                <div
                  className={`flex shrink-0 flex-col items-center justify-center rounded-xl border px-6 py-4 sm:border-l sm:border-t-0 sm:border-yellow-500/35 sm:pl-8 ${
                    typeof answerSecondsLeft === 'number' && answerSecondsLeft <= 10
                      ? 'border-red-400/55 bg-red-950/35'
                      : 'border-yellow-500/25 bg-yellow-950/20'
                  }`}
                >
                  <div className="text-sm font-bold uppercase tracking-widest text-white/65">Time left</div>
                  <motion.div
                    key={answerSecondsLeft ?? 'wait'}
                    className={`tabular-nums text-7xl font-black sm:text-8xl md:text-9xl ${
                      typeof answerSecondsLeft === 'number' && answerSecondsLeft <= 10
                        ? 'text-red-300'
                        : 'text-yellow-400'
                    }`}
                    animate={
                      typeof answerSecondsLeft === 'number' &&
                      answerSecondsLeft > 0 &&
                      answerSecondsLeft <= 10
                        ? { scale: [1, 1.04, 1] }
                        : {}
                    }
                    transition={{ repeat: Infinity, duration: 0.9 }}
                  >
                    {typeof answerSecondsLeft === 'number' ? `${answerSecondsLeft}s` : '—'}
                  </motion.div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}

        {/* Main Game Area */}
        <div
          ref={gamePlaneRef}
          className={
            isEmbedded
              ? embeddedHudOverlay
                ? 'relative flex min-h-0 min-w-0 w-full max-w-none flex-1 overflow-hidden'
                : 'relative mx-auto flex min-h-0 min-w-0 w-full max-w-7xl flex-1 overflow-hidden'
              : `relative mx-auto max-w-7xl h-[calc(100vh-200px)] ${
                  showQuestionStrip ? 'mt-[min(188px,19.5vh)]' : 'mt-[5vh]'
                }`
          }
        >
          <motion.div
            ref={feltLayerRef}
            className={isEmbedded ? 'absolute' : 'absolute inset-0'}
            style={
              isEmbedded
                ? {
                    left: '50%',
                    top: '50%',
                    width: EMBEDDED_FELT_LAYOUT_W,
                    height: EMBEDDED_FELT_LAYOUT_H,
                    transform: `translate(-50%, calc(-50% + ${embeddedScaledLayerNudgeYPx}px)) scale(${embeddedFeltScale})`,
                    transformOrigin: 'center center',
                  }
                : { inset: 0 }
            }
          >
          {/* Dealing Animation */}
          <AnimatePresence>
            {isDealing && (
              <div className="absolute inset-0 z-50 pointer-events-none">
                
                {/* Dealer deck of cards - positioned below the tableau */}
                <motion.div
                  className="absolute"
                  style={{
                    left: 'calc(50% - 50px)', // Move deck more to the right
                    top: `calc(50% + ${100 + displayTableLiftPx}px)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  initial={{ scale: 0, opacity: 0, rotateY: 0 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Stack of cards to simulate a deck */}
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      style={{
                        left: `${i * 2}px`,
                        top: `${i * -1}px`,
                        zIndex: 5 - i
                      }}
                      animate={{
                        rotateY: [0, 5, -5, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.1
                      }}
                    >
                      <NumericPlayingCard
                        digit={0}
                        variant="cyan"
                        size="small"
                        faceDown={true}
                        backDesign="star"
                        style="neon"
                        neonVariant="matrix"
                      />
                    </motion.div>
                  ))}
                </motion.div>
                {dealingCards.map((dealingCard) => {
                  const endpointKey = `${dealingCard.playerIndex}-${dealingCard.cardIndex}`
                  const measured = holeCardDealEndpointsRef.current.get(endpointKey)
                  const { dx, dy } = getPlayerSeatOffsetFromPlaneCenterPx(
                    dealingCard.playerIndex,
                    displayGameState.players.length
                  )
                  const rawEndpoint =
                    measured ??
                    holeCardVisualTopLeftInPlanePx(
                      fdW,
                      fdH,
                      dx,
                      dy,
                      dealingCard.cardIndex
                    )
                  const { x: finalX, y: finalY, scale: finalScale } =
                    tuneHoleCardDealFlightEndpoint(rawEndpoint)

                  const deckCenterX = fdW / 2 - 50
                  const deckCenterY = fdH / 2 + 100 + displayTableLiftPx - fdH * 0.1
                  const initialX = deckCenterX
                  const initialY = deckCenterY

                  return (
                    <motion.div
                      key={dealingCard.id}
                      className="absolute"
                      style={{
                        left: 0,
                        top: 0,
                        transformOrigin: 'top left',
                      }}
                      initial={{
                        x: initialX,
                        y: initialY,
                        scale: finalScale * 0.12,
                        opacity: 0,
                        rotate: Math.random() * 360 - 180,
                      }}
                      animate={{
                        x: finalX,
                        y: finalY,
                        scale: finalScale,
                        opacity: 1,
                        rotate: 0,
                      }}
                      transition={{
                        duration: 0.9,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <NumericPlayingCard
                        digit={dealingCard.digit}
                        variant="cyan"
                        size="normal"
                        faceDown={true}
                        backDesign="star"
                        style="neon"
                        neonVariant="pulse"
                      />
                    </motion.div>
                  )
                })}
              </div>
            )}
          </AnimatePresence>

          {/* Community Card Dealing Animation */}
          <AnimatePresence>
            {isDealingCommunity && (
              <div className="absolute inset-0 z-50 pointer-events-none">
                
                {/* Dealer deck of cards - positioned below the tableau */}
                {showDeck && (
                  <motion.div
                    className="absolute"
                    style={{
                      left: 'calc(50% - 50px)', // Move deck more to the right
                      top: `calc(50% + ${100 + displayTableLiftPx}px)`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    initial={{ scale: 0, opacity: 0, rotateY: 0 }}
                    animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                  {/* Stack of cards to simulate a deck */}
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      style={{
                        left: `${i * 2}px`,
                        top: `${i * -1}px`,
                        zIndex: 5 - i
                      }}
                      animate={{
                        rotateY: [0, 5, -5, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.1
                      }}
                    >
                      <NumericPlayingCard
                        digit={0}
                        variant="cyan"
                        size="small"
                        faceDown={true}
                        backDesign="star"
                        style="neon"
                        neonVariant="matrix"
                      />
                    </motion.div>
                  ))}
                </motion.div>
                )}
                {dealingCommunityCards.map((dealingCard) => {
                  // Calculate exact endpoint for community card positioning (relative to table center)
                  const calculateCommunityCardEndpoint = (cardIndex: number) => {
                    // Community cards are positioned at the center of the measured game plane (original layout used viewport).
                    const tableCenterX = (fdW / 2) + (fdW * 0.02) - 18
                    const tableCenterY = (fdH / 2) + (fdH * 0.05) - fdH * 0.12 + 3 + displayTableLiftPx
                    
                                      // Calculate position for each community card in a horizontal row
                  const cardWidth = 64 // small card width (64px)
                  const cardSpacing = 8 // gap between cards
                  const totalWidth = (5 * cardWidth) + (4 * cardSpacing) // 5 cards total
                  // Move left so that the 3rd card (index 2) is centered - smaller offset
                  const startX = tableCenterX - (totalWidth / 2) - ((cardWidth + cardSpacing) * 0.75)
                  
                  const cardX = startX + (cardIndex * (cardWidth + cardSpacing)) + (cardWidth / 2)
                    const cardY = tableCenterY - 48 // Move up by same amount as static cards (-translate-y-12 = -48px)
                    
                    return { x: cardX, y: cardY, scale: 1.5 } // larger scale for community cards (more dramatic growth from deck)
                  }
                  
                  const { x: finalX, y: finalY, scale: finalScale } = calculateCommunityCardEndpoint(dealingCard.cardIndex)

                  const deckCenterX = fdW / 2 - 50
                  const deckCenterY = fdH / 2 + 100 + displayTableLiftPx - fdH * 0.1
                  const initialX = deckCenterX - (64 * 0.05) / 2
                  const initialY = deckCenterY - (96 * 0.05) / 2

                  return (
                    <motion.div
                      key={dealingCard.id}
                      className="absolute"
                      style={{ transformOrigin: 'top left' }}
                      initial={{
                        x: initialX,
                        y: initialY,
                        scale: 0.05,
                        rotate: Math.random() * 360 - 180,
                        opacity: 0,
                      }}
                      animate={{
                        x: finalX,
                        y: finalY,
                        scale: finalScale,
                        rotate: 0,
                        opacity: 1,
                      }}
                      transition={{
                        duration: 0.9,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <NumericPlayingCard
                        digit={dealingCard.digit}
                        variant="cyan"
                        size="small"
                        faceDown={!dealingCard.isRevealed}
                        style="neon"
                        neonVariant="pulse"
                      />
                    </motion.div>
                  )
                })}
              </div>
            )}
          </AnimatePresence>
          {/* Players positioned around the table */}
          {displayGameState.players.map((player, index) => {
            const position = getPlayerPosition(index, displayGameState.players.length)
            const actingHere = heroBettingHud.acting === index
            const lastBetAct = heroBettingHud.lastActs?.[index] ?? null
            const hideFoldBanner = heroBettingHud.showSeatPills && lastBetAct === 'fold'
            return (
              <motion.div 
                key={player.id} 
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${actingHere ? 'z-30' : 'z-20'}`}
                style={{ 
                  left: position.x, 
                  top: position.y 
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                {/* Winner glow ring */}
                {showdownWinnerId === player.id && (
                  <motion.div
                    className="absolute -inset-3 rounded-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.6 }}
                    style={{
                      boxShadow: '0 0 24px 6px rgba(255,215,0,0.55), 0 0 60px 12px rgba(255,215,0,0.25)'
                    }}
                  />
                )}
                {actingHere && (
                  <motion.div
                    className="pointer-events-none absolute -inset-2 rounded-xl"
                    aria-hidden
                    animate={prefersReducedMotion ? undefined : { opacity: [0.28, 0.62, 0.28] }}
                    transition={prefersReducedMotion ? undefined : { repeat: Infinity, duration: 1.35 }}
                    style={{
                      boxShadow: '0 0 26px 8px rgba(34,211,238,0.42), inset 0 0 20px rgba(34,211,238,0.12)',
                    }}
                  />
                )}
                <div
                  className={
                    actingHere
                      ? 'relative min-h-[118px] w-[120px] origin-center scale-[1.40625] transform rounded-lg border-2 border-cyan-400 bg-black/90 p-3 text-center shadow-lg ring-2 ring-cyan-300/85 backdrop-blur-md'
                      : 'relative min-h-[118px] w-[120px] origin-center scale-[1.40625] transform rounded-lg border-2 border-yellow-600 bg-black/90 p-3 text-center shadow-lg backdrop-blur-md'
                  }
                >
                  <div className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-yellow-600/85">
                    Seat {heroDisplayedSeatNumber(player, index + 1)}
                  </div>
                  <div className="mb-1 text-base font-bold text-yellow-400">{player.name}</div>
                  {heroBettingHud.showSeatPills && lastBetAct != null && (
                    <div className="mt-0.5 flex justify-center">
                      <span
                        className={`inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide shadow-md md:text-xs ${HERO_SEAT_BETTING_ACTION_PILL_CLASS[lastBetAct]}`}
                      >
                        {HERO_SEAT_BETTING_ACTION_LABELS[lastBetAct]}
                      </span>
                    </div>
                  )}
                  <div className="sr-only">${formatHeroStackMoney(player.bankroll)}</div>
                  
                  {/* Player's hand - docked at bottom edge with overlapping cards */}
                  {(() => {
                    const handToShow =
                      player.hand.length > 0 ? player.hand : (postDealHoleHands[index] ?? [])
                    const showRealHand =
                      !isDealing &&
                      handToShow.length > 0 &&
                      (hasDealtCards || (postDealHoleHands[index]?.length ?? 0) > 0)
                    const hideForDealFlight = isDealing || !showRealHand
                    return (
                      <motion.div
                        className={`absolute bottom-0 left-1/2 flex -translate-x-1/2 ${
                          hideForDealFlight ? 'pointer-events-none opacity-0' : ''
                        }`}
                        aria-hidden={hideForDealFlight}
                      >
                        {[0, 1].map((cardIndex) => {
                          const card = handToShow[cardIndex]
                          return (
                            <motion.div
                              key={cardIndex}
                              ref={(el) => registerHoleCardAnchor(index, cardIndex, el)}
                              className="transform origin-bottom scale-50"
                              style={{ marginLeft: cardIndex === 0 ? '0' : '-50px' }}
                            >
                              <NumericPlayingCard
                                digit={showRealHand && card ? card.digit : 0}
                                variant="cyan"
                                size="normal"
                                faceDown={
                                  !showRealHand ||
                                  displayGameState.phase !== 'showdown' ||
                                  player.hasFolded
                                }
                                backDesign="star"
                              />
                            </motion.div>
                          )
                        })}
                      </motion.div>
                    )
                  })()}

                  {/* Player status */}
                  {player.hasFolded && !hideFoldBanner && (
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-red-400 font-bold text-sm">FOLDED</div>
                  )}
                </div>
              </motion.div>
            )
          })}

          {/* Realistic Poker Table — same vertical lift as `getPlayerPosition` */}
          <div
            className="absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ top: `calc(50% + ${displayTableLiftPx}px)` }}
          >
            {/* Table shadow */}
            <div className="absolute inset-0 w-[842px] h-[637px] bg-black/40 rounded-full blur-lg transform translate-y-2"></div>
            
            {/* Table base/rail */}
            <div className="w-[810px] h-[605px] bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900 rounded-full border-8 border-amber-600 shadow-2xl relative">
                            {/* FELT SURFACE - Direct application to rail padding */}
              <div 
                className="absolute inset-2 rounded-full border-4 border-amber-500"
                style={{
                  background: `
                    repeating-linear-gradient(
                      45deg,
                      #2d5a3d 0px,
                      #2d5a3d 2px,
                      #1f4429 2px,
                      #1f4429 4px
                    ),
                    repeating-linear-gradient(
                      -45deg,
                      transparent 0px,
                      transparent 2px,
                      rgba(0, 0, 0, 0.15) 2px,
                      rgba(0, 0, 0, 0.15) 4px
                    ),
                    linear-gradient(135deg, #2d7a4a, #1e5a33, #2d7a4a)
                  `,
                  backgroundSize: '4px 4px, 4px 4px, 100% 100%'
                }}
              >
                {/* Table markings - betting lines */}
                <div className="absolute inset-8 border-2 border-white/20 rounded-full"></div>
                <div className="absolute inset-12 border border-white/10 rounded-full"></div>
              </div>
                


              {/* Cup holders centered on the middle rail stripe - one per player */}
              {displayGameState.players.map((_, index) => {
                const { ox: x, oy: y } = heroSeatCupOffsets(index, displayGameState.players.length)
                const actingHere = heroBettingHud.acting === index && heroBettingHud.open
                return (
                  <div 
                    key={`cupholder-${index}`}
                    className={
                      actingHere
                        ? 'absolute z-[125] bg-amber-800 rounded-full border-2 border-cyan-300 ring-2 ring-cyan-400/70 shadow-[0_0_16px_rgba(34,211,238,0.45)] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center'
                        : 'absolute z-[120] bg-amber-800 rounded-full border-2 border-amber-600 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center'
                    }
                    style={{ 
                      left: `${HERO_CUPHOLDER_ORIGIN.left + x}px`, 
                      top: `${HERO_CUPHOLDER_ORIGIN.top + y}px`,
                      width: '32px',
                      height: '32px'
                    }}
                  >
                  </div>
                )
              })}

              {/* Seat assets on felt — blinds rail-tight, stacks deeper inward, tangentially split */}
              {displayGameState.players.map((player, index) => {
                const total = displayGameState.players.length
                const { ox, oy } = heroSeatCupOffsets(index, total)
                const rimLeft = HERO_CUPHOLDER_ORIGIN.left + ox
                const rimTop = HERO_CUPHOLDER_ORIGIN.top + oy
                const { blindPx, chipPx } = heroFeltSeatAssetPositions(rimLeft, rimTop, index)
                const blindPills = heroSeatBlindMarkerPills(index, blindSeatMarkers, 'onFelt')
                const dimStack = player.hasFolded === true

                return (
                  <Fragment key={`felt-seat-${player.id}`}>
                    {blindPills.length > 0 ? (
                      <div
                        className="pointer-events-none absolute z-[118] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 drop-shadow-[0_4px_8px_rgba(0,0,0,0.55)]"
                        style={{ left: `${blindPx.leftPx}px`, top: `${blindPx.topPx}px` }}
                      >
                        {blindPills}
                      </div>
                    ) : null}
                    <div
                      className={`pointer-events-none absolute z-[118] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 ${
                        dimStack ? 'opacity-45 saturate-[0.65]' : 'opacity-96'
                      }`}
                      style={{ left: `${chipPx.leftPx}px`, top: `${chipPx.topPx}px` }}
                    >
                      <img
                        src={seatChipStackImg}
                        alt=""
                        width={96}
                        height={72}
                        draggable={false}
                        className="pointer-events-none h-[3.5rem] w-auto max-w-[5.75rem] shrink-0 select-none object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] sm:h-[4.1rem] sm:max-w-[6.5rem] md:h-[4.35rem] md:max-w-[7rem]"
                      />
                      <span className="max-w-[11rem] text-center font-mono text-[1.35rem] font-extrabold leading-tight tabular-nums tracking-tight text-amber-50 sm:max-w-[12rem] sm:text-[1.55rem] md:text-[1.7rem] [text-shadow:0_1px_3px_rgba(0,0,0,0.96),0_2px_10px_rgba(0,0,0,0.88)]">
                        {formatHeroStackMoney(player.bankroll)}
                      </span>
                    </div>
                  </Fragment>
                )
              })}

              {heroBettingHud.showCallBubble && heroBettingHud.callLabel != null && heroBettingHud.acting != null ? (
                (() => {
                  const n = displayGameState.players.length
                  const { leftPx, topPx } = heroWagerCallBubblePositionPx(heroBettingHud.acting, n)
                  return (
                    <div
                      className="pointer-events-none absolute z-[128] max-w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 px-2"
                      style={{ left: `${leftPx}px`, top: `${topPx}px` }}
                      aria-live="polite"
                    >
                      <div className="rounded-2xl border border-cyan-400/50 bg-black/78 px-5 py-3 text-center shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md md:px-6 md:py-3.5">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/90 md:text-xs">
                          Action
                        </div>
                        <div className="mt-1 text-balance text-base font-bold leading-snug text-cyan-50 sm:text-lg md:text-xl">
                          {heroBettingHud.callLabel}
                        </div>
                      </div>
                    </div>
                  )
                })()
              ) : null}
              
              {/* Pot display - positioned higher */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-36 text-center">
                <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 relative overflow-visible">
                  <div className="text-white text-lg">Pot: <span className="text-yellow-400 font-bold text-4xl">${payoutTick > 0 ? payoutTick : displayGameState.round.pot}</span></div>
                  {/* Chip flights from pot to winner */}
                  {showdownWinnerId && chipFlights.map(chip => (
                    <motion.div
                      key={chip.id}
                      className="absolute"
                      initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
                      animate={{
                        x: (fdW / 2) - (fdW / 2),
                        y: (fdH / 2 - 144) - (fdH / 2 - 144),
                        opacity: 1,
                      }}
                    >
                      {/* We animate via a separate layer positioned globally below */}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Community Cards - positioned inside table at center */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -translate-y-12">
                {/* Show community when state has cards — not only after a deal animation on this client. */}
                {(() => {
                  const cardsToShow =
                    displayGameState.round.communityCards.length > 0
                      ? displayGameState.round.communityCards
                      : sharedCommunityCards
                  const showCommunity =
                    !isDealingCommunity &&
                    cardsToShow.length > 0 &&
                    (hasDealtCommunityCards || sharedCommunityCards.length > 0)

                  return showCommunity ? (
                    cardsToShow.map((card, i) => {
                      // Use relative positioning within the table
                      const cardWidth = 64 // small card width (64px)
                      const cardSpacing = 8 // gap between cards
                      const totalWidth = (5 * cardWidth) + (4 * cardSpacing) // 5 cards total
                      // Move left so that the 3rd card (index 2) is centered - smaller offset
                      const startX = -(totalWidth / 2) - ((cardWidth + cardSpacing) * 0.75) // Start from center and go left by half total width plus smaller offset for 3rd card
                      
                      const cardX = startX + (i * (cardWidth + cardSpacing)) + (cardWidth / 2)
                      const cardY = 0 // Center vertically
                    
                      return (
                        <div
                          key={i}
                          className="absolute"
                          style={{
                            left: cardX - (64 * 1.5 / 2) + 42, // Offset by half the scaled card width + even larger right offset (1 pixel more)
                            top: cardY - (96 * 1.5 / 2) + 43, // Offset by half the scaled card height + smaller down offset (1 pixel more)
                            transform: 'scale(1.5)', // Scale to match animation
                            transformOrigin: '0 0' // Scale from top-left corner
                          }}
                        >
                          <NumericPlayingCard
                            digit={card.digit}
                            variant="cyan"
                            style="neon"
                            neonVariant="matrix"
                            size="small"
                          />
                        </div>
                      )
                    })
                  ) : null
                })()}
              </div>


            </div>
          </div>
          </motion.div>
        </div>

        {isEmbedded ? (
          <div
            className={
              embeddedHudOverlay
                ? 'relative z-40 w-full shrink-0 rounded-b-xl border-t border-yellow-700/35 bg-black/55 backdrop-blur-sm'
                : 'relative z-30 shrink-0 border-t border-yellow-700/35 bg-black/55 backdrop-blur-sm'
            }
          >
            <DisplayTableInfoBar
              gameState={displayGameState}
              layout={isEmbedded ? 'venueHero' : 'default'}
            />
          </div>
        ) : null}

      </div>

      {/* Showdown Overlay */}
      {displayGameState.phase === 'showdown' && (
        <div className={`${dockCls} inset-0 z-[60] flex items-center justify-center`}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
          <motion.div
            className="relative bg-black/90 border-2 border-yellow-500/60 rounded-2xl shadow-2xl max-w-4xl w-[90%] p-10 text-lg text-white"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {/* Winner marquee banner */}
            {showdownWinnerName && (
              <div className="relative overflow-hidden rounded-xl bg-yellow-500/10 border border-yellow-400/30 mb-5">
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: '-100%' }}
                  transition={{ duration: 6, ease: 'easeInOut' }}
                  className="py-3 whitespace-nowrap text-xl md:text-2xl"
                >
                  <span className="mx-6 text-xl text-yellow-300 font-extrabold tracking-wide md:text-2xl">
                    🏆 WINNER: {showdownWinnerName}
                  </span>
                  <span className="mx-6 text-xl text-yellow-300 font-extrabold tracking-wide md:text-2xl">
                    🏆 WINNER: {showdownWinnerName}
                  </span>
                </motion.div>
              </div>
            )}

            <div className="text-center mb-6">
              <div className="text-white/80 text-xl font-semibold md:text-2xl">Correct Answer</div>
              <motion.div
                key={String(displayGameState.round.question?.answer ?? '—')}
                initial={{ rotateX: -90, opacity: 0, transformPerspective: 800 }}
                animate={{ rotateX: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="inline-block px-4 py-1 rounded-lg bg-yellow-500/10 border border-yellow-400/40 shadow-[0_0_20px_rgba(255,215,0,0.4)]"
              >
                <span className="text-7xl font-extrabold text-yellow-400 tracking-wide md:text-8xl">
                  {displayGameState.round.question?.answer ?? '—'}
                </span>
              </motion.div>
            </div>

            {(() => {
              const correct = displayGameState.round.question?.answer
              const rows = displayGameState.players
                .map((p, seatIdx) => {
                  const sa = p.submittedAnswer
                  const has = typeof sa === 'number' && !p.hasFolded
                  const distance =
                    has && typeof correct === 'number' ? Math.abs(sa - correct) : Infinity
                  return { player: p, seat: seatIdx + 1, has, distance }
                })
                .sort((a, b) => a.distance - b.distance)
              const winnerId = rows.length && rows[0].distance !== Infinity ? rows[0].player.id : undefined

              return (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-lg md:text-xl">
                    <thead>
                      <tr className="text-white/80">
                        <th className="py-3 px-4">Seat</th>
                        <th className="py-3 px-4">Player</th>
                        <th className="py-3 px-4">Submitted</th>
                        <th className="py-3 px-4">Distance</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ player, seat, has, distance }, idx) => (
                        <motion.tr
                          key={player.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          className={player.id === winnerId ? 'bg-white/10' : ''}
                        >
                          <td className="py-3 px-4 tabular-nums text-white/80">{seat}</td>
                          <td className="py-3 px-4 font-bold text-yellow-300">{player.name}</td>
                          <td className="py-3 px-4">
                            {has ? (
                              <motion.span
                                initial={{ scale: 0.8, rotate: -5, opacity: 0 }}
                                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                                className="inline-block"
                              >
                                {player.submittedAnswer}
                              </motion.span>
                            ) : '—'}
                          </td>
                          <td className="py-3 px-4">{has && typeof correct === 'number' ? distance : '—'}</td>
                          <td className="py-3 px-4">
                            {player.hasFolded ? (
                              <span className="text-red-400 font-semibold">FOLDED</span>
                            ) : has ? (
                              player.id === winnerId ? (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: [0, 1.2, 1] }}
                                  transition={{ type: 'spring', stiffness: 260, damping: 12 }}
                                  className="text-yellow-400 font-extrabold"
                                >
                                  WINNER
                                </motion.span>
                              ) : (
                                <span className="text-white/70">Submitted</span>
                              )
                            ) : (
                              <span className="text-white/50">No Answer</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </motion.div>
        </div>
      )}

      {/* Chips flying layer (pot -> winner) */}
      {displayGameState.phase === 'showdown' && showdownWinnerId && chipFlights.length > 0 && (
        <div className={`${dockCls} inset-0 z-[55] pointer-events-none`}>
          {(() => {
            const chipScale = isEmbedded ? embeddedFeltScale : 1
            const potX = sw / 2
            const potY = sh / 2 + (-144 + displayTableLiftPx) * chipScale
            const idx = displayGameState.players.findIndex((p) => p.id === showdownWinnerId)
            const { dx, dy } = getPlayerSeatOffsetFromPlaneCenterPx(
              Math.max(0, idx),
              displayGameState.players.length
            )
            const seatX = sw / 2 + dx * chipScale
            const seatY = sh / 2 + dy * chipScale
            return chipFlights.map(chip => (
              <motion.div
                key={chip.id}
                className="absolute"
                initial={{ x: potX + chip.ox, y: potY + chip.oy, rotate: chip.rot, opacity: 0 }}
                animate={{ x: seatX, y: seatY, rotate: chip.rot * 3, opacity: [0, 1, 1, 0.8] }}
                transition={{ delay: chip.delay, duration: 1.25, ease: 'easeOut' }}
                style={{ left: 0, top: 0 }}
              >
                <div className="transform -translate-x-1/2 -translate-y-1/2">
                  <PokerChip size="sm" />
                </div>
              </motion.div>
            ))
          })()}
        </div>
      )}

      {/* Spotlight sweep across table during showdown */}
      {displayGameState.phase === 'showdown' && (
        <motion.div
          className={`${dockCls} inset-y-0 left-0 right-0 z-[52] pointer-events-none`}
          initial={{ x: '-60vw', opacity: 0.0 }}
          animate={{ x: '60vw', opacity: [0.0, 0.65, 0.0] }}
          transition={{ duration: 2.8, ease: 'easeInOut' }}
          style={{
            background: 'radial-gradient(40% 60% at 50% 50%, rgba(255,255,200,0.25), rgba(255,255,200,0.15) 45%, rgba(255,255,200,0.0) 70%)',
            mixBlendMode: 'screen'
          }}
        />
      )}

      {!isEmbedded ? (
        <div className="fixed bottom-0 left-0 right-0 z-30">
          <DisplayTableInfoBar gameState={displayGameState} />
        </div>
      ) : null}
    </div>
  )
}

export default DisplayTableLive
