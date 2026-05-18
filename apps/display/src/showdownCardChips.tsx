import type { ShowdownResultRow } from './showdownDisplay'

export type ShowdownChipSize = 'sm' | 'md'

type DigitChipVariant = 'hole' | 'board' | 'inactive'

function DigitChip({
  digit,
  variant,
  size = 'md',
}: {
  digit: number
  variant: DigitChipVariant
  size?: ShowdownChipSize
}) {
  const dim =
    size === 'sm'
      ? 'h-6 min-w-[1.125rem] px-0.5 text-[0.65rem]'
      : 'h-7 min-w-[1.35rem] px-1 text-xs'
  const styles: Record<DigitChipVariant, string> = {
    hole: 'border-amber-400/85 bg-amber-950/90 text-amber-50 shadow-[0_0_8px_rgba(251,191,36,0.35)]',
    board:
      'border-emerald-400/70 bg-emerald-950/90 text-emerald-100 shadow-[0_0_8px_rgba(52,211,153,0.25)]',
    inactive: 'border-white/12 bg-black/35 text-white/30',
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded border font-mono font-black tabular-nums ${dim} ${styles[variant]}`}
    >
      {digit}
    </span>
  )
}

/** The five digits used to build this player's submitted answer (from answer composition). */
export function ShowdownFiveCardsUsed({
  row,
  size = 'sm',
}: {
  row: ShowdownResultRow
  size?: ShowdownChipSize
}) {
  if (row.hasFolded) {
    return (
      <span className="text-[0.6rem] font-bold uppercase tracking-wider text-white/30">Folded</span>
    )
  }

  const cards = row.answerCards

  if (cards.length === 0) {
    return <span className="text-[0.6rem] text-white/35">—</span>
  }

  return (
    <div
      className="flex flex-wrap items-center gap-0.5"
      aria-label={`Five cards used: ${cards.map((c) => c.digit).join(', ')}`}
    >
      {cards.map((c, i) => (
        <DigitChip
          key={i}
          digit={c.digit}
          variant={c.source === 'hole' ? 'hole' : 'board'}
          size={size}
        />
      ))}
    </div>
  )
}
