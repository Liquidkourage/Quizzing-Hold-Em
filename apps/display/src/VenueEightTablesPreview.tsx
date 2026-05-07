import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import {
  DISPLAY_PREVIEW_SYNCED_PHASE,
  DISPLAY_PREVIEW_TABLES,
} from '@qhe/core'
import type { DisplayVenueTileSnapshot, DisplayVenueWallSnapshot } from '@qhe/net'

function SeatDots({
  seatedCount,
  size = 'md',
}: {
  seatedCount: number
  size?: 'md' | 'lg'
}) {
  const wrap = size === 'lg' ? 'max-w-[min(440px,92vw)]' : 'max-w-[200px]'
  const dot = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'

  return (
    <div className={`relative mx-auto aspect-[10/8] w-full ${wrap}`}>
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
            className={`absolute ${dot} -translate-x-1/2 -translate-y-1/2 rounded-full border shadow ${
              filled
                ? 'border-emerald-300/70 bg-black/85'
                : 'border-white/20 bg-black/35'
            }`}
            style={{ left: `calc(50% + ${xr}%)`, top: `calc(50% + ${yr}%)` }}
          />
        )
      })}
    </div>
  )
}

function phaseLabel(ph: string) {
  if (ph === 'lobby') return 'Lobby'
  if (ph === 'question') return 'Question setup'
  if (ph === 'betting') return 'Wagering'
  if (ph === 'answering') return 'Answering'
  if (ph === 'reveal') return 'Reveal'
  if (ph === 'showdown') return 'Showdown'
  if (ph === 'payout') return 'Payout'
  if (ph === 'intermission') return 'Break'
  return ph
}

function phaseAccent(ph: string) {
  if (ph === 'answering') return 'text-amber-200 ring-1 ring-amber-400/50'
  if (ph === 'showdown') return 'text-yellow-300 ring-1 ring-yellow-400/35'
  if (ph === 'question') return 'text-emerald-200/95'
  return 'text-white/85'
}

type VenueEightTablesPreviewProps = {
  /** null until first `displayVenueSnapshot` from socket */
  wall: DisplayVenueWallSnapshot | null
  /**
   * Skip Framer entrance on header / headline / tiles (mosaic briefly unmounts when
   * fullscreen felt covers it — replaying fades looks like a glitch).
   */
  skipMountIntro?: boolean
}

/**
 * Mosaic rows mirror each table session on the server; spotlight opens the matching full felt.
 * Headline shows only live question text + countdown from the server snapshot.
 */
export default function VenueEightTablesPreview({ wall, skipMountIntro = false }: VenueEightTablesPreviewProps) {
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null)

  const headlineQuestionText = wall?.headlineQuestionText ?? null
  const answerDeadlineMs = wall?.answerDeadlineMs ?? null

  useEffect(() => {
    if (answerDeadlineMs == null) {
      setTimerSeconds(null)
      return
    }
    const tick = () =>
      setTimerSeconds(Math.max(0, Math.ceil((answerDeadlineMs - Date.now()) / 1000)))
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [answerDeadlineMs])

  const tileRows: DisplayVenueTileSnapshot[] =
    wall?.tiles != null && wall.tiles.length === 8
      ? [...wall.tiles].sort((a, b) => a.tableNum - b.tableNum)
      : DISPLAY_PREVIEW_TABLES.map((snap, i) => ({
          tableNum: i + 1,
          seated: snap.seated,
          pot: snap.pot,
          phase: DISPLAY_PREVIEW_SYNCED_PHASE,
        }))

  const hasLiveWall = wall != null && wall.tiles.length === 8
  const showHeadline =
    hasLiveWall && (headlineQuestionText != null || answerDeadlineMs != null)

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

      <header className="relative z-10 border-b border-white/10 bg-transparent px-4 py-2 sm:px-6 sm:py-2.5">
        <motion.div
          className="mx-auto flex w-full max-w-[1600px] justify-center"
          initial={skipMountIntro ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex min-w-0 justify-center">
            <div
              className="max-w-full w-[min(86vw,calc((min(1600px,100vw)-2rem)*0.92))] sm:w-[calc((min(1600px,100vw)-2rem-1.25rem)/2)] lg:w-[calc((min(1600px,100vw)-2rem-3.75rem)/4)]"
              style={{ aspectRatio: '1' }}
            >
              <QuizzEmWordmark layout="fill" />
            </div>
          </div>
        </motion.div>
      </header>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 pt-5 sm:px-6 sm:pt-6">
        {showHeadline ? (
          <motion.section
            className="mb-8 rounded-2xl border-2 border-casino-emerald/40 bg-black/65 p-6 shadow-[0_0_40px_rgba(0,255,180,0.08)] backdrop-blur-md sm:p-8"
            initial={skipMountIntro ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:gap-10">
              {headlineQuestionText ? (
                <p className="flex-1 text-balance text-center text-2xl font-bold leading-snug text-yellow-400 sm:text-left md:text-3xl lg:text-4xl">
                  {headlineQuestionText}
                </p>
              ) : (
                <div className="hidden flex-1 lg:block" aria-hidden />
              )}
              {answerDeadlineMs != null && typeof timerSeconds === 'number' ? (
                <div
                  className={`flex min-w-[8.5rem] shrink-0 flex-col items-center justify-center self-center rounded-xl border px-6 py-5 lg:self-stretch lg:justify-center ${
                    timerSeconds <= 10
                      ? 'border-amber-400/60 bg-amber-950/40 shadow-[0_0_28px_rgba(251,191,36,0.12)]'
                      : 'border-amber-500/35 bg-amber-950/30'
                  }`}
                >
                  <div className="font-mono text-5xl font-black tabular-nums tracking-tight text-amber-200 sm:text-6xl lg:text-[4.25rem]">
                    {timerSeconds}s
                  </div>
                </div>
              ) : null}
            </div>
          </motion.section>
        ) : null}
      </div>

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 pb-12 sm:px-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tileRows.map((row, idx) => {
            const tn = row.tableNum
            const seats = row.seated
            const pot = row.pot
            const ph = row.phase
            return (
              <motion.article
                key={tn}
                data-spotlight-tile={tn}
                initial={skipMountIntro ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: skipMountIntro ? 0 : idx * 0.045,
                  duration: skipMountIntro ? 0 : 0.35,
                }}
                className="flex flex-col rounded-2xl border border-yellow-700/35 bg-black/55 p-4 shadow-xl backdrop-blur-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/55">Table</div>
                    <div className="text-3xl font-black tabular-nums text-yellow-400">{tn}</div>
                  </div>
                  <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase ${phaseAccent(ph)}`}>
                    {phaseLabel(ph)}
                  </span>
                </div>

                <div className="mt-3 flex-shrink-0">
                  <SeatDots seatedCount={seats} />
                </div>

                <dl className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm leading-snug">
                  <div className="flex justify-between gap-2">
                    <dt className="text-white/55">Occupied seats</dt>
                    <dd className="font-mono font-bold tabular-nums text-casino-emerald">{seats} / 8</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-white/55">Pot (local)</dt>
                    <dd className="font-mono font-bold tabular-nums text-yellow-300">${pot.toLocaleString()}</dd>
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
