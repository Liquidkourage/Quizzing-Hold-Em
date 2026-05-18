import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { formatTriviaNumber } from '@qhe/core'
import type { DisplayVenueTileSnapshot } from '@qhe/net'
import ShowdownTableCard from './ShowdownTableCard'
import {
  showdownCorrectAnswerFromTile,
  showdownRowsFromTile,
} from './showdownDisplay'
import { SHOWDOWN_FELT_STYLE } from './showdownTheme'

function showdownGridClass(count: number): string {
  if (count <= 1) return 'grid grid-cols-1 gap-3 sm:gap-4'
  if (count === 2) return 'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4'
  if (count <= 4) return 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4'
  return 'grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-3'
}

type VenueMultiTableShowdownProps = {
  tiles: DisplayVenueTileSnapshot[]
  className?: string
}

/** Center-band wall: every table in showdown at once (replaces single-table hero + rotation tour). */
export default function VenueMultiTableShowdown({ tiles, className = '' }: VenueMultiTableShowdownProps) {
  const showdownTiles = useMemo(
    () =>
      tiles
        .filter((t) => t.phase === 'showdown')
        .filter((t) => showdownRowsFromTile(t).length > 0)
        .sort((a, b) => a.tableNum - b.tableNum),
    [tiles]
  )

  if (showdownTiles.length === 0) return null

  const firstAnswer = showdownCorrectAnswerFromTile(showdownTiles[0]!)
  const sharedAnswer = showdownTiles.every(
    (t) => showdownCorrectAnswerFromTile(t) === firstAnswer
  )
    ? firstAnswer
    : undefined

  return (
    <motion.section
      className={`relative w-full min-w-0 overflow-hidden rounded-2xl border-2 border-yellow-400/85 bg-black/60 shadow-xl backdrop-blur-md ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label={`Showdown results for ${showdownTiles.length} tables`}
    >
      <header
        className="border-b border-yellow-700/45 px-4 py-3 sm:px-5 sm:py-4"
        style={SHOWDOWN_FELT_STYLE}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200/75">Venue showdown</p>
            <h2 className="text-xl font-black uppercase tracking-wide text-white sm:text-2xl">
              {showdownTiles.length === 1
                ? `Table ${showdownTiles[0]!.tableNum}`
                : `${showdownTiles.length} tables`}
            </h2>
          </div>
          {sharedAnswer != null ? (
            <div className="text-left sm:text-right">
              <p className="text-[0.6rem] font-bold uppercase tracking-wider text-white/45 sm:text-xs">
                Correct answer (all tables)
              </p>
              <p className="font-mono text-2xl font-black tabular-nums text-amber-100 sm:text-3xl">
                {formatTriviaNumber(sharedAnswer)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-white/55">Per-table answers below</p>
          )}
        </div>
      </header>

      <div
        className={`max-h-[min(72dvh,780px)] overflow-y-auto overscroll-y-contain p-3 sm:p-4 ${showdownGridClass(showdownTiles.length)}`}
      >
        {showdownTiles.map((tile) => (
          <ShowdownTableCard
            key={tile.tableNum}
            tableNum={tile.tableNum}
            correctAnswer={showdownCorrectAnswerFromTile(tile)}
            rows={showdownRowsFromTile(tile)}
            className="max-h-[min(480px,52dvh)]"
          />
        ))}
      </div>
    </motion.section>
  )
}
