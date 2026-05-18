import { motion } from 'framer-motion'
import {
  formatHoleDigits,
  sortShowdownRowsByDistance,
  type ShowdownResultRow,
} from './showdownDisplay'

type ShowdownResultsPanelProps = {
  correctAnswer: number | undefined
  rows: ShowdownResultRow[]
  winnerName?: string
  compact?: boolean
  className?: string
}

export default function ShowdownResultsPanel({
  correctAnswer,
  rows,
  winnerName,
  compact = false,
  className = '',
}: ShowdownResultsPanelProps) {
  const { rows: sorted, winnerKey } = sortShowdownRowsByDistance(rows, correctAnswer)

  const pad = compact ? 'py-1.5 px-2' : 'py-3 px-4'
  const text = compact ? 'text-[0.6875rem] sm:text-xs' : 'text-lg md:text-xl'
  const head = compact ? 'text-[0.625rem] sm:text-[0.6875rem]' : 'text-sm md:text-base'

  return (
    <motion.div
      className={`overflow-x-auto ${className}`}
      initial={{ opacity: 0, y: compact ? 4 : 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {!compact && winnerName ? (
        <p className="mb-4 text-center text-xl font-extrabold tracking-wide text-yellow-300 md:text-2xl">
          🏆 {winnerName}
        </p>
      ) : null}
      {!compact ? (
        <motion.div
          className="text-center mb-5"
          key={String(correctAnswer ?? '—')}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <div className="text-white/80 text-xl font-semibold md:text-2xl">Correct Answer</div>
          <div className="mt-2 inline-block rounded-lg border border-yellow-400/40 bg-yellow-500/10 px-4 py-1 shadow-[0_0_20px_rgba(255,215,0,0.35)]">
            <span className="text-5xl font-extrabold text-yellow-400 md:text-7xl">
              {correctAnswer ?? '—'}
            </span>
          </div>
        </motion.div>
      ) : (
        <p className="mb-2 text-center text-[0.6875rem] font-bold tabular-nums text-yellow-300 sm:text-xs">
          Answer{' '}
          <span className="text-base text-yellow-400 sm:text-lg">{correctAnswer ?? '—'}</span>
        </p>
      )}

      <table className={`min-w-full text-left ${text}`}>
        <thead>
          <tr className="text-white/75">
            <th className={`${pad} ${head}`}>Seat</th>
            <th className={`${pad} ${head}`}>Player</th>
            <th className={`${pad} ${head}`}>Hole cards</th>
            <th className={`${pad} ${head}`}>Guess</th>
            {!compact ? <th className={`${pad} ${head}`}>Distance</th> : null}
            <th className={`${pad} ${head}`}>Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => {
            const key = `${row.seat}:${row.name}`
            const isWinner = winnerKey === key
            const has =
              !row.hasFolded && row.submitted != null && typeof correctAnswer === 'number'
            const distance =
              has && typeof correctAnswer === 'number'
                ? Math.abs(row.submitted! - correctAnswer)
                : null
            return (
              <motion.tr
                key={key}
                initial={{ opacity: 0, y: compact ? 6 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * (compact ? 0.04 : 0.07) }}
                className={isWinner ? 'bg-white/10' : undefined}
              >
                <td className={`${pad} tabular-nums text-white/70`}>{row.seat}</td>
                <td className={`${pad} font-bold text-yellow-300`}>{row.name}</td>
                <td className={`${pad} font-mono tabular-nums text-cyan-200/95`}>
                  {row.hasFolded ? '—' : formatHoleDigits(row.holes)}
                </td>
                <td className={`${pad} font-mono tabular-nums`}>
                  {has ? row.submitted : '—'}
                </td>
                {!compact ? (
                  <td className={`${pad} tabular-nums`}>{distance != null ? distance : '—'}</td>
                ) : null}
                <td className={pad}>
                  {row.hasFolded ? (
                    <span className="font-semibold text-red-400">Folded</span>
                  ) : has ? (
                    isWinner ? (
                      <span className="font-extrabold text-yellow-400">Winner</span>
                    ) : (
                      <span className="text-white/65">In</span>
                    )
                  ) : (
                    <span className="text-white/45">No guess</span>
                  )}
                </td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </motion.div>
  )
}
