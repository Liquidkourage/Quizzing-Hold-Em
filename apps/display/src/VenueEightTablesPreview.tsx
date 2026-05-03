import { motion } from 'framer-motion'
import { PokerChip } from '@qhe/ui'

/** Illustrative snapshots for eight numbered tables — not live-synced data. */
const SNAP = [
  { seats: 8, phase: 'betting' as const, pot: 1120 },
  { seats: 6, phase: 'question' as const, pot: 0 },
  { seats: 7, phase: 'betting' as const, pot: 880 },
  { seats: 5, phase: 'answering' as const, pot: 0 },
  { seats: 8, phase: 'betting' as const, pot: 1540 },
  { seats: 6, phase: 'betting' as const, pot: 640 },
  { seats: 7, phase: 'question' as const, pot: 0 },
  { seats: 8, phase: 'showdown' as const, pot: 2460 },
] as const

const Q_SNIPPET = [
  'Metro station count in Paris?',
  'Year the first moon landing?',
  'Height of Everest in kilometers?',
  'Digits in Pi (millionth)?',
  'Speed of sound at sea level?',
  'Gold atomic number?',
  'States in the contiguous US?',
  'Hours in a leap year?',
]

function SeatDots({ seatedCount }: { seatedCount: number }) {
  return (
    <div className="relative mx-auto aspect-[10/8] w-full max-w-[200px]">
      <div
        className="absolute inset-[12%_8%_16%_8%] rounded-[50%] border-2 border-amber-700/70 shadow-inner"
        style={{
          background: `
            repeating-linear-gradient(
              45deg,
              #245c36 0px,
              #245c36 2px,
              #1b4528 2px,
              #1b4528 4px
            ),
            linear-gradient(135deg, #2d7a4a, #1e502e)
          `,
        }}
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * 2 * Math.PI - Math.PI / 2
        const xr = 48 * Math.cos(a)
        const yr = 38 * Math.sin(a)
        const filled = i < seatedCount
        return (
          <div
            key={i}
            className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border shadow ${
              filled
                ? 'border-emerald-300/70 bg-black/85'
                : 'border-white/20 bg-black/35'
            }`}
            style={{ left: `calc(50% + ${xr}%)`, top: `calc(50% + ${yr}%)` }}
            title={`Seat ${i + 1}`}
          />
        )
      })}
    </div>
  )
}

function phaseLabel(ph: string) {
  if (ph === 'question') return 'Question'
  if (ph === 'betting') return 'Wagering'
  if (ph === 'answering') return 'Answering'
  if (ph === 'showdown') return 'Showdown'
  return ph
}

function phaseAccent(ph: string) {
  if (ph === 'answering') return 'text-amber-200 ring-1 ring-amber-400/50'
  if (ph === 'showdown') return 'text-yellow-300 ring-1 ring-yellow-400/35'
  if (ph === 'question') return 'text-emerald-200/95'
  return 'text-white/85'
}

/**
 * Opens from <code>?tablesPreview</code> (see main.tsx). Synthetic eight-table venue wall.
 */
export default function VenueEightTablesPreview() {
  const venue =
    new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase() || 'HOST01'

  return (
    <div className="relative min-h-screen overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(139,69,19,0.25) 2px, transparent 2px),
              linear-gradient(45deg, transparent 47%, rgba(160,82,45,0.12) 50%, transparent 53%)
            `,
            backgroundSize: '48px 48px, 64px 64px',
          }}
        />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-black/40 px-6 py-5 text-center backdrop-blur-md">
        <motion.h1
          className="flex items-center justify-center gap-2 text-4xl font-black tracking-tight text-yellow-400 sm:text-5xl"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PokerChip size="lg" /> Venue wall —{' '}
          <span className="text-yellow-400 underline decoration-yellow-600/55 decoration-4 underline-offset-4">
            8 tables
          </span>
        </motion.h1>
        <p className="mt-3 text-lg text-white/85">
          Event <span className="font-bold text-casino-emerald">{venue}</span>
          <span className="text-white/55"> · </span>
          <span className="text-white/65">preview layout (sample seats & phases)</span>
        </p>
        <p className="mx-auto mt-2 max-w-3xl text-sm text-white/50">
          This view is mocked for televisions and rehearsals. Reload without{' '}
          <code className="rounded bg-white/10 px-2 py-0.5 font-mono text-white/85">tablesPreview</code>{' '}
          to attach to one live table (<code className="font-mono">&amp;table=…</code>).
        </p>
      </header>

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SNAP.map((row, idx) => {
            const tn = idx + 1
            const q = Q_SNIPPET[idx]
            return (
              <motion.article
                key={tn}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.045, duration: 0.35 }}
                className="flex flex-col rounded-2xl border border-yellow-700/35 bg-black/55 p-4 shadow-xl backdrop-blur-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/55">Table</div>
                    <div className="text-3xl font-black tabular-nums text-yellow-400">{tn}</div>
                  </div>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase ${phaseAccent(row.phase)}`}
                  >
                    {phaseLabel(row.phase)}
                  </span>
                </div>

                <div className="mt-4 flex-shrink-0">
                  <SeatDots seatedCount={row.seats} />
                </div>

                <dl className="mt-5 space-y-2 text-sm leading-snug border-t border-white/10 pt-4">
                  <div className="flex justify-between gap-2">
                    <dt className="text-white/55">Occupied seats</dt>
                    <dd className="font-mono tabular-nums font-bold text-casino-emerald">
                      {row.seats} / 8
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-white/55">Pot</dt>
                    <dd className="font-mono tabular-nums font-bold text-yellow-300">
                      ${row.pot.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/55">Cue (readable from room)</dt>
                    <dd className="mt-1 line-clamp-3 text-[15px] font-semibold leading-snug text-white/90">{q}</dd>
                  </div>
                </dl>
              </motion.article>
            )
          })}
        </div>
      </main>
    </div>
  )
}
