import { motion } from 'framer-motion'
import { formatTriviaNumber } from '@qhe/core'
import { PokerChip } from '@qhe/ui'
import {
  formatHoleDigits,
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'
import { SHOWDOWN_FELT_STYLE } from './showdownTheme'

type ShowdownTableCardProps = {
  tableNum: number
  correctAnswer: number | undefined
  rows: ShowdownResultRow[]
  className?: string
}

function MiniRow({
  row,
  correctAnswer,
  isWinner,
}: {
  row: ShowdownResultRow
  correctAnswer: number | undefined
  isWinner: boolean
}) {
  const hasGuess =
    !row.hasFolded && row.submitted != null && typeof correctAnswer === 'number'
  const distance =
    hasGuess && typeof correctAnswer === 'number'
      ? Math.abs(row.submitted! - correctAnswer)
      : null

  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 ${
        isWinner
          ? 'border-amber-400/55 bg-amber-950/45'
          : row.hasFolded
            ? 'border-white/6 bg-black/20 opacity-55'
            : 'border-white/10 bg-black/30'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[0.65rem] font-black tabular-nums ${
          isWinner ? 'bg-amber-500/25 text-amber-100' : 'bg-black/40 text-white/70'
        }`}
      >
        {row.seat}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-white sm:text-sm">{row.name}</p>
        <p className="truncate font-mono text-[0.65rem] tabular-nums text-white/45">
          {row.hasFolded ? 'Folded' : formatHoleDigits(row.holes)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-xs font-black tabular-nums text-amber-100 sm:text-sm">
          {hasGuess ? formatTriviaNumber(row.submitted) : '—'}
        </p>
        {distance != null ? (
          <p
            className={`font-mono text-[0.6rem] font-bold tabular-nums ${
              isWinner ? 'text-emerald-300' : 'text-white/45'
            }`}
          >
            ±{formatTriviaNumber(distance)}
          </p>
        ) : null}
      </div>
      {isWinner ? <PokerChip size="sm" className="shrink-0 opacity-90" /> : null}
    </div>
  )
}

export default function ShowdownTableCard({
  tableNum,
  correctAnswer,
  rows,
  className = '',
}: ShowdownTableCardProps) {
  const { rows: sorted, winnerKey } = sortShowdownRowsByDistance(rows, correctAnswer)
  const activeRows = sorted.filter((r) => r.name.trim() !== '')
  const winnerRow = activeRows.find((r) => winnerKey === `${r.seat}:${r.name}`)

  return (
    <motion.article
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-yellow-600/40 bg-black/50 shadow-lg ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <header
        className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-3.5 sm:py-2.5"
        style={SHOWDOWN_FELT_STYLE}
      >
        <div>
          <p className="text-[0.55rem] font-bold uppercase tracking-[0.2em] text-amber-200/70">Table</p>
          <p className="font-mono text-2xl font-black tabular-nums leading-none text-yellow-400 sm:text-3xl">
            {tableNum}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.55rem] font-bold uppercase tracking-wider text-white/45">Answer</p>
          <p className="font-mono text-lg font-black tabular-nums text-amber-100 sm:text-xl">
            {formatTriviaNumber(correctAnswer)}
          </p>
        </div>
      </header>

      {winnerRow ? (
        <div className="shrink-0 border-b border-amber-500/25 bg-amber-950/30 px-3 py-1.5 text-center">
          <p className="text-[0.6rem] font-bold uppercase tracking-wider text-amber-200/75">Pot winner</p>
          <p className="truncate text-sm font-black text-amber-50 sm:text-base">{winnerRow.name}</p>
        </div>
      ) : null}

      <div
        className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-y-contain p-2 sm:p-2.5"
        role="group"
        aria-label={`Table ${tableNum} showdown results`}
      >
        {activeRows.map((row) => (
          <MiniRow
            key={`${row.seat}:${row.name}`}
            row={row}
            correctAnswer={correctAnswer}
            isWinner={winnerKey === `${row.seat}:${row.name}`}
          />
        ))}
      </div>
    </motion.article>
  )
}
