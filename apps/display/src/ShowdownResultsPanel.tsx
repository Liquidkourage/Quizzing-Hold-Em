import { motion } from 'framer-motion'
import { NumericPlayingCard, PokerChip } from '@qhe/ui'
import {
  formatHoleDigits,
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'
import { SHOWDOWN_FELT_STYLE, SHOWDOWN_RAIL_STYLE } from './showdownTheme'

type ShowdownResultsPanelProps = {
  correctAnswer: number | undefined
  rows: ShowdownResultRow[]
  winnerName?: string
  compact?: boolean
  className?: string
}

function HoleCards({
  holes,
  folded,
  compact,
}: {
  holes: readonly [number, number] | null
  folded: boolean
  compact: boolean
}) {
  if (folded || holes == null) {
    return (
      <span className="text-[0.65rem] font-bold uppercase tracking-wider text-white/25 sm:text-xs">
        Mucked
      </span>
    )
  }

  if (compact) {
    return (
      <motion.div className="flex items-center -space-x-1.5" aria-label={`Hole cards ${formatHoleDigits(holes)}`}>
        {holes.map((d, i) => (
          <span
            key={i}
            className="inline-flex h-8 w-6 items-center justify-center rounded border border-cyan-300/50 bg-gradient-to-b from-slate-800 to-slate-950 font-mono text-sm font-black tabular-nums text-cyan-100 shadow-[0_2px_6px_rgba(0,0,0,0.5)] first:rotate-[-6deg] last:rotate-[6deg]"
          >
            {d}
          </span>
        ))}
      </motion.div>
    )
  }

  return (
    <motion.div
      className="flex items-end justify-center -space-x-8"
      aria-label={`Hole cards ${formatHoleDigits(holes)}`}
    >
      <div className="origin-bottom -rotate-6 scale-[0.72] sm:scale-[0.78]">
        <NumericPlayingCard
          digit={holes[0]}
          size="small"
          variant="cyan"
          style="neon"
          neonVariant="matrix"
          animated={false}
        />
      </div>
      <div className="origin-bottom rotate-6 scale-[0.72] sm:scale-[0.78]">
        <NumericPlayingCard
          digit={holes[1]}
          size="small"
          variant="cyan"
          style="neon"
          neonVariant="matrix"
          animated={false}
        />
      </div>
    </motion.div>
  )
}

function PlayerShowdownRow({
  row,
  correctAnswer,
  isWinner,
  compact,
  index,
}: {
  row: ShowdownResultRow
  correctAnswer: number | undefined
  isWinner: boolean
  compact: boolean
  index: number
}) {
  const hasGuess =
    !row.hasFolded && row.submitted != null && typeof correctAnswer === 'number'
  const distance =
    hasGuess && typeof correctAnswer === 'number'
      ? Math.abs(row.submitted! - correctAnswer)
      : null

  if (compact) {
    return (
      <motion.li
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${
          isWinner
            ? 'border-amber-400/55 bg-amber-950/40 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
            : row.hasFolded
              ? 'border-white/8 bg-black/25 opacity-60'
              : 'border-white/12 bg-black/35'
        }`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-600/40 bg-amber-950/80 font-mono text-[0.65rem] font-bold text-amber-200">
          {row.seat}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-white/90">{row.name}</span>
        <HoleCards holes={row.holes} folded={row.hasFolded} compact />
        <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-amber-200">
          {hasGuess ? row.submitted : '—'}
        </span>
      </motion.li>
    )
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 280, damping: 24 }}
      className={`relative grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 rounded-xl border px-3 py-3 sm:gap-4 sm:px-4 sm:py-3.5 ${
        isWinner
          ? 'border-amber-400/70 bg-gradient-to-r from-amber-950/55 via-amber-900/25 to-transparent shadow-[0_0_28px_rgba(251,191,36,0.22),inset_0_1px_0_rgba(255,236,180,0.12)]'
          : row.hasFolded
            ? 'border-white/10 bg-black/30 opacity-55'
            : 'border-white/15 bg-black/40'
      }`}
    >
      {isWinner ? (
        <motion.div
          className="pointer-events-none absolute -left-px top-2 bottom-2 w-1 rounded-full bg-gradient-to-b from-amber-200 via-amber-500 to-amber-800"
          layoutId="showdown-winner-rail"
        />
      ) : null}

      <motion.div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-mono text-lg font-black tabular-nums ${
          isWinner
            ? 'border-amber-300/80 bg-amber-950 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.35)]'
            : 'border-amber-800/50 bg-slate-950/90 text-amber-200/90'
        }`}
      >
        {row.seat}
      </motion.div>

      <div className="min-w-0">
        <p className="truncate text-lg font-bold tracking-tight text-white sm:text-xl">{row.name}</p>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
          {row.hasFolded ? 'Folded' : isWinner ? 'Closest guess · pot winner' : hasGuess ? 'In the hand' : 'No submission'}
        </p>
      </div>

      <div className="flex justify-center px-1">
        <HoleCards holes={row.holes} folded={row.hasFolded} compact={false} />
      </div>

      <div className="text-right">
        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-white/45">Guess</p>
        <p className="font-mono text-2xl font-black tabular-nums text-amber-100 sm:text-3xl">
          {hasGuess ? row.submitted : '—'}
        </p>
      </div>

      <motion.div className="min-w-[4.5rem] text-right">
        {!row.hasFolded && distance != null ? (
          <>
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-white/45">Off by</p>
            <p
              className={`font-mono text-xl font-black tabular-nums sm:text-2xl ${
                isWinner ? 'text-emerald-300' : 'text-white/75'
              }`}
            >
              {distance}
            </p>
          </>
        ) : (
          <span className="text-sm font-semibold text-white/35">—</span>
        )}
        {isWinner ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/20 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wider text-amber-100">
            <PokerChip size="sm" />
            Winner
          </span>
        ) : null}
      </motion.div>
    </motion.li>
  )
}

export default function ShowdownResultsPanel({
  correctAnswer,
  rows,
  winnerName,
  compact = false,
  className = '',
}: ShowdownResultsPanelProps) {
  const { rows: sorted, winnerKey } = sortShowdownRowsByDistance(rows, correctAnswer)
  const activeRows = sorted.filter((r) => r.name.trim() !== '')

  if (compact) {
    return (
      <motion.div
        className={`space-y-2 ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div
          className="rounded-md border border-amber-500/35 px-2 py-1.5 text-center"
          style={SHOWDOWN_FELT_STYLE}
        >
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-amber-200/80">Answer</p>
          <p className="font-mono text-xl font-black tabular-nums text-amber-100">
            {correctAnswer ?? '—'}
          </p>
        </div>
        <ul className="max-h-48 space-y-1 overflow-y-auto overscroll-y-contain">
          {activeRows.map((row, idx) => (
            <PlayerShowdownRow
              key={`${row.seat}:${row.name}`}
              row={row}
              correctAnswer={correctAnswer}
              isWinner={winnerKey === `${row.seat}:${row.name}`}
              compact
              index={idx}
            />
          ))}
        </ul>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Felt surface */}
      <div className="absolute inset-0 opacity-95" style={SHOWDOWN_FELT_STYLE} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,220,120,0.12),transparent_55%)]" />

      <div className="relative z-10 p-5 sm:p-7 md:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-2 text-center sm:mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200/75 sm:text-sm">
            Showdown
          </p>
          <h2 className="text-2xl font-black uppercase tracking-[0.06em] text-white drop-shadow-md sm:text-3xl">
            Trivia reveal
          </h2>
        </div>

        {/* Answer medallion */}
        <motion.div
          className="mx-auto mb-8 flex max-w-md flex-col items-center"
          key={String(correctAnswer ?? 'na')}
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <div className="relative">
            <div
              className="absolute -inset-3 rounded-full opacity-60 blur-xl"
              style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.45), transparent 70%)' }}
            />
            <div
              className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-amber-400/70 sm:h-32 sm:w-32"
              style={{
                ...SHOWDOWN_RAIL_STYLE,
                background:
                  'radial-gradient(circle at 35% 28%, #6b4a28 0%, #3d2810 45%, #1f1208 100%)',
              }}
            >
              <div
                className="flex h-[82%] w-[82%] items-center justify-center rounded-full border-2 border-amber-300/40 shadow-inner"
                style={SHOWDOWN_FELT_STYLE}
              >
                <span className="font-mono text-5xl font-black tabular-nums text-amber-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] sm:text-6xl">
                  {correctAnswer ?? '—'}
                </span>
              </div>
            </div>
            <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 gap-1">
              <PokerChip size="sm" />
              <PokerChip size="sm" />
              <PokerChip size="sm" />
            </div>
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-amber-100/90">
            Correct answer
          </p>
        </motion.div>

        {/* Winner callout */}
        {winnerName ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-6 flex items-center justify-center gap-3 rounded-xl border border-amber-400/50 bg-black/45 px-4 py-3 backdrop-blur-sm sm:mb-8"
          >
            <PokerChip size="md" />
            <p className="text-center text-lg font-black uppercase tracking-wide text-amber-100 sm:text-xl">
              Pot winner · {winnerName}
            </p>
            <PokerChip size="md" />
          </motion.div>
        ) : null}

        {/* Player rail */}
        <ul className="space-y-2.5 sm:space-y-3">
          {activeRows.map((row, idx) => (
            <PlayerShowdownRow
              key={`${row.seat}:${row.name}`}
              row={row}
              correctAnswer={correctAnswer}
              isWinner={winnerKey === `${row.seat}:${row.name}`}
              compact={false}
              index={idx}
            />
          ))}
        </ul>
      </div>
    </motion.div>
  )
}
