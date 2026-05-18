import { motion } from 'framer-motion'
import { formatTriviaNumber } from '@qhe/core'
import { PokerChip } from '@qhe/ui'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import {
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
      className={`flex min-w-0 flex-col items-stretch gap-1.5 rounded-md border px-1.5 py-2 sm:px-2 ${
        isWinner
          ? 'border-amber-400/55 bg-amber-950/45'
          : row.hasFolded
            ? 'border-white/6 bg-black/20 opacity-55'
            : 'border-white/10 bg-black/30'
      }`}
      aria-label={`${row.name}, seat ${row.seat}`}
    >
      <div className="flex min-w-0 items-center gap-1">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[0.65rem] font-black tabular-nums sm:h-7 sm:w-7 sm:text-xs ${
            isWinner ? 'bg-amber-500/25 text-amber-100' : 'bg-black/40 text-white/70'
          }`}
        >
          {row.seat}
        </span>
        <p className="min-w-0 flex-1 truncate text-[0.7rem] font-bold leading-tight text-white sm:text-xs">
          {row.name}
        </p>
        {isWinner ? <PokerChip size="sm" className="shrink-0 opacity-90" /> : null}
      </div>

      <ShowdownFiveCardsUsed row={row} size="lg" />

      <div className="text-center leading-tight">
        <p className="font-mono text-sm font-black tabular-nums text-amber-100 sm:text-base">
          {hasGuess ? formatTriviaNumber(row.submitted) : '—'}
        </p>
        {distance != null ? (
          <p
            className={`font-mono text-[0.65rem] font-bold tabular-nums sm:text-xs ${
              isWinner ? 'text-emerald-300' : 'text-white/45'
            }`}
          >
            ±{formatTriviaNumber(distance)}
          </p>
        ) : null}
      </div>
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
        <p className="font-mono text-2xl font-black tabular-nums leading-none text-yellow-400 sm:text-3xl">
          {tableNum}
        </p>
        <p className="font-mono text-lg font-black tabular-nums text-amber-100 sm:text-xl">
          {formatTriviaNumber(correctAnswer)}
        </p>
      </header>

      {winnerRow ? (
        <div className="flex shrink-0 items-center justify-center gap-1.5 border-b border-amber-500/25 bg-amber-950/30 px-2 py-1.5">
          <PokerChip size="sm" />
          <p className="min-w-0 truncate text-sm font-black text-amber-50 sm:text-base">{winnerRow.name}</p>
        </div>
      ) : null}

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-2 sm:p-2.5"
        role="group"
        aria-label={`Table ${tableNum} showdown results`}
      >
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {activeRows.map((row) => (
            <MiniRow
              key={`${row.seat}:${row.name}`}
              row={row}
              correctAnswer={correctAnswer}
              isWinner={winnerKey === `${row.seat}:${row.name}`}
            />
          ))}
        </div>
      </div>
    </motion.article>
  )
}
