import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DisplayLayoutPayload, DisplayVenueWallSnapshot } from '@qhe/net'
import {
  buildVenueWallTileRows,
  floorFeaturedTileIndex,
  SEATING_SPOTLIGHT_CYCLE_SEC,
  SHOWDOWN_SPOTLIGHT_CYCLE_SEC,
  shouldRotateLobbyTour,
  shouldRotateShowdownTour,
  showdownTableNums,
  venueWallHasLiveTiles,
} from './venueWallModel'

function venueSpotlightFromLayout(layout: DisplayLayoutPayload): number | null {
  if (layout.focusTable != null && Number.isFinite(layout.focusTable)) {
    return layout.focusTable
  }
  return null
}

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

export type VenueFeaturedWatch = {
  featuredTableNum: number | null
  tileRowsLength: number
  showRotatingTour: boolean
  seatingTourIndex: number
  seatingCycleProgress: number
  showShowdownTour: boolean
  showdownTourIndex: number
  showdownCycleProgress: number
}

export function useVenueWallFeaturedWatch(
  wall: DisplayVenueWallSnapshot | null,
  layout: DisplayLayoutPayload
): VenueFeaturedWatch {
  const tileRows = useMemo(() => buildVenueWallTileRows(wall), [wall])
  const hasLive = venueWallHasLiveTiles(wall)
  const fingerprint = tileRows.map((t) => `${t.tableNum}:${t.phase}`).join('|')
  const showRotatingTour = shouldRotateLobbyTour(tileRows, hasLive)
  const hostSpot = venueSpotlightFromLayout(layout)
  const showdownNums = useMemo(() => showdownTableNums(tileRows), [fingerprint])
  const showShowdownTour = shouldRotateShowdownTour(tileRows, hostSpot)

  const prefersReducedMotion = usePrefersReducedMotion()
  const [seatingTourIndex, setSeatingTourIndex] = useState(0)
  const [seatingCycleTick, setSeatingCycleTick] = useState(0)
  const seatingCycleStartRef = useRef(0)
  const [showdownTourIndex, setShowdownTourIndex] = useState(0)
  const [showdownCycleTick, setShowdownCycleTick] = useState(0)
  const showdownCycleStartRef = useRef(0)

  const floorIdx = useMemo(() => floorFeaturedTileIndex(tileRows), [fingerprint])

  useEffect(() => {
    setSeatingTourIndex((i) => Math.min(i, Math.max(0, tileRows.length - 1)))
  }, [tileRows.length])

  useEffect(() => {
    if (!showRotatingTour || prefersReducedMotion || tileRows.length <= 1) return undefined
    const id = window.setInterval(() => {
      setSeatingTourIndex((i) => (i + 1) % tileRows.length)
    }, SEATING_SPOTLIGHT_CYCLE_SEC * 1000)
    return () => window.clearInterval(id)
  }, [showRotatingTour, prefersReducedMotion, tileRows.length])

  useEffect(() => {
    setShowdownTourIndex((i) => Math.min(i, Math.max(0, showdownNums.length - 1)))
  }, [showdownNums.length])

  useEffect(() => {
    if (!showShowdownTour || prefersReducedMotion || showdownNums.length <= 1) return undefined
    const id = window.setInterval(() => {
      setShowdownTourIndex((i) => (i + 1) % showdownNums.length)
    }, SHOWDOWN_SPOTLIGHT_CYCLE_SEC * 1000)
    return () => window.clearInterval(id)
  }, [showShowdownTour, prefersReducedMotion, showdownNums.length])

  useLayoutEffect(() => {
    seatingCycleStartRef.current = Date.now()
  }, [seatingTourIndex])

  useLayoutEffect(() => {
    showdownCycleStartRef.current = Date.now()
  }, [showdownTourIndex])

  useEffect(() => {
    if (!showRotatingTour || prefersReducedMotion || tileRows.length <= 1) return undefined
    const id = window.setInterval(() => setSeatingCycleTick((n) => n + 1), 50)
    return () => window.clearInterval(id)
  }, [showRotatingTour, prefersReducedMotion, tileRows.length, seatingTourIndex])

  useEffect(() => {
    if (!showShowdownTour || prefersReducedMotion || showdownNums.length <= 1) return undefined
    const id = window.setInterval(() => setShowdownCycleTick((n) => n + 1), 50)
    return () => window.clearInterval(id)
  }, [showShowdownTour, prefersReducedMotion, showdownNums.length, showdownTourIndex])

  const seatingCycleProgress = useMemo(() => {
    if (prefersReducedMotion || tileRows.length <= 1) return 0
    const elapsed = Date.now() - seatingCycleStartRef.current
    return Math.min(1, elapsed / (SEATING_SPOTLIGHT_CYCLE_SEC * 1000))
  }, [seatingCycleTick, seatingTourIndex, prefersReducedMotion, tileRows.length])

  const showdownCycleProgress = useMemo(() => {
    if (prefersReducedMotion || showdownNums.length <= 1) return 0
    const elapsed = Date.now() - showdownCycleStartRef.current
    return Math.min(1, elapsed / (SHOWDOWN_SPOTLIGHT_CYCLE_SEC * 1000))
  }, [showdownCycleTick, showdownTourIndex, prefersReducedMotion, showdownNums.length])

  const featuredTableNum = (() => {
    if (tileRows.length === 0) return null
    // Pre-show lobby tour: advance the hero on a timer. Host `focusTable` must not pin the felt
    // while every table is still in lobby — that froze the hero on Table 1 with a misleading tour index.
    if (showRotatingTour) return tileRows[seatingTourIndex]?.tableNum ?? tileRows[0]!.tableNum
    if (showShowdownTour) {
      return showdownNums[showdownTourIndex] ?? showdownNums[0] ?? tileRows[0]!.tableNum
    }
    if (hostSpot != null) return hostSpot
    if (showdownNums.length > 0) return showdownNums[0]!
    return tileRows[floorIdx]?.tableNum ?? tileRows[0]!.tableNum
  })()

  return {
    featuredTableNum,
    tileRowsLength: tileRows.length,
    showRotatingTour,
    seatingTourIndex,
    seatingCycleProgress,
    showShowdownTour,
    showdownTourIndex,
    showdownCycleProgress,
  }
}
