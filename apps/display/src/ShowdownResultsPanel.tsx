import { motion } from 'framer-motion'
import { formatTriviaNumber } from '@qhe/core'
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

function ChosenCommunityCards({
  board,
  chosenIndices,
  compact,
}: {
  board: readonly number[] | null
  chosenIndices: number[]
  compact: boolean
}) {
  if (board == null || board.length === 0 || chosenIndices.length === 0) return null

  const chosen = new Set(chosenIndices)
  const slots = board.slice(0, 5)

  if (compact) {
    return (
      <div className="w-full">
        <p className="mb-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-white/45">Board picks</p>
        <motion.div
          className="flex items-center justify-center gap-0.5"
          aria-label={`Community cards used: ${chosenIndices.map((i) => slots[i]).join(', ')}`}
        >
          {slots.map((digit, i) => (
            <span
              key={i}
              className={`inline-flex h-6 w-4 items-center justify-center rounded border font-mono text-[0.65rem] font-black tabular-nums ${
                chosen.has(i)
                  ? 'border-emerald-400/70 bg-emerald-950/80 text-emerald-100 shadow-[0_0_8px_rgba(52,211,153,0.35)]'
                  : 'border-white/10 bg-black/30 text-white/25'
              }`}
            >
              {digit}
            </span>
          ))}
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div className="w-full">
      <p className="mb-1 text-center text-[0.55rem] font-bold uppercase tracking-[0.14em] text-white/45">
        Board picks
      </p>
      <motion.div
        className="flex items-end justify-center -space-x-4"
        aria-label={`Community cards used at positions ${[...chosen].sort((a, b) => a - b).map((i) => i + 1).join(', ')}`}
      >
        {slots.map((digit, i) => (
          <motion.div
            key={i}
            className={`relative origin-bottom ${chosen.has(i) ? 'z-10' : 'z-0 opacity-40'}`}
            style={{ transform: chosen.has(i) ? 'scale(0.62)' : 'scale(0.52)' }}
          >
            <NumericPlayingCard
              digit={digit}
              size="small"
              variant="cyan"
              style="neon"
              neonVariant="matrix"
              animated={false}
            />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
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
      <span className="text-[0.6rem] font-bold uppercase tracking-wider text-white/25 sm:text-[0.65rem]">
        Mucked
      </span>
    )
  }

  if (compact) {
    return (
      <motion.div
        className="flex items-center justify-center -space-x-1.5"
        aria-label={`Hole cards ${formatHoleDigits(holes)}`}
      >
        {holes.map((d, i) => (
          <span
            key={i}
            className="inline-flex h-7 w-5 items-center justify-center rounded border border-cyan-300/50 bg-gradient-to-b from-slate-800 to-slate-950 font-mono text-xs font-black tabular-nums text-cyan-100 shadow-[0_2px_6px_rgba(0,0,0,0.5)] first:rotate-[-7deg] last:rotate-[7deg]"
          >
            {d}
          </span>
        ))}
      </motion.div>
    )
  }

  return (
    <motion.div
      className="flex items-end justify-center -space-x-7"
      aria-label={`Hole cards ${formatHoleDigits(holes)}`}
    >
      <motion.div className="origin-bottom -rotate-6 scale-[0.68] sm:scale-[0.74]">
        <NumericPlayingCard
          digit={holes[0]}
          size="small"
          variant="cyan"
          style="neon"
          neonVariant="matrix"
          animated={false}
        />
      </motion.div>
      <motion.div className="origin-bottom rotate-6 scale-[0.68] sm:scale-[0.74]">
        <NumericPlayingCard
          digit={holes[1]}
          size="small"
          variant="cyan"
          style="neon"
          neonVariant="matrix"
          animated={false}
        />
      </motion.div>
    </motion.div>
  )
}

function PlayerShowdownPod({
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
      <motion.div
        role="group"
        aria-label={`${row.name}, seat ${row.seat}`}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.04 }}
        className={`flex flex-col items-center gap-1 rounded-lg border px-1.5 py-1.5 text-center ${
          isWinner
            ? 'border-amber-400/55 bg-amber-950/45 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
            : row.hasFolded
              ? 'border-white/8 bg-black/25 opacity-60'
              : 'border-white/12 bg-black/35'
        }`}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-600/40 bg-amber-950/80 font-mono text-[0.6rem] font-bold text-amber-200">
          {row.seat}
        </span>
        <span className="max-w-full truncate text-[0.65rem] font-bold leading-tight text-white/90">
          {row.name}
        </span>
        <HoleCards holes={row.holes} folded={row.hasFolded} compact />
        <ChosenCommunityCards
          board={row.communityBoard}
          chosenIndices={row.answerCommunityIndices}
          compact
        />
        <span className="font-mono text-[0.7rem] font-black tabular-nums text-amber-200">
          {hasGuess ? formatTriviaNumber(row.submitted) : '—'}
        </span>
      </motion.div>
    )
  }

  return (
    <motion.div
      role="group"
      aria-label={`${row.name}, seat ${row.seat}`}
      layout
      initial={{ opacity: 0, scale: 0.88, y: 12 }}
      animate={{ opacity: 1, scale: isWinner ? 1.04 : 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 280, damping: 22 }}
      className={`relative flex w-[8.25rem] flex-col items-center gap-2 rounded-2xl border px-2.5 pb-3 pt-3 sm:w-[9.5rem] sm:gap-2.5 sm:px-3 sm:pb-3.5 sm:pt-3.5 ${
        isWinner
          ? 'z-10 border-amber-400/75 bg-gradient-to-b from-amber-950/70 via-amber-900/35 to-black/50 shadow-[0_0_32px_rgba(251,191,36,0.28),inset_0_1px_0_rgba(255,236,180,0.14)]'
          : row.hasFolded
            ? 'border-white/10 bg-black/35 opacity-55'
            : 'border-white/15 bg-black/45'
      }`}
    >
      {isWinner ? (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-2xl ring-2 ring-amber-300/50"
          layoutId="showdown-winner-ring"
        />
      ) : null}

      <motion.div
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-mono text-base font-black tabular-nums sm:h-11 sm:w-11 sm:text-lg ${
          isWinner
            ? 'border-amber-300/80 bg-amber-950 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.4)]'
            : 'border-amber-800/50 bg-slate-950/90 text-amber-200/90'
        }`}
      >
        {row.seat}
      </motion.div>

      <p className="max-w-full truncate text-center text-sm font-bold leading-tight text-white sm:text-base">
        {row.name}
      </p>

      <HoleCards holes={row.holes} folded={row.hasFolded} compact={false} />

      <ChosenCommunityCards
        board={row.communityBoard}
        chosenIndices={row.answerCommunityIndices}
        compact={false}
      />

      <motion.div
        className="flex min-h-[2.75rem] w-full flex-col items-center justify-center rounded-lg border border-amber-500/25 px-2 py-1.5"
        style={SHOWDOWN_FELT_STYLE}
      >
        <p className="text-[0.55rem] font-bold uppercase tracking-[0.14em] text-amber-200/70">Guess</p>
        <p className="font-mono text-xl font-black tabular-nums text-amber-100 sm:text-2xl">
          {hasGuess ? formatTriviaNumber(row.submitted) : '—'}
        </p>
      </motion.div>

      {!row.hasFolded && distance != null ? (
        <p
          className={`text-center font-mono text-sm font-black tabular-nums sm:text-base ${
            isWinner ? 'text-emerald-300' : 'text-white/65'
          }`}
        >
          <span className="text-[0.55rem] font-bold uppercase tracking-wider text-white/40">Off by </span>
          {formatTriviaNumber(distance)}
        </p>
      ) : (
        <p className="text-center text-xs font-semibold text-white/35">
          {row.hasFolded ? 'Folded' : 'No guess'}
        </p>
      )}

      {isWinner ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/25 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wider text-amber-100">
          <PokerChip size="sm" />
          Winner
        </span>
      ) : null}
    </motion.div>
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
            {formatTriviaNumber(correctAnswer)}
          </p>
        </div>
        <div
          className="grid max-h-52 grid-cols-2 gap-1.5 overflow-y-auto overscroll-y-contain sm:grid-cols-3"
          role="group"
          aria-label="Showdown results by seat"
        >
          {activeRows.map((row, idx) => (
            <PlayerShowdownPod
              key={`${row.seat}:${row.name}`}
              row={row}
              correctAnswer={correctAnswer}
              isWinner={winnerKey === `${row.seat}:${row.name}`}
              compact
              index={idx}
            />
          ))}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="absolute inset-0 opacity-95" style={SHOWDOWN_FELT_STYLE} />
      <motion.div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,220,120,0.12),transparent_55%)]" />

      <div className="relative z-10 p-5 sm:p-7 md:p-8">
        <div className="mb-5 flex flex-col items-center gap-2 text-center sm:mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200/75 sm:text-sm">
            Showdown
          </p>
          <h2 className="text-2xl font-black uppercase tracking-[0.06em] text-white drop-shadow-md sm:text-3xl">
            Trivia reveal
          </h2>
        </div>

        <motion.div
          className="mx-auto mb-6 flex max-w-md flex-col items-center sm:mb-8"
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
                  {formatTriviaNumber(correctAnswer)}
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

        {winnerName ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-5 flex items-center justify-center gap-3 rounded-xl border border-amber-400/50 bg-black/45 px-4 py-3 backdrop-blur-sm sm:mb-7"
          >
            <PokerChip size="md" />
            <p className="text-center text-lg font-black uppercase tracking-wide text-amber-100 sm:text-xl">
              Pot winner · {winnerName}
            </p>
            <PokerChip size="md" />
          </motion.div>
        ) : null}

        <motion.div
          className="flex flex-wrap items-end justify-center gap-3 sm:gap-4"
          role="group"
          aria-label="Showdown results by seat"
        >
          {activeRows.map((row, idx) => (
            <PlayerShowdownPod
              key={`${row.seat}:${row.name}`}
              row={row}
              correctAnswer={correctAnswer}
              isWinner={winnerKey === `${row.seat}:${row.name}`}
              compact={false}
              index={idx}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  )
}
