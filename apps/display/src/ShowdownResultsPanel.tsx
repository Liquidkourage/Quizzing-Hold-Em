import { motion } from 'framer-motion'
import { formatTriviaNumber } from '@qhe/core'
import { PokerChip } from '@qhe/ui'
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

function DigitChip({
  digit,
  active,
  size = 'md',
}: {
  digit: number
  active: boolean
  size?: 'sm' | 'md'
}) {
  const dim =
    size === 'sm'
      ? 'h-6 min-w-[1.125rem] px-0.5 text-[0.65rem]'
      : 'h-7 min-w-[1.35rem] px-1 text-xs'
  return (
    <span
      className={`inline-flex items-center justify-center rounded border font-mono font-black tabular-nums ${dim} ${
        active
          ? 'border-emerald-400/70 bg-emerald-950/90 text-emerald-100 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
          : 'border-white/12 bg-black/35 text-white/30'
      }`}
    >
      {digit}
    </span>
  )
}

function HoleChipPair({
  holes,
  folded,
  size = 'md',
}: {
  holes: readonly [number, number] | null
  folded: boolean
  size?: 'sm' | 'md'
}) {
  if (folded || holes == null) {
    return (
      <span className="text-[0.6rem] font-bold uppercase tracking-wider text-white/30">Mucked</span>
    )
  }
  return (
    <motion.div
      className="flex shrink-0 items-center gap-0.5"
      aria-label={`Hole cards ${formatHoleDigits(holes)}`}
    >
      <DigitChip digit={holes[0]} active size={size} />
      <DigitChip digit={holes[1]} active size={size} />
    </motion.div>
  )
}

function BoardPickChips({
  board,
  chosenIndices,
  size = 'md',
}: {
  board: readonly number[] | null
  chosenIndices: number[]
  size?: 'sm' | 'md'
}) {
  if (board == null || board.length === 0) {
    return <span className="text-xs text-white/35">—</span>
  }
  if (chosenIndices.length === 0) {
    return <span className="text-xs text-white/35">—</span>
  }
  const chosen = new Set(chosenIndices)
  const slots = board.slice(0, 5)
  return (
    <motion.div className="flex shrink-0 flex-wrap items-center gap-0.5">
      {slots.map((digit, i) => (
        <DigitChip key={i} digit={digit} active={chosen.has(i)} size={size} />
      ))}
    </motion.div>
  )
}

function SharedCommunityBoard({
  board,
  className = '',
}: {
  board: readonly number[] | null
  className?: string
}) {
  if (board == null || board.length === 0) return null
  return (
    <motion.div
      className={`flex flex-wrap items-center justify-center gap-3 rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 sm:px-4 ${className}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-amber-200/75 sm:text-xs">
        The board
      </p>
      <motion.div className="flex items-center gap-1">
        {board.slice(0, 5).map((digit, i) => (
          <DigitChip key={i} digit={digit} active size="md" />
        ))}
      </motion.div>
      <p className="hidden text-[0.6rem] text-white/40 sm:block">
        Highlighted picks in each row
      </p>
    </motion.div>
  )
}

function AnswerMedallion({ correctAnswer }: { correctAnswer: number | undefined }) {
  return (
    <motion.div
      className="flex shrink-0 flex-col items-center"
      key={String(correctAnswer ?? 'na')}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <motion.div
        className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-amber-400/70 sm:h-[4.5rem] sm:w-[4.5rem]"
        style={{
          ...SHOWDOWN_RAIL_STYLE,
          background:
            'radial-gradient(circle at 35% 28%, #6b4a28 0%, #3d2810 45%, #1f1208 100%)',
        }}
      >
        <motion.div
          className="flex h-[82%] w-[82%] items-center justify-center rounded-full border border-amber-300/35"
          style={SHOWDOWN_FELT_STYLE}
        >
          <span className="font-mono text-2xl font-black tabular-nums text-amber-100 sm:text-3xl">
            {formatTriviaNumber(correctAnswer)}
          </span>
        </motion.div>
      </motion.div>
      <p className="mt-1.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-amber-200/80 sm:text-xs">
        Correct
      </p>
    </motion.div>
  )
}

function PlayerShowdownRow({
  row,
  correctAnswer,
  isWinner,
  index,
  compact,
}: {
  row: ShowdownResultRow
  correctAnswer: number | undefined
  isWinner: boolean
  index: number
  compact: boolean
}) {
  const hasGuess =
    !row.hasFolded && row.submitted != null && typeof correctAnswer === 'number'
  const distance =
    hasGuess && typeof correctAnswer === 'number'
      ? Math.abs(row.submitted! - correctAnswer)
      : null

  const chipSize = compact ? 'sm' : 'md'

  return (
    <motion.div
      role="row"
      aria-label={`${row.name}, seat ${row.seat}`}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`grid min-w-0 items-center gap-x-2 gap-y-1 rounded-lg border px-2 py-2 sm:gap-x-3 sm:px-3 sm:py-2.5 ${
        compact
          ? 'grid-cols-[auto_minmax(0,1fr)_auto_auto]'
          : 'grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]'
      } ${
        isWinner
          ? 'border-amber-400/60 bg-amber-950/40 shadow-[inset_3px_0_0_rgba(251,191,36,0.85)]'
          : row.hasFolded
            ? 'border-white/8 bg-black/25 opacity-60'
            : 'border-white/12 bg-black/35'
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-black tabular-nums sm:h-8 sm:w-8 ${
          isWinner
            ? 'border-amber-300/70 bg-amber-950 text-amber-100'
            : 'border-amber-800/45 bg-slate-950 text-amber-200/85'
        }`}
      >
        {row.seat}
      </span>

      <p className="min-w-0 truncate text-sm font-bold text-white sm:text-base">{row.name}</p>

      <motion.div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[0.55rem] font-bold uppercase tracking-wider text-white/40">
          Cards used
        </span>
        <motion.div className="flex flex-wrap items-center gap-1">
          <HoleChipPair holes={row.holes} folded={row.hasFolded} size={chipSize} />
          {!row.hasFolded && row.answerCommunityIndices.length > 0 ? (
            <span className="mx-0.5 text-white/25" aria-hidden>
              ·
            </span>
          ) : null}
          <BoardPickChips
            board={row.communityBoard}
            chosenIndices={row.answerCommunityIndices}
            size={chipSize}
          />
        </motion.div>
      </motion.div>

      <motion.div className="text-right">
        <p className="text-[0.55rem] font-bold uppercase tracking-wider text-white/40">Guess</p>
        <p className="font-mono text-sm font-black tabular-nums text-amber-100 sm:text-base">
          {hasGuess ? formatTriviaNumber(row.submitted) : '—'}
        </p>
      </motion.div>

      {!compact ? (
        <motion.div className="text-right">
          <p className="text-[0.55rem] font-bold uppercase tracking-wider text-white/40">Off by</p>
          <p
            className={`font-mono text-sm font-black tabular-nums sm:text-base ${
              isWinner ? 'text-emerald-300' : 'text-white/70'
            }`}
          >
            {!row.hasFolded && distance != null ? formatTriviaNumber(distance) : '—'}
          </p>
        </motion.div>
      ) : null}

      <motion.div className="flex justify-end">
        {isWinner ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/20 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wider text-amber-100">
            <PokerChip size="sm" />
            Win
          </span>
        ) : row.hasFolded ? (
          <span className="text-[0.6rem] font-bold uppercase text-red-400/80">Fold</span>
        ) : null}
      </motion.div>
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
  const sharedBoard = activeRows[0]?.communityBoard ?? null

  if (compact) {
    return (
      <motion.div
        className={`space-y-2 ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="flex items-center justify-between gap-2 rounded-md border border-amber-500/35 px-2 py-1.5"
          style={SHOWDOWN_FELT_STYLE}
        >
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-amber-200/80">Answer</p>
          <p className="font-mono text-lg font-black tabular-nums text-amber-100">
            {formatTriviaNumber(correctAnswer)}
          </p>
        </motion.div>
        <motion.div className="max-h-52 space-y-1 overflow-y-auto overscroll-y-contain" role="group">
          {activeRows.map((row, idx) => (
            <PlayerShowdownRow
              key={`${row.seat}:${row.name}`}
              row={row}
              correctAnswer={correctAnswer}
              isWinner={winnerKey === `${row.seat}:${row.name}`}
              index={idx}
              compact
            />
          ))}
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div className="absolute inset-0 opacity-95" style={SHOWDOWN_FELT_STYLE} />
      <motion.div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,220,120,0.1),transparent_50%)]" />

      <motion.div className="relative z-10 flex flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:p-7">
        {/* Landscape header */}
        <motion.div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <motion.div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200/75">Showdown</p>
            <h2 className="text-xl font-black uppercase tracking-wide text-white sm:text-2xl">
              Trivia reveal
            </h2>
          </motion.div>
          <motion.div className="flex flex-wrap items-center gap-4 sm:justify-end">
            <AnswerMedallion correctAnswer={correctAnswer} />
          </motion.div>
        </motion.div>

        {winnerName ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 rounded-lg border border-amber-400/45 bg-black/45 px-3 py-2"
          >
            <PokerChip size="md" />
            <p className="text-center text-sm font-black uppercase tracking-wide text-amber-100 sm:text-base">
              Pot winner · {winnerName}
            </p>
            <PokerChip size="md" />
          </motion.div>
        ) : null}

        <SharedCommunityBoard board={sharedBoard} />

        {/* Column labels — desktop */}
        <motion.div
          className="hidden grid-cols-[auto_minmax(5rem,1fr)_minmax(0,1fr)_auto_auto_auto] gap-x-3 px-3 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-white/45 sm:grid"
          aria-hidden
        >
          <span>Seat</span>
          <span>Player</span>
          <span>Cards used</span>
          <span className="text-right">Guess</span>
          <span className="text-right">Off by</span>
          <span />
        </motion.div>

        <motion.div className="flex flex-col gap-2" role="group" aria-label="Showdown results by seat">
          {activeRows.map((row, idx) => (
            <PlayerShowdownRow
              key={`${row.seat}:${row.name}`}
              row={row}
              correctAnswer={correctAnswer}
              isWinner={winnerKey === `${row.seat}:${row.name}`}
              index={idx}
              compact={false}
            />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
