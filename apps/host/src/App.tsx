import { useEffect, useState, useRef, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, NeonButton, JackpotDisplay, PokerChip } from '@qhe/ui'
import {
  connect,
  onState,
  onToast,
  onHostLibrary,
  useSocket,
  startAnswering,
  adminAdvanceTurn,
  adminCloseBetting,
  adminSetBlinds,
  addVirtualPlayers,
  clearVirtualPlayers,
  assignTablesFromLobby,
  displaySetLayout,
  pairDisplayWithHost,
  setQuestion as pushQuestionToVenue,
  questionBankAdd,
  questionBankUpdate,
  questionBankDelete,
  questionBankMove,
  questionBankRestoreSamples,
  questionBankImportRows,
  selectTriviaSetlist,
  nextQuestionFromSetlist,
  setlistCreate,
  setlistSave,
  setlistDelete,
} from '@qhe/net'
import type { GameState, GamePhase, Question } from '@qhe/core'
import { LOBBY_TABLE_ID } from '@qhe/core'
import { parseQuestionsCsv, parseQuestionsJson } from './questionImport'

const HOST_TABS = [
  { id: 'live' as const, label: 'Run show', hint: 'Floor + flow' },
  { id: 'content' as const, label: 'Content', hint: 'Bank & setlists' },
  { id: 'venue' as const, label: 'Room & displays', hint: 'TVs only' },
]

const HOST_PHASE_LABEL: Record<GamePhase, string> = {
  lobby: 'Lobby',
  question: 'Question / deal setup',
  betting: 'Wagering',
  answering: 'Answering',
  reveal: 'Reveal',
  showdown: 'Showdown',
  payout: 'Payout',
  intermission: 'Intermission',
}

/** Host UI: "First L." from full name; unchanged for single tokens and CPU seats */
function hostPlayerLabel(raw: string): string {
  const s = String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!s) return '—'
  const parts = s.split(' ')
  if (parts[0].toUpperCase() === 'CPU' && parts.length >= 2) return s
  if (parts.length === 1) return parts[0]
  const first = parts[0]
  const last = parts[parts.length - 1]
  if (/^[A-Za-z]\.?$/i.test(last)) {
    const L = last.replace(/\./g, '').charAt(0).toUpperCase()
    return `${first} ${L}.`
  }
  const m = last.match(/[A-Za-z]/)
  const L = m ? m[0].toUpperCase() : ''
  return L ? `${first} ${L}.` : first
}

function HostApp() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [virtualAddCount, setVirtualAddCount] = useState(2)
  const [hostVenueCode] = useState('HOST01')
  const [hostTableId, setHostTableId] = useState(() =>
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('table') ?? LOBBY_TABLE_ID
      : LOBBY_TABLE_ID
  )
  const socket = useSocket()

  const [questionBank, setQuestionBank] = useState<Question[]>([])
  const [setlists, setSetlists] = useState<
    Array<{ id: string; name: string; questionIds: string[] }>
  >([])
  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null)
  const [activeSetlistNextIndex, setActiveSetlistNextIndex] = useState(0)
  const [setlistDraftId, setSetlistDraftId] = useState<string | null>(null)
  const [setlistRenameDraft, setSetlistRenameDraft] = useState('')
  const [newSetlistName, setNewSetlistName] = useState('')
  const [addToSetlistChoice, setAddToSetlistChoice] = useState<string>('')
  const [qbText, setQbText] = useState('')
  const [qbAnswer, setQbAnswer] = useState('')
  const [qbCategory, setQbCategory] = useState('')
  const [qbDifficulty, setQbDifficulty] = useState('')
  const [editingBankId, setEditingBankId] = useState<string | null>(null)

  const [hostTab, setHostTab] = useState<(typeof HOST_TABS)[number]['id']>('live')
  const [hostSecretApplied, setHostSecretApplied] = useState('')
  const [secretDraft, setSecretDraft] = useState('')
  const importFileRef = useRef<HTMLInputElement>(null)
  const importReplaceRef = useRef(false)
  const [tvPairCode, setTvPairCode] = useState('')

  const viteHostSecret =
    typeof import.meta.env.VITE_HOST_SECRET === 'string' ? import.meta.env.VITE_HOST_SECRET.trim() : ''
  const effectiveHostSecret = viteHostSecret || hostSecretApplied.trim() || undefined

  useEffect(() => {
    const cleanup = connect('host', 'HOST01', hostVenueCode, hostTableId, {
      hostSecret: effectiveHostSecret,
    })
    return cleanup
  }, [hostVenueCode, hostTableId, effectiveHostSecret])

  useEffect(() => {
    const unsubscribe = onState((newGameState) => {
      console.log('🎰 Host: State update received - Phase:', newGameState?.phase)
      console.log('🎰 Host: State update received - Question:', newGameState?.round?.question?.text)
      console.log('🎰 Host: State update received - Question ID:', newGameState?.round?.question?.id)
      setGameState(newGameState)
    })
    return unsubscribe
  }, [])

  // Debug current game state
  useEffect(() => {
    console.log('🎰 Host: Current game state - Phase:', gameState?.phase)
    console.log('🎰 Host: Current game state - Has Question:', !!gameState?.round?.question)
    console.log('🎰 Host: Current game state - Players Count:', gameState?.players?.length)
    console.log('🎰 Host: Current game state - Question Text:', gameState?.round?.question?.text)
  }, [gameState])

  useEffect(() => {
    const unsubscribe = onToast((message) => {
      setToastMessage(message)
      setTimeout(() => setToastMessage(null), 3000)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const off = onHostLibrary((snap) => {
      setQuestionBank(snap.questions)
      setSetlists(snap.setlists)
      setActiveSetlistId(snap.activeSetlistId)
      setActiveSetlistNextIndex(snap.activeSetlistNextIndex)
    })
    return off
  }, [])

  const handleStartGame = () => {
    if (socket) {
      socket.emit('action', { type: 'startGame' })
    }
  }

  const handleSetRandomQuestion = () => {
    pushQuestionToVenue()
  }

  const handlePushBankQuestion = (questionId: string) => {
    pushQuestionToVenue({ questionId })
  }

  function resetQuestionDraft() {
    setQbText('')
    setQbAnswer('')
    setQbCategory('')
    setQbDifficulty('')
    setEditingBankId(null)
  }

  function handleSaveBankQuestion(e: FormEvent) {
    e.preventDefault()
    const ans = Number(qbAnswer)
    if (!qbText.trim() || Number.isNaN(ans)) return
    const dt = qbDifficulty.trim()
    const normalizedDiff =
      dt === ''
        ? null
        : (() => {
            const d = Number(dt)
            return !Number.isNaN(d) && d >= 1 && d <= 5 ? d : null
          })()

    if (editingBankId) {
      questionBankUpdate({
        id: editingBankId,
        text: qbText.trim(),
        answer: ans,
        category: qbCategory.trim() === '' ? null : qbCategory.trim(),
        difficulty: dt === '' ? null : normalizedDiff,
      })
    } else {
      questionBankAdd({
        text: qbText.trim(),
        answer: ans,
        category: qbCategory.trim() || undefined,
        ...(normalizedDiff != null ? { difficulty: normalizedDiff } : {}),
      })
    }
    resetQuestionDraft()
  }

  function startEditBankQuestion(q: Question) {
    setEditingBankId(q.id)
    setQbText(q.text)
    setQbAnswer(String(q.answer))
    setQbCategory(q.category ?? '')
    setQbDifficulty(q.difficulty != null ? String(q.difficulty) : '')
  }

  function appendQuestionToSetlist(setlistId: string, questionId: string) {
    const sl = setlists.find((s) => s.id === setlistId)
    if (!sl || sl.questionIds.includes(questionId)) return
    setlistSave({ id: setlistId, questionIds: [...sl.questionIds, questionId] })
  }

  function moveSetlistQuestion(setlistId: string, index: number, dir: 'up' | 'down') {
    const sl = setlists.find((s) => s.id === setlistId)
    if (!sl) return
    const ids = [...sl.questionIds]
    const j = dir === 'up' ? index - 1 : index + 1
    if (j < 0 || j >= ids.length) return
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    setlistSave({ id: setlistId, questionIds: ids })
  }

  function removeSetlistQuestion(setlistId: string, index: number) {
    const sl = setlists.find((s) => s.id === setlistId)
    if (!sl) return
    setlistSave({
      id: setlistId,
      questionIds: sl.questionIds.filter((_, i) => i !== index),
    })
  }

  const handleDealInitialCards = () => {
    console.log('🎰 Host: Deal Initial Cards button clicked')
    console.log('🎰 Host: Current phase:', gameState?.phase)
    if (socket) {
      console.log('🎰 Host: Emitting dealInitialCards action')
      socket.emit('action', { type: 'dealInitialCards' })
    } else {
      console.log('🎰 Host: No socket available')
    }
  }

  const handleDealCommunityCards = () => {
    if (socket) {
      socket.emit('action', { type: 'dealCommunityCards' })
    }
  }

  const handleRevealAnswer = () => {
    if (socket) {
      socket.emit('action', { type: 'revealAnswer' })
    }
  }

  const handleStartAnswering = () => {
    startAnswering()
  }

  const handleEndRound = () => {
    if (socket) {
      socket.emit('action', { type: 'endRound' })
    }
  }

  const handleNewGame = () => {
    if (socket) {
      socket.emit('action', { type: 'newGame' })
    }
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-casino-gradient flex items-center justify-center">
        <div className="text-center">
          <motion.h1 
            className="text-6xl font-black text-casino-emerald mb-8"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            🎰 <PokerChip size="lg" className="mx-1" />
            {'Quizz\u2019em'}
          </motion.h1>
          <motion.div 
            className="text-2xl text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Connecting to server...
          </motion.div>
        </div>
      </div>
    )
  }

  // Engine only cares about phase ("question" → deal → "betting"). Trivia is optional UI-side.
  const dealInitialBlocked = gameState.phase !== 'question'
  const dealInitialHint: string | null = dealInitialBlocked
    ? (() => {
        const p = gameState.phase
        if (p === 'lobby')
          return 'Start Game first—you can deal once phase is “question”.'
        if (p === 'betting')
          return 'Hole cards dealt (round 1) or board is live (round 2)—see Deal Community / Close Betting hints below.'
        if (p === 'answering')
          return 'Answering is open—initial deal is finished. Use Reveal Answer or wait for the timer.'
        if (p === 'showdown' || p === 'payout') {
          return 'Showdown / payout—initial deal is done. End Round to reset, then Start Game for the next round.'
        }
        if (p === 'intermission' || p === 'reveal') {
          return 'Not in setup—use End Round or New Game if you need a clean state.'
        }
        return `Initial deal happens only while phase is “question” (yours: "${p}").`
      })()
    : null
  const triviaOptionalNote =
    !dealInitialBlocked && !gameState.round?.question ? (
      <p className="text-sm text-amber-200/80">
        No trivia loaded yet—you can still deal to enter betting (use <strong>Random from bank</strong>, <strong>To tables</strong>, or a <strong>setlist cue</strong>).
      </p>
    ) : null

  const round = gameState.round
  const bettingRound = round.bettingRound ?? 0
  const communityLen = round.communityCards?.length ?? 0
  const virtualSeatCount = gameState.players.filter(p => p.id.startsWith('vp:')).length
  const atPlayerCap = gameState.players.length >= gameState.maxPlayers
  const dealCommunityBlocked =
    gameState.phase !== 'betting' ||
    bettingRound !== 1 ||
    !!(round as { isBettingOpen?: boolean }).isBettingOpen ||
    communityLen >= 5
  const dealCommunityHint = dealCommunityBlocked
    ? gameState.phase !== 'betting'
      ? 'Available during wagering (betting phase).'
      : bettingRound !== 1
        ? 'Board already dealt — you are in wagering round 2.'
        : (round as { isBettingOpen?: boolean }).isBettingOpen
          ? 'Close wagering round 1 first, then deal the board.'
          : communityLen >= 5
            ? 'Board is already complete.'
            : ''
    : null

  const startAnswerBlocked =
    gameState.phase !== 'betting' ||
    !!(round as { isBettingOpen?: boolean }).isBettingOpen ||
    communityLen < 5

  const draftSetlist =
    setlistDraftId != null ? setlists.find((s) => s.id === setlistDraftId) : undefined

  return (
    <div className="host-root min-h-screen bg-casino-gradient relative overflow-hidden">
      {/* Backdrop — static gradient so the desk stays readable during long hosts */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,180,120,0.08),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(100,70,160,0.06),transparent_50%)]" />
      </div>

      {/* Toast Messages */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="fixed top-4 right-4 z-50 rounded-xl border border-white/20 bg-glass-gradient p-5 text-lg text-white shadow-lg backdrop-blur-md"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-12 pt-4 sm:px-6 lg:px-8 lg:pb-16">
        <motion.header
          className="mb-6 rounded-2xl border border-white/10 bg-black/35 px-4 py-4 shadow-lg shadow-black/20 backdrop-blur-md sm:px-5 sm:py-5"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <PokerChip size="md" className="opacity-95" />
                <span className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {'Quizz\u2019em'} <span className="font-normal text-white/40">·</span>{' '}
                  <span className="font-semibold text-casino-emerald">Host</span>
                </span>
              </div>
              <span className="hidden h-8 w-px bg-white/15 lg:block" aria-hidden />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1 font-mono font-semibold text-white/90 tabular-nums">
                  {gameState.code}
                </span>
                <span className="text-white/45">Synced table</span>
                <span className="rounded-full border border-amber-500/35 bg-amber-950/30 px-2.5 py-0.5 font-medium text-casino-gold">
                  {gameState.tableId ?? '1'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <span className="text-sm uppercase tracking-wider text-white/35">Phase</span>
              <span className="rounded-md border border-casino-emerald/40 bg-casino-emerald/15 px-3 py-1 text-base font-bold capitalize text-casino-emerald">
                {gameState.phase}
              </span>
              <label className="flex items-center gap-2 text-base text-white/70">
                <span className="sr-only sm:not-sr-only sm:inline">You control</span>
                <select
                  value={hostTableId}
                  title="Which session Keyed host actions apply to — use Lobby for pooled players"
                  onChange={(e) => setHostTableId(e.target.value)}
                  className="max-w-[14rem] rounded-lg border border-white/20 bg-zinc-950 py-2 pl-2 pr-8 text-base text-white [color-scheme:dark] sm:max-w-xs"
                >
                  {[LOBBY_TABLE_ID, '1', '2', '3', '4', '5', '6', '7', '8'].map((v) => (
                    <option key={v} value={v} className="bg-zinc-950 text-white">
                      {v === LOBBY_TABLE_ID ? 'Lobby pool' : `Table ${v}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 pt-3">
            <span className="text-sm font-semibold uppercase tracking-wider text-white/45">Pair TV</span>
            <input
              id="tv-pair-code"
              type="text"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="••••"
              maxLength={4}
              value={tvPairCode}
              aria-label="Display pairing code from TV"
              title="Four characters shown on the TV’s pairing screen (/display)"
              onChange={(e) =>
                setTvPairCode(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z2-9]/g, '')
                    .slice(0, 4)
                )
              }
              className="w-[7rem] shrink-0 rounded-md border border-sky-500/35 bg-black/45 px-2 py-1.5 text-center font-mono text-lg tracking-[0.18em] text-white outline-none ring-sky-500/30 placeholder:text-white/20 focus:border-sky-500/60 focus:ring-1 sm:text-xl"
            />
            <NeonButton
              variant="gold"
              size="small"
              className="!px-3 !py-1.5"
              disabled={tvPairCode.length !== 4}
              onClick={() => {
                if (tvPairCode.length !== 4) return
                pairDisplayWithHost(tvPairCode, (ack) => {
                  if (ack.ok) setTvPairCode('')
                })
              }}
            >
              Attach
            </NeonButton>
            <span className="min-w-0 flex-1 text-sm leading-snug text-white/40 basis-full sm:basis-auto sm:flex-none">
              Same venue (<span className="font-mono text-white/55">{gameState.code}</span>) — chars from the TV glow box.
            </span>
          </div>

          {!viteHostSecret ? (
            <form
              className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4 text-base"
              onSubmit={(e) => {
                e.preventDefault()
                setHostSecretApplied(secretDraft)
              }}
            >
              <span className="text-white/50">Host password</span>
              <input
                type="password"
                value={secretDraft}
                onChange={(e) => setSecretDraft(e.target.value)}
                placeholder="if SERVER sets HOST_SECRET"
                className="w-52 max-w-full rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-white"
                autoComplete="off"
              />
              <NeonButton variant="blue" size="small" type="submit">
                Apply & reconnect
              </NeonButton>
            </form>
          ) : (
            <p className="mt-3 border-t border-white/10 pt-3 text-xs text-emerald-200/85">
              Using bundled <code className="rounded bg-white/10 px-1 text-white/90">VITE_HOST_SECRET</code>.
            </p>
          )}

          <details className="mt-4 border-t border-white/10 pt-3 text-left text-xs text-white/50">
            <summary className="cursor-pointer select-none text-white/60 hover:text-white/75">
              How venue sync works
            </summary>
            <p className="mt-2 leading-relaxed">
              Actions you send from this panel apply venue-wide under <span className="font-mono text-white/65">{gameState.code}</span>
              {' — '}questions, blinds, dealing, timers, and round transitions fan out to every table. Numeric answers stay off public
              TVs until reveal / showdown.
            </p>
          </details>
        </motion.header>

        <nav
          className="mb-6 rounded-xl border border-white/10 bg-black/25 p-1 backdrop-blur-sm"
          role="tablist"
          aria-label="Host sections"
        >
          <div className="flex flex-wrap gap-1">
            {HOST_TABS.map((t) => {
              const active = hostTab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={t.hint}
                  className={`min-h-[48px] flex-1 rounded-lg px-3 py-3 text-center text-base font-semibold transition-colors sm:flex-none sm:text-left sm:min-w-[9rem] ${
                    active
                      ? 'bg-white/14 text-white shadow-inner ring-1 ring-casino-emerald/35'
                      : 'text-white/55 hover:bg-white/[0.06] hover:text-white/90'
                  }`}
                  onClick={() => setHostTab(t.id)}
                >
                  <span className="block leading-snug">{t.label}</span>
                  {active ? (
                    <span className="mt-0.5 block text-[10px] font-normal capitalize tracking-wide text-casino-emerald/85">
                      {t.hint}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </nav>

        {hostTab === 'content' && (
        <>
        <Card variant="glass" hover={false} className="mb-8 p-5 sm:p-6">
          <div className="mb-6 flex flex-col gap-1 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">Question bank</h2>
              <p className="mt-1 max-w-2xl text-base text-white/52">
                Venue <span className="font-mono text-white/65">{gameState.code}</span>. Edit during prep; cue questions from{' '}
                <strong className="text-white/75">Run show</strong> (Random / setlist / <strong className="text-white/75">To tables</strong>).
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <input
                ref={importFileRef}
                type="file"
                accept=".json,.csv,application/json,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  const input = e.target
                  const f = input.files?.[0]
                  input.value = ''
                  if (!f) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    try {
                      const txt = String(reader.result ?? '')
                      const lower = f.name.toLowerCase()
                      const rows = lower.endsWith('.csv')
                        ? parseQuestionsCsv(txt)
                        : parseQuestionsJson(txt)
                      questionBankImportRows(rows, importReplaceRef.current)
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : String(err)
                      setToastMessage(`Import failed: ${msg}`)
                      setTimeout(() => setToastMessage(null), 4500)
                    }
                  }
                  reader.readAsText(f)
                }}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <NeonButton
                  variant="gold"
                  size="small"
                  type="button"
                  onClick={() => {
                    importReplaceRef.current = false
                    importFileRef.current?.click()
                  }}
                >
                  Import append
                </NeonButton>
                <NeonButton
                  variant="red"
                  size="small"
                  type="button"
                  onClick={() => {
                    importReplaceRef.current = true
                    importFileRef.current?.click()
                  }}
                >
                  Import replace bank
                </NeonButton>
                <NeonButton variant="purple" size="small" type="button" onClick={() => questionBankRestoreSamples()}>
                  Restore starter pack
                </NeonButton>
              </div>
              <span className="text-[11px] text-white/45 text-right max-w-xs">
                Saved automatically to the SQLite file <span className="text-white/60">venue-libraries.sqlite</span> under{' '}
                <span className="text-white/60">apps/server/data/</span> (optional env{' '}
                <span className="font-mono text-white/60">VENUE_DATABASE_PATH</span>). Stores questions + setlists. CSV: columns{' '}
                <span className="text-white/60">text</span>, <span className="text-white/60">answer</span>; optional{' '}
                <span className="text-white/60">category</span>, <span className="text-white/60">difficulty</span>. JSON: a top-level array, or any object that has a{' '}
                <span className="text-white/60">questions</span> array.
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveBankQuestion} className="mb-6 rounded-xl border border-white/15 bg-black/25 p-4 space-y-3">
            <div className="text-base font-bold text-white/90">{editingBankId ? 'Edit question' : 'Add question'}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block md:col-span-2 text-sm text-white/80">
                Prompt
                <textarea
                  value={qbText}
                  onChange={e => setQbText(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                  placeholder="Trivia prompt with a numeric correct answer…"
                />
              </label>
              <label className="block text-base text-white/80">
                Correct answer (number)
                <input
                  type="number"
                  value={qbAnswer}
                  onChange={e => setQbAnswer(e.target.value)}
                  step="any"
                  className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                />
              </label>
              <label className="block text-base text-white/80">
                Category (optional)
                <input
                  type="text"
                  value={qbCategory}
                  onChange={e => setQbCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                />
              </label>
              <label className="block text-base text-white/80 md:col-span-2">
                Difficulty (1–5, optional)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={qbDifficulty}
                  onChange={e => setQbDifficulty(e.target.value)}
                  placeholder="blank"
                  className="mt-1 w-full max-w-[200px] rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <NeonButton variant="emerald" size="small" type="submit">
                {editingBankId ? 'Save changes' : 'Add to bank'}
              </NeonButton>
              {editingBankId ? (
                <NeonButton variant="purple" size="small" type="button" onClick={() => resetQuestionDraft()}>
                  Cancel edit
                </NeonButton>
              ) : null}
            </div>
          </form>

          <div className="overflow-x-auto max-h-[min(480px,50vh)] overflow-y-auto rounded-lg border border-white/15">
            <table className="min-w-full text-left text-base text-white/90">
              <thead className="sticky top-0 bg-gray-950/95 z-10 text-white/60">
                <tr>
                  <th className="py-2 px-3 w-12">#</th>
                  <th className="py-2 px-3">Question</th>
                  <th className="py-2 px-3">Answer</th>
                  <th className="py-2 px-3">Cat</th>
                  <th className="py-2 px-3 w-10">Lv</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {questionBank.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-3 text-center text-white/50">
                      Bank is empty — add questions or restore the starter pack.
                    </td>
                  </tr>
                ) : (
                  questionBank.map((q, i) => (
                    <tr
                      key={q.id}
                      className={`border-t border-white/10 ${
                        gameState.round.question?.id === q.id ? 'bg-emerald-500/10' : ''
                      }`}
                    >
                      <td className="py-2 px-3 tabular-nums text-white/70">{i + 1}</td>
                      <td className="py-2 px-3 align-top max-w-md">{q.text}</td>
                      <td className="py-2 px-3 align-top whitespace-nowrap text-casino-gold">{q.answer}</td>
                      <td className="py-2 px-3 align-top text-white/60">{q.category ?? '—'}</td>
                      <td className="py-2 px-3 align-top text-white/60">{q.difficulty ?? '—'}</td>
                      <td className="py-2 px-3 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="text-white/65 hover:text-white mr-1 disabled:opacity-30"
                          disabled={i === 0}
                          onClick={() => questionBankMove(q.id, 'up')}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="text-white/65 hover:text-white mr-2 disabled:opacity-30"
                          disabled={i === questionBank.length - 1}
                          onClick={() => questionBankMove(q.id, 'down')}
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="text-casino-emerald hover:underline mr-2 text-xs uppercase font-bold"
                          onClick={() => handlePushBankQuestion(q.id)}
                        >
                          To tables
                        </button>
                        <button
                          type="button"
                          className="text-white/65 hover:text-white mr-2 text-xs"
                          onClick={() => startEditBankQuestion(q)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-red-400/90 hover:text-red-300 text-xs"
                          onClick={() => {
                            if (confirm('Remove this question from the bank?')) questionBankDelete(q.id)
                          }}
                        >
                          Del
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card variant="glass" hover={false} className="mb-8 p-5 sm:p-6">
          <div className="mb-6 border-b border-white/10 pb-5">
            <h2 className="text-2xl font-semibold tracking-tight text-white">Setlists (rundowns)</h2>
            <p className="mt-1 max-w-2xl text-base text-white/52">
              Ordered cues from your bank. Pick active rundown on <strong className="text-white/75">Run show</strong>, then{' '}
              <strong className="text-white/75">Next from setlist</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-end mb-4">
            <label className="block text-base text-white/80">
              New setlist name
              <input
                type="text"
                value={newSetlistName}
                onChange={(e) => setNewSetlistName(e.target.value)}
                placeholder="e.g. Round 1 — Pop culture"
                className="mt-1 block rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2 w-64 max-w-[80vw]"
              />
            </label>
            <NeonButton
              variant="emerald"
              size="small"
              type="button"
              onClick={() => {
                const n = newSetlistName.trim()
                if (!n) return
                setlistCreate(n)
                setNewSetlistName('')
              }}
            >
              Create empty setlist
            </NeonButton>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/15 bg-black/25 p-4 space-y-3">
              <label className="block text-base text-white/80">
                Edit setlist
                <select
                  className="mt-1 w-full rounded-lg border border-white/20 bg-zinc-950 px-3 py-2 text-white [color-scheme:dark]"
                  value={setlistDraftId ?? ''}
                  onChange={(e) => {
                    const id = e.target.value || null
                    setSetlistDraftId(id)
                    const sl = id ? setlists.find((s) => s.id === id) : undefined
                    setSetlistRenameDraft(sl?.name ?? '')
                  }}
                >
                  <option value="" className="bg-zinc-950 text-white">
                    Select a setlist…
                  </option>
                  {setlists.map((sl) => (
                    <option key={sl.id} value={sl.id} className="bg-zinc-950 text-white">
                      {sl.name} ({sl.questionIds.length} cues)
                    </option>
                  ))}
                </select>
              </label>
              {setlistDraftId ? (
                <>
                  <label className="block text-base text-white/80">
                    Rundown name
                    <input
                      type="text"
                      value={setlistRenameDraft}
                      onChange={(e) => setSetlistRenameDraft(e.target.value)}
                      onBlur={() => {
                        const sl = setlists.find((s) => s.id === setlistDraftId)
                        const next = setlistRenameDraft.trim()
                        if (!sl || !next || next === sl.name) return
                        setlistSave({ id: setlistDraftId, name: next })
                      }}
                      className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                    />
                  </label>
                  <NeonButton
                    variant="red"
                    size="small"
                    type="button"
                    onClick={() => {
                      if (
                        !confirm(
                          'Delete this setlist? It will be removed from the rundown picker.'
                        )
                      )
                        return
                      setlistDelete(setlistDraftId)
                      setSetlistDraftId(null)
                      setSetlistRenameDraft('')
                    }}
                  >
                    Delete setlist
                  </NeonButton>
                </>
              ) : null}
            </div>
            <div className="rounded-xl border border-white/15 bg-black/25 p-4 min-h-[120px]">
              {!setlistDraftId ? (
                <p className="text-sm text-white/50">Select a setlist to arrange its questions.</p>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm font-bold text-white/90">Question order</div>
                  <select
                    className="w-full rounded-lg border border-white/20 bg-zinc-950 px-3 py-2 text-sm text-white [color-scheme:dark]"
                    value={addToSetlistChoice}
                    onChange={(e) => {
                      const v = e.target.value
                      if (!v || !setlistDraftId) return
                      appendQuestionToSetlist(setlistDraftId, v)
                      setAddToSetlistChoice('')
                    }}
                  >
                    <option value="" className="bg-zinc-950 text-white">
                      + Add from bank…
                    </option>
                    {questionBank
                      .filter((q) => draftSetlist && !draftSetlist.questionIds.includes(q.id))
                      .map((q) => (
                        <option key={q.id} value={q.id} className="bg-zinc-950 text-white">
                          {q.text.length > 70 ? `${q.text.slice(0, 70)}…` : q.text}
                        </option>
                      ))}
                  </select>
                  <ul className="space-y-2 max-h-[min(320px,40vh)] overflow-y-auto">
                    {!draftSetlist ? null : draftSetlist.questionIds.length === 0 ? (
                      <li className="text-xs text-white/45">
                        No questions yet — append from the bank above.
                      </li>
                    ) : (
                      draftSetlist.questionIds.map((qid, i) => {
                        const qRow = questionBank.find((b) => b.id === qid)
                        const label = qRow ? qRow.text : `(missing bank id: ${qid})`
                        const sid = setlistDraftId!
                        return (
                          <li
                            key={`${sid}:${i}:${qid}`}
                            className="rounded-lg border border-white/12 bg-black/30 px-2 py-2 text-sm text-white/90 flex gap-2 items-start justify-between"
                          >
                            <span className="min-w-0">
                              <span className="text-white/40 tabular-nums mr-2">{i + 1}.</span>
                              {label}
                            </span>
                            <span className="flex shrink-0 gap-1 items-center whitespace-nowrap">
                              <button
                                type="button"
                                disabled={i === 0}
                                className="text-white/55 hover:text-white disabled:opacity-25"
                                title="Move earlier"
                                onClick={() => moveSetlistQuestion(sid, i, 'up')}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={i >= draftSetlist.questionIds.length - 1}
                                className="text-white/55 hover:text-white disabled:opacity-25"
                                title="Move later"
                                onClick={() => moveSetlistQuestion(sid, i, 'down')}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                className="text-red-400/90 hover:text-red-300 text-xs"
                                onClick={() => removeSetlistQuestion(sid, i)}
                              >
                                Remove
                              </button>
                            </span>
                          </li>
                        )
                      })
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
        </>
        )}

        {hostTab === 'live' && (
        <>
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(272px,340px)_1fr] lg:items-start">
          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <Card variant="glass" hover={false} className="p-6">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-white/42">Room monitor</h2>
              <div className="space-y-4 text-base">
                <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                  <span className="text-white/60">Phase</span>
                  <span className="font-semibold text-white/90">{HOST_PHASE_LABEL[gameState.phase]}</span>
                </div>
                <JackpotDisplay amount={gameState.round.pot} variant="control" />
                {gameState.round.question && (
                  <div>
                    <div className="text-xs font-semibold tracking-wide text-white/50">Current question</div>
                    <div className="mt-1 text-base font-semibold leading-snug text-casino-gold">{gameState.round.question.text}</div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/60">Players</span>
                  <span className="text-lg font-bold text-casino-emerald">
                    {gameState.players.length}
                    {virtualSeatCount > 0 ? (
                      <span className="text-sm font-normal text-amber-200/90"> ({virtualSeatCount} CPU)</span>
                    ) : null}
                  </span>
                </div>
                {gameState.phase === 'betting' && (
                  <div>
                    <div className="text-xs font-semibold tracking-wide text-white/50">Action on</div>
                    <div className="mt-1 text-lg font-extrabold text-casino-gold">
                      {(() => {
                        const idx = (gameState.round as { currentPlayerIndex?: number }).currentPlayerIndex
                        const p = typeof idx === 'number' ? gameState.players[idx] : undefined
                        return p ? hostPlayerLabel(p.name) : '—'
                      })()}
                    </div>
                  </div>
                )}
                {gameState.phase === 'answering' && (
                  <div>
                    <div className="text-xs font-semibold tracking-wide text-white/50">Answering time</div>
                    <div className="mt-1 text-2xl font-extrabold tabular-nums text-casino-gold">
                      {Math.max(0, Math.ceil(((gameState.round.answerDeadline ?? 0) - Date.now()) / 1000))}s
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-5 border-t border-white/10 pt-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-white/42">At this table</div>
                <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                  {gameState.players.length === 0 ? (
                    <span className="text-sm text-white/50">No one seated yet.</span>
                  ) : (
                    gameState.players.map((player) => (
                      <span
                        key={player.id}
                        className="rounded-full border border-emerald-400/35 bg-black/35 px-3 py-1.5 text-sm font-semibold text-emerald-100"
                      >
                        {hostPlayerLabel(player.name)}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </aside>
          <div className="min-w-0">
        <Card variant="glass" hover={false} className="p-6 sm:p-8">
            <div className="mb-6 flex flex-col gap-2 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Run show</h2>
                <p className="mt-2 max-w-2xl text-base text-white/52">Lobby, cues, deals, reveal — monitor stays beside you on wide screens.</p>
              </div>
            </div>

            <details className="group mb-6 rounded-xl border border-white/10 bg-black/25 open:border-white/[0.14] [&_summary::-webkit-details-marker]:hidden">
              <summary className="cursor-pointer list-none px-4 py-3 text-base font-medium text-white/75 hover:bg-white/[0.04] hover:text-white/88 rounded-xl">
                Suggested round order
                <span className="ml-2 inline-block translate-y-px text-white/35 transition-transform group-open:rotate-180">▼</span>
              </summary>
              <ol className="border-t border-white/10 px-4 py-4 text-base leading-relaxed text-white/62">
                <li className="mb-2">
                  Lobby / auto-assign · then <strong className="text-white/85">Assign from lobby</strong> when pooled.
                </li>
                <li className="mb-2">
                  <strong className="text-white/85">Start Game</strong> → question via <strong className="text-white/85">Random</strong>, bank row{' '}
                  <strong className="text-white/85">To tables</strong>, or setlist <strong className="text-white/85">Next from setlist</strong> →{' '}
                  <strong className="text-white/85">Deal Initial Cards</strong>.
                </li>
                <li className="mb-2">Wager round 1 → <strong className="text-white/85">Close Betting</strong>.</li>
                <li className="mb-2">
                  <strong className="text-white/85">Deal Community Cards</strong> · wager round 2 → close again →{' '}
                  <strong className="text-white/85">Start Answering</strong> → <strong className="text-white/85">Reveal Answer</strong> if needed.
                </li>
                <li>
                  <strong className="text-white/85">End Round</strong> clears to lobby · <strong className="text-white/85">Start Game</strong> for the next cycle.
                </li>
              </ol>
            </details>

            <div className="space-y-10">
              <section aria-labelledby="live-lobby-heading" className="space-y-4">
                <h3 id="live-lobby-heading" className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">
                  Lobby &amp; seating
                </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NeonButton
                variant="emerald"
                size="large"
                onClick={handleStartGame}
                disabled={gameState.phase !== 'lobby'}
                className="w-full min-h-[52px]"
              >
                Start Game
              </NeonButton>

              <NeonButton
                variant="blue"
                size="large"
                onClick={() => assignTablesFromLobby()}
                disabled={
                  gameState.phase !== 'lobby' ||
                  (gameState.tableId ?? '') !== LOBBY_TABLE_ID ||
                  gameState.players.length === 0
                }
                className="w-full min-h-[52px]"
              >
                Assign from lobby (random seats)
              </NeonButton>
              </div>
              {gameState.phase === 'lobby' && (gameState.tableId ?? '') === LOBBY_TABLE_ID && gameState.players.length === 0 ? (
                <p className="text-sm text-white/58">Waiting for players to join the lobby…</p>
              ) : null}
              {gameState.phase === 'lobby' && (gameState.tableId ?? '') === LOBBY_TABLE_ID && gameState.players.length > 0 ? (
                <div className="rounded-lg border border-emerald-400/25 bg-emerald-950/20 p-4">
                  <div className="text-base font-bold text-casino-emerald mb-2">
                    In lobby ({gameState.players.length})
                  </div>
                  <ul className="flex flex-wrap gap-2" aria-label="Players in lobby">
                    {gameState.players.map((p) => (
                      <li
                        key={p.id}
                        className="rounded-full border border-emerald-400/40 bg-black/35 px-3 py-1.5 text-base font-semibold text-emerald-100"
                      >
                        {hostPlayerLabel(p.name)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              </section>

              <section aria-labelledby="live-questions-heading" className="space-y-4">
                <h3 id="live-questions-heading" className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">
                  Questions &amp; rundown
                </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NeonButton
                variant="purple"
                size="large"
                onClick={handleSetRandomQuestion}
                disabled={gameState.phase !== 'lobby' && gameState.phase !== 'question'}
                className="w-full min-h-[52px]"
              >
                Random from bank
              </NeonButton>
              <NeonButton
                  variant="purple"
                  size="large"
                  onClick={() => nextQuestionFromSetlist()}
                  disabled={gameState.phase !== 'lobby' && gameState.phase !== 'question'}
                  className="w-full min-h-[52px]"
                >
                  Next from setlist
                </NeonButton>
              </div>
              <p className="text-sm text-white/55">
                Or push from <strong className="text-white/75">Content</strong> (<strong className="text-white/75">To tables</strong>), or build setlists in the same tab.
              </p>

              <div className="rounded-lg border border-casino-emerald/25 bg-black/25 p-4 space-y-3">
                <div className="text-base font-bold text-casino-emerald">Trivia rundown</div>
                <p className="text-sm text-white/58 leading-relaxed">
                  Select a setlist (from <strong className="text-white/75">Content</strong>) for a fixed cue order.{' '}
                  <strong className="text-white/75">None</strong> = use random / bank row pushes only.
                </p>
                <select
                  className="w-full rounded-lg border border-white/25 bg-zinc-950 px-3 py-2.5 text-base text-white [color-scheme:dark]"
                  value={activeSetlistId ?? ''}
                  onChange={(e) => selectTriviaSetlist(e.target.value || null)}
                >
                  <option value="" className="bg-zinc-950 text-white">
                    None (free play)
                  </option>
                  {setlists.map((sl) => (
                    <option key={sl.id} value={sl.id} className="bg-zinc-950 text-white">
                      {sl.name} ({sl.questionIds.length} cues)
                    </option>
                  ))}
                </select>
                {activeSetlistId ? (
                  <p className="text-sm text-white/55">
                    {(() => {
                      const sl = setlists.find((s) => s.id === activeSetlistId)
                      const n = sl?.questionIds.length ?? 0
                      if (!n) return 'This setlist is empty — add cues under Content.'
                      if (activeSetlistNextIndex >= n) return 'End of rundown — choose another list or clear.'
                      return `Next cue: ${activeSetlistNextIndex + 1} of ${n}`
                    })()}
                  </p>
                ) : null}
              </div>
              </section>

              <section aria-labelledby="live-table-heading" className="space-y-4">
                <h3 id="live-table-heading" className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">
                  Deals &amp; answering window
                </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-2">
              <NeonButton
                variant="blue"
                size="large"
                onClick={handleDealInitialCards}
                disabled={dealInitialBlocked}
                className="w-full min-h-[52px]"
                data-phase={gameState.phase}
                data-can-deal-initial={dealInitialBlocked ? 'no' : 'yes'}
              >
                Deal Initial Cards
              </NeonButton>
              {dealInitialHint && (
                <p className="text-sm text-amber-200/90">{dealInitialHint}</p>
              )}
              {triviaOptionalNote}
              {!dealInitialBlocked && !!gameState.round?.question && (
                <p className="text-sm text-white/52">
                  Players aren’t required—you can deal before anyone joins for a dry run.
                </p>
              )}
                </div>
                <div className="flex min-w-0 flex-col gap-2">
              <NeonButton
                variant="blue"
                size="large"
                onClick={handleDealCommunityCards}
                disabled={dealCommunityBlocked}
                className="w-full min-h-[52px]"
                data-betting-round={bettingRound}
                data-community-count={communityLen}
              >
                Deal Community Cards (board)
              </NeonButton>
              {dealCommunityHint && (
                <p className="text-sm text-amber-200/90">{dealCommunityHint}</p>
              )}
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
              <NeonButton
                variant="purple"
                size="large"
                onClick={handleStartAnswering}
                disabled={startAnswerBlocked}
                className="w-full min-h-[52px]"
              >
                Start Answering (45s)
              </NeonButton>
              {startAnswerBlocked && gameState.phase === 'betting' && (
                <p className="text-sm text-white/52">
                  Needs full board (5 community) and both wagering rounds closed.
                </p>
              )}
                </div>
              </div>

              </section>

            <details className="group mb-6 rounded-xl border border-white/10 bg-black/25 open:border-white/[0.14] [&_summary::-webkit-details-marker]:hidden">
              <summary
                id="live-admin-heading"
                className="cursor-pointer list-none px-4 py-3 text-base font-medium text-white/75 hover:bg-white/[0.04] hover:text-white/88 rounded-xl"
              >
                Wagering overrides &amp; blinds
                <span className="ml-2 inline-block translate-y-px text-white/35 transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="space-y-3 border-t border-white/10 px-4 py-4">
              {/* Admin betting controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <NeonButton
                  variant="gold"
                  size="large"
                  onClick={() => adminAdvanceTurn()}
                  disabled={gameState.phase !== 'betting' || !(gameState.round as any).isBettingOpen}
                  className="w-full"
                >
                  Force Next Player
                </NeonButton>
                <NeonButton
                  variant="red"
                  size="large"
                  onClick={() => adminCloseBetting()}
                  disabled={gameState.phase !== 'betting' || !(gameState.round as any).isBettingOpen}
                  className="w-full"
                >
                  Close Betting
                </NeonButton>
              </div>

              {/* Blinds controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                  <div className="text-base text-white/85 mb-1">Small Blind</div>
                  <input
                    type="number"
                    defaultValue={gameState.smallBlind}
                    id="sb-input"
                    className="w-full p-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white focus:border-casino-emerald focus:outline-none"
                  />
                </div>
                <div>
                  <div className="text-base text-white/85 mb-1">Big Blind</div>
                  <input
                    type="number"
                    defaultValue={gameState.bigBlind}
                    id="bb-input"
                    className="w-full p-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white focus:border-casino-emerald focus:outline-none"
                  />
                </div>
                <NeonButton
                  variant="emerald"
                  size="large"
                  onClick={() => {
                    const sb = Number((document.getElementById('sb-input') as HTMLInputElement)?.value || gameState.smallBlind)
                    const bb = Number((document.getElementById('bb-input') as HTMLInputElement)?.value || gameState.bigBlind)
                    adminSetBlinds(sb, bb)
                  }}
                >
                  Set Blinds
                </NeonButton>
              </div>
              </div>
            </details>

            <details className="group mb-6 rounded-xl border border-white/10 bg-black/25 open:border-white/[0.14] [&_summary::-webkit-details-marker]:hidden">
              <summary
                id="live-rehearsal-heading"
                className="cursor-pointer list-none px-4 py-3 text-base font-medium text-white/75 hover:bg-white/[0.04] hover:text-white/88 rounded-xl"
              >
                Rehearsal (CPU seats)
                <span className="ml-2 inline-block translate-y-px text-white/35 transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="border-t border-white/10 px-4 py-4">
                <div className="space-y-3 rounded-xl border border-amber-400/40 bg-black/25 p-4">
                <div className="text-base font-bold text-amber-200">Test mode — virtual seats</div>
                <p className="text-sm text-white/72 leading-relaxed">
                  Adds CPU players for rehearsals. During betting they check whenever legal, otherwise call (or fold as a last resort). During answering they compose the closest numeric permutation to the trivia answer using their hole and board digits.
                  {' '}Active virtual seats now:{' '}
                  <span className="font-semibold text-casino-gold">{virtualSeatCount}</span>.
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  <div
                    className="flex flex-wrap gap-1.5 rounded-lg border border-white/20 bg-black/40 p-1"
                    role="group"
                    aria-label="Number of virtual CPUs to add"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={atPlayerCap}
                        onClick={() => setVirtualAddCount(n)}
                        className={`min-w-[2.75rem] rounded-md px-2.5 py-2.5 text-center text-base font-bold tabular-nums transition-colors disabled:opacity-40 ${
                          virtualAddCount === n
                            ? 'border border-amber-400/60 bg-amber-500/25 text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                            : 'border border-transparent text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <NeonButton
                    variant="gold"
                    size="small"
                    disabled={atPlayerCap}
                    onClick={() => addVirtualPlayers(virtualAddCount)}
                  >
                    Add CPU seats
                  </NeonButton>
                  <NeonButton variant="purple" size="small" onClick={() => clearVirtualPlayers()}>
                    Clear all CPUs
                  </NeonButton>
                </div>
                {atPlayerCap && (
                  <p className="text-sm text-amber-200/85">Room is at max players — remove humans or CPUs before inviting more bots.</p>
                )}
                </div>
              </div>
              </details>

              <section aria-labelledby="live-wrap-heading" className="space-y-4">
                <h3 id="live-wrap-heading" className="text-sm font-bold uppercase tracking-[0.12em] text-white/45">
                  Reveal &amp; round reset
                </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NeonButton
                variant="gold"
                size="large"
                onClick={handleRevealAnswer}
                disabled={gameState.phase !== 'answering'}
                className="w-full min-h-[52px]"
              >
                Reveal Answer
              </NeonButton>

              <NeonButton
                variant="red"
                size="large"
                onClick={handleEndRound}
                disabled={gameState.phase !== 'showdown'}
                className="w-full min-h-[52px]"
              >
                End Round
              </NeonButton>

              <NeonButton
                variant="gold"
                size="large"
                onClick={handleNewGame}
                className="w-full min-h-[52px] sm:col-span-2"
              >
                🆕 New Game
              </NeonButton>
              </div>
              </section>
            </div>
          </Card>
          </div>
        </div>

        {gameState.phase === 'showdown' && (
          <Card variant="glass" hover={false} className="mb-8 p-5 sm:p-6">
            <h2 className="mb-5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Showdown</h2>
            <div className="text-center text-white mb-6">
              <div className="text-white/80">Correct Answer</div>
              <div className="text-4xl font-extrabold text-casino-gold">
                {gameState.round.question?.answer ?? '—'}
              </div>
            </div>

            {(() => {
              const correct = gameState.round.question?.answer
              const rows = gameState.players
                .map((p, seatIdx) => {
                  const hasAnswer = typeof p.submittedAnswer === 'number'
                  const distance = hasAnswer && typeof correct === 'number'
                    ? Math.abs((p.submittedAnswer as number) - correct)
                    : Infinity
                  return { player: p, seat: seatIdx + 1, hasAnswer, distance }
                })
                .sort((a, b) => a.distance - b.distance)

              const winnerId = rows.length && rows[0].distance !== Infinity ? rows[0].player.id : undefined

              return (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-white/90">
                    <thead>
                      <tr className="text-white/70">
                        <th className="py-2 px-3">Seat</th>
                        <th className="py-2 px-3">Player</th>
                        <th className="py-2 px-3">Submitted</th>
                        <th className="py-2 px-3">Distance</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ player, seat, hasAnswer, distance }) => (
                        <tr key={player.id} className={`${player.id === winnerId ? 'bg-white/10' : ''}`}>
                          <td className="py-2 px-3 tabular-nums text-white/80">{seat}</td>
                          <td className="py-2 px-3 font-bold text-casino-emerald">{hostPlayerLabel(player.name)}</td>
                          <td className="py-2 px-3">{hasAnswer ? player.submittedAnswer : '—'}</td>
                          <td className="py-2 px-3">{hasAnswer && typeof correct === 'number' ? distance : '—'}</td>
                          <td className="py-2 px-3">
                            {player.hasFolded ? (
                              <span className="text-red-400 font-semibold">FOLDED</span>
                            ) : hasAnswer ? (
                              player.id === winnerId ? <span className="text-casino-gold font-extrabold">WINNER</span> : <span className="text-white/70">Submitted</span>
                            ) : (
                              <span className="text-white/50">No Answer</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}

            <div className="mt-6 flex justify-center">
              <NeonButton variant="gold" onClick={handleEndRound}>End Round</NeonButton>
            </div>
          </Card>
        )}

        </>
        )}

        {hostTab === 'venue' && (
        <Card variant="glass" hover={false} className="mb-8 border border-white/15 p-5 sm:p-6">
          <h2 className="mb-3 text-2xl font-semibold tracking-tight text-white">Public TVs ({gameState.code})</h2>
          <p className="mb-6 max-w-3xl text-base leading-relaxed text-white/58">
            Read-only TVs on <code className="rounded bg-white/10 px-1.5 font-mono text-xs text-white/90">/display</code>{' '}
            show a short pairing code unless you bookmark{' '}
            <code className="rounded bg-white/10 px-1.5 font-mono text-xs text-white/90">/display?room={gameState.code}</code>.
            Use the compact <strong className="text-white/75">Pair TV</strong> row at the top of this host screen (header) to attach displays.
            Live pot, cues, and seat chips stay on{' '}
            <strong className="text-white/80">Run show</strong> — here you only steer wall layout. Buttons send every paired display on this venue to the{' '}
            <strong className="text-white/80">venue wall preview</strong> (eight mock felts){' '}
            or <strong className="text-white/80">full live felt</strong> for one table — nothing is tapped at the TV.
          </p>
          <div className="mx-auto mb-8 max-w-5xl rounded-xl bg-black/30 p-5">
            <div className="mb-8 text-[11px] font-bold uppercase tracking-[0.12em] text-white/38">Venue wall</div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <NeonButton
                variant="emerald"
                onClick={() => displaySetLayout({ layout: 'venueWall', focusTable: null })}
              >
                All 8 felts
              </NeonButton>
              <span className="mx-2 text-xs text-white/40">Spotlight (live felt)</span>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <NeonButton
                  key={n}
                  variant="gold"
                  className="!px-3 !py-2 min-w-[2.75rem]"
                  onClick={() => displaySetLayout({ layout: 'venueWall', focusTable: n })}
                >
                  {n}
                </NeonButton>
              ))}
            </div>
            <p className="mt-4 text-center text-[12px] leading-relaxed text-white/48">
              Spotlight numbers zoom that table’s <strong className="text-white/65">live</strong> game to the whole display — and{' '}
              <strong className="text-white/65">All 8 felts</strong> animates back to the overview grid. Bare{' '}
              <code className="rounded bg-white/10 px-1 font-mono text-[11px] text-white/80">/display?table=N</code> (N =
              1–8) is the same spotlight mode.
            </p>
          </div>
        </Card>
        )}

      </div>
    </div>
  )
}

export default HostApp

