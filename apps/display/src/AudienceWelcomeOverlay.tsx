import { motion } from 'framer-motion'
import type { DisplayVenueWallSnapshot } from '@qhe/net'

export type AudienceWelcomeOverlayProps = {
  venueCode: string
  wall: DisplayVenueWallSnapshot | null
}

function playerJoinHref(): string {
  if (typeof window === 'undefined') return '/player/'
  return `${window.location.origin}/player/`
}

/** Full-bleed over venue-wall mosaic until host runs Start Game (server `showAudienceWelcome`). */
export default function AudienceWelcomeOverlay({ venueCode, wall }: AudienceWelcomeOverlayProps) {
  const joinUrl = playerJoinHref()
  const syncingCounts = wall == null
  const lobby = syncingCounts ? null : wall.lobbyPlayerCount
  const atTables = syncingCounts ? null : wall.totalSeatedAtTables
  const enrolled =
    syncingCounts ? null : (lobby ?? 0) + (atTables ?? 0)

  return (
    <motion.div
      role="region"
      aria-label="Audience welcome and join instructions"
      className="pointer-events-none absolute inset-0 z-[35] flex items-center justify-center p-6 sm:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pointer-events-none max-h-[min(92dvh,900px)] w-full max-w-4xl overflow-y-auto rounded-3xl border border-emerald-500/35 bg-black/82 px-8 py-10 shadow-[0_0_120px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:px-12 sm:py-12">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200/85">
          You&apos;re in the room
        </p>
        <h2 className="mt-5 text-center text-3xl font-black leading-tight text-white sm:text-4xl">
          Grab your phone — join{' '}
          <span className="whitespace-nowrap text-casino-emerald">{venueCode}</span>
        </h2>

        <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-6 text-center sm:p-8">
          <div className="text-xs uppercase tracking-widest text-white/55">Scan or open</div>
          <div className="mt-2 break-all font-mono text-xl font-bold text-casino-gold sm:text-2xl">{joinUrl}</div>
          <p className="mt-5 text-lg text-white/90 sm:text-xl">
            Enter venue code{' '}
            <span className="font-black tracking-wider text-yellow-400">{venueCode}</span>{' '}
            and tap <strong className="text-white">Join Game</strong>. Choose <strong>Lobby</strong> unless your host
            told you to pick a fixed table ID.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-500/25 bg-amber-950/30 px-5 py-4 text-center">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-200/80">
              Lobby pool
            </div>
            <div className="mt-1 font-mono text-3xl font-black tabular-nums text-white">
              {syncingCounts ? '—' : lobby}
            </div>
            <div className="mt-2 text-xs text-white/65">waiting for table assign</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/25 px-5 py-4 text-center">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/80">
              At numbered tables
            </div>
            <div className="mt-1 font-mono text-3xl font-black tabular-nums text-white">
              {syncingCounts ? '—' : atTables}
            </div>
            <div className="mt-2 text-xs text-white/65">hosts / players checking in</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-black/35 px-5 py-4 text-center sm:col-span-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/55">
              Enrolled humans
            </div>
            <div className="mt-1 font-mono text-3xl font-black tabular-nums text-yellow-400">
              {syncingCounts ? '—' : enrolled}
            </div>
            <div className="mt-2 text-xs text-white/65">virtual seats omitted from this count</div>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-black/40 p-6 text-sm leading-relaxed text-white/90 sm:p-8 sm:text-base">
          <h3 className="text-base font-black uppercase tracking-[0.12em] text-white sm:text-lg">
            How tonight works
          </h3>
          <ul className="mt-4 list-disc space-y-3 pl-5 marker:text-emerald-400">
            <li>
              Digit cards behave like Hold&apos;em: two waves of wagering, then five community digits land together.
              Compose your trivia answer from the seven digits you&apos;re entitled to — closest number wins after the
              reveal.
            </li>
            <li>
              The host pushes questions, deals, timers, and round flow for every table — stay connected and follow cues
              on your screen.
            </li>
            <li>
              Folding steps you out of the pot early; answering happens in a timed window once the board is complete and
              betting is locked.
            </li>
          </ul>
          <p className="mt-5 text-xs text-white/55">
            This summary hides after the host runs <strong className="text-white/85">Start Game</strong>; it returns if
            the host resets with <strong className="text-white/85">New Game</strong>.
          </p>
        </div>
      </div>
    </motion.div>
  )
}
