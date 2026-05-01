import { useEffect, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, NeonButton, JackpotDisplay, PokerChip } from '@qhe/ui'
import {
  connect,
  onState,
  onToast,
  onQuestionBank,
  useSocket,
  startAnswering,
  adminAdvanceTurn,
  adminCloseBetting,
  adminSetBlinds,
  addVirtualPlayers,
  clearVirtualPlayers,
  assignTablesFromLobby,
  setQuestion as pushQuestionToVenue,
  questionBankAdd,
  questionBankUpdate,
  questionBankDelete,
  questionBankMove,
  questionBankRestoreSamples,
} from '@qhe/net'
import type { GameState, Question } from '@qhe/core'
import { LOBBY_TABLE_ID } from '@qhe/core'

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
  const [qbText, setQbText] = useState('')
  const [qbAnswer, setQbAnswer] = useState('')
  const [qbCategory, setQbCategory] = useState('')
  const [qbDifficulty, setQbDifficulty] = useState('')
  const [editingBankId, setEditingBankId] = useState<string | null>(null)

  useEffect(() => {
    const cleanup = connect('host', 'HOST01', hostVenueCode, hostTableId)
    return cleanup
  }, [hostVenueCode, hostTableId])

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
    const off = onQuestionBank((questions) => setQuestionBank(questions))
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
      <p className="-mt-2 text-xs text-amber-200/80">
        No trivia loaded yet—you can still deal to enter betting (use <strong>Random from bank</strong> or <strong>To tables</strong> in the Question bank).
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

  return (
    <div className="min-h-screen bg-casino-gradient relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 animate-pulse-slow"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-blue-500/10 animate-float"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-yellow-400/5 via-transparent to-purple-500/5 animate-glow"></div>
      </div>

      {/* Toast Messages */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="fixed top-4 right-4 z-50 bg-glass-gradient backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-4 text-white"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 p-8">
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl font-black text-casino-emerald mb-4">
            🎰 <PokerChip size="lg" className="mx-1" />
            {'Quizz\u2019em'}
          </h1>
          <div className="text-xl text-white">
            Venue: <span className="text-casino-emerald font-bold">{gameState.code}</span>
            <span className="text-white/50"> · </span>
            Table{' '}
            <span className="text-casino-gold font-bold">{gameState.tableId ?? '1'}</span>
          </div>
          <div className="text-lg text-white mt-2">
            Phase: <span className="text-casino-gold font-bold">{gameState.phase}</span>
          </div>
          <div className="flex flex-wrap gap-3 items-center justify-center text-sm text-white/85 mt-4">
            <label className="flex items-center gap-2">
              <span>Host binds to:</span>
              <select
                value={hostTableId}
                onChange={e => setHostTableId(e.target.value)}
                className="rounded-lg bg-black/40 border border-white/25 text-white px-3 py-2"
              >
                {[LOBBY_TABLE_ID, '1', '2', '3', '4', '5', '6', '7', '8'].map(v => (
                  <option key={v} value={v}>
                    {v === LOBBY_TABLE_ID ? 'Lobby (pool — auto-assign)' : `Table ${v}`}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-white/55 max-w-md">
              <strong className="text-white">Venue-wide sync:</strong> live question, blinds, dealing, timers, and round flow apply to every table under{' '}
              <span className="text-casino-gold">{gameState.code}</span>. Trivia wording is synced to tables; numeric answers remain host-only except on reveal/showdown per table.
            </span>
          </div>
        </motion.div>

        <Card variant="glass" className="mb-8 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-casino-emerald">Question bank</h2>
              <p className="text-sm text-white/65 mt-1 max-w-2xl">
                Ordered list for venue <strong className="text-white/90">{gameState.code}</strong>. Only you receive answers in this grid —{' '}
                tables get questions when you use Random or To tables.
              </p>
            </div>
            <NeonButton variant="purple" size="small" type="button" onClick={() => questionBankRestoreSamples()}>
              Restore starter pack
            </NeonButton>
          </div>

          <form onSubmit={handleSaveBankQuestion} className="mb-6 rounded-xl border border-white/15 bg-black/25 p-4 space-y-3">
            <div className="text-sm font-bold text-white/90">{editingBankId ? 'Edit question' : 'Add question'}</div>
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
              <label className="block text-sm text-white/80">
                Correct answer (number)
                <input
                  type="number"
                  value={qbAnswer}
                  onChange={e => setQbAnswer(e.target.value)}
                  step="any"
                  className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                />
              </label>
              <label className="block text-sm text-white/80">
                Category (optional)
                <input
                  type="text"
                  value={qbCategory}
                  onChange={e => setQbCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 text-white px-3 py-2"
                />
              </label>
              <label className="block text-sm text-white/80 md:col-span-2">
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
            <table className="min-w-full text-left text-sm text-white/90">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Game Controls */}
          <Card variant="glass" className="p-6">
            <h2 className="text-3xl font-bold text-casino-emerald mb-4 text-center">Game Controls</h2>
            <div className="mb-6 rounded-lg border border-casino-emerald/30 bg-black/20 p-4 text-left text-sm text-white/90">
              <div className="mb-2 font-bold text-casino-emerald">PoC — one full round</div>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>
                  Players join venue with <strong>auto-assign</strong> (lobby) or pick a numbered table manually. Use{' '}
                  <strong className="text-casino-gold">Assign from lobby</strong> once everyone is pooled — seats are randomized and sized from headcount.
                </li>
                <li><strong>Start Game</strong> → <strong>Random from bank</strong> or <strong>To tables</strong> on a row → <strong>Deal Initial Cards</strong> (hole cards only)</li>
                <li><strong>Wagering round 1:</strong> when ready → <strong>Close Betting</strong></li>
                <li><strong>Deal Community Cards</strong> (full five-card board) → <strong>Wagering round 2</strong></li>
                <li><strong>Close Betting</strong> again → <strong>Start Answering (45s)</strong> → <strong>Reveal Answer</strong> if needed</li>
                <li><strong>End Round</strong> → lobby; <strong>Start Game</strong> again for next round</li>
              </ol>
            </div>
            
            <div className="space-y-4">
              <NeonButton
                variant="emerald"
                size="large"
                onClick={handleStartGame}
                disabled={gameState.phase !== 'lobby'}
                className="w-full"
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
                className="w-full"
              >
                Assign from lobby (random seats)
              </NeonButton>
              {gameState.phase === 'lobby' && (gameState.tableId ?? '') === LOBBY_TABLE_ID && gameState.players.length === 0 ? (
                <p className="-mt-2 text-xs text-white/55">Waiting for players to join the lobby…</p>
              ) : null}

              <NeonButton
                variant="purple"
                size="large"
                onClick={handleSetRandomQuestion}
                disabled={gameState.phase !== 'lobby' && gameState.phase !== 'question'}
                className="w-full"
              >
                Random from bank
              </NeonButton>
              <p className="-mt-2 text-xs text-white/50">
                Or pick <strong className="text-white/70">To tables</strong> on a question in the bank for a chosen card.
              </p>

              <NeonButton
                variant="blue"
                size="large"
                onClick={handleDealInitialCards}
                disabled={dealInitialBlocked}
                className="w-full"
                data-phase={gameState.phase}
                data-can-deal-initial={dealInitialBlocked ? 'no' : 'yes'}
              >
                Deal Initial Cards
              </NeonButton>
              {dealInitialHint && (
                <p className="-mt-2 text-xs text-amber-200/90">{dealInitialHint}</p>
              )}
              {triviaOptionalNote}
              {!dealInitialBlocked && !!gameState.round?.question && (
                <p className="-mt-2 text-xs text-white/50">
                  Players aren’t required—you can deal before anyone joins for a dry run.
                </p>
              )}

              <NeonButton
                variant="blue"
                size="large"
                onClick={handleDealCommunityCards}
                disabled={dealCommunityBlocked}
                className="w-full"
                data-betting-round={bettingRound}
                data-community-count={communityLen}
              >
                Deal Community Cards (board)
              </NeonButton>
              {dealCommunityHint && (
                <p className="-mt-2 text-xs text-amber-200/90">{dealCommunityHint}</p>
              )}

              <NeonButton
                variant="purple"
                size="large"
                onClick={handleStartAnswering}
                disabled={startAnswerBlocked}
                className="w-full"
              >
                Start Answering (45s)
              </NeonButton>
              {startAnswerBlocked && gameState.phase === 'betting' && (
                <p className="-mt-2 text-xs text-white/50">
                  Needs full board (5 community) and both wagering rounds closed.
                </p>
              )}

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
                  <div className="text-sm text-white/80 mb-1">Small Blind</div>
                  <input
                    type="number"
                    defaultValue={gameState.smallBlind}
                    id="sb-input"
                    className="w-full p-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white focus:border-casino-emerald focus:outline-none"
                  />
                </div>
                <div>
                  <div className="text-sm text-white/80 mb-1">Big Blind</div>
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

              <div className="rounded-xl border border-amber-400/40 bg-black/25 p-4 space-y-3">
                <div className="text-sm font-bold text-amber-200">Test mode — virtual seats</div>
                <p className="text-xs text-white/70 leading-relaxed">
                  Adds CPU players for rehearsals. During betting they check whenever legal, otherwise call (or fold as a last resort). During answering they compose the closest numeric permutation to the trivia answer using their hole and board digits.
                  {' '}Active virtual seats now:{' '}
                  <span className="font-semibold text-casino-gold">{virtualSeatCount}</span>.
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={virtualAddCount}
                    onChange={e => setVirtualAddCount(Number(e.target.value) || 1)}
                    disabled={atPlayerCap}
                    className="rounded-lg bg-white/10 border border-white/25 text-white px-3 py-2 text-sm disabled:opacity-40"
                  >
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
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
                  <p className="text-xs text-amber-200/85">Room is at max players — remove humans or CPUs before inviting more bots.</p>
                )}
              </div>

              <NeonButton
                variant="gold"
                size="large"
                onClick={handleRevealAnswer}
                disabled={gameState.phase !== 'answering'}
                className="w-full"
              >
                Reveal Answer
              </NeonButton>

              <NeonButton
                variant="red"
                size="large"
                onClick={handleEndRound}
                disabled={gameState.phase !== 'showdown'}
                className="w-full"
              >
                End Round
              </NeonButton>

              <NeonButton
                variant="gold"
                size="large"
                onClick={handleNewGame}
                className="w-full"
              >
                🆕 New Game
              </NeonButton>
            </div>
          </Card>

          {/* Game Status */}
          <Card variant="glass" className="p-6">
            <h2 className="text-3xl font-bold text-casino-emerald mb-6 text-center">Game Status</h2>
            
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-lg text-white">Current Pot:</div>
                <span className="text-casino-emerald font-bold text-xl">${gameState.round.pot}</span>
              </div>

              {gameState.round.question && (
                <div className="text-center">
                  <div className="text-lg text-white">Current Question:</div>
                  <div className="text-casino-gold font-bold">{gameState.round.question.text}</div>
                </div>
              )}

              <div className="text-center">
                <div className="text-lg text-white">Players:</div>
                <span className="text-casino-emerald font-bold">
                  {gameState.players.length}
                  {virtualSeatCount > 0 ? (
                    <span className="text-sm font-normal text-amber-200/90"> ({virtualSeatCount} CPU)</span>
                  ) : null}
                </span>
              </div>
              {gameState.phase === 'betting' && (
                <div className="text-center">
                  <div className="text-lg text-white">Current Turn:</div>
                  <span className="text-casino-gold font-extrabold">
                    {(() => {
                      const idx = (gameState.round as any).currentPlayerIndex as number | undefined
                      const p = typeof idx === 'number' ? gameState.players[idx] : undefined
                      return p ? p.name : '—'
                    })()}
                  </span>
                </div>
              )}
              {gameState.phase === 'answering' && (
                <div className="text-center">
                  <div className="text-lg text-white">Answering Time Left:</div>
                  <span className="text-casino-gold font-extrabold text-2xl">
                    {Math.max(0, Math.ceil(((gameState.round.answerDeadline ?? 0) - Date.now()) / 1000))}s
                  </span>
                </div>
              )}
            </div>

            <div className="mt-8">
              <JackpotDisplay amount={gameState.round.pot} />
            </div>
          </Card>
        </div>

        {/* Showdown Results */}
        {gameState.phase === 'showdown' && (
          <Card variant="glass" className="mt-8 p-6">
            <h2 className="text-3xl font-bold text-casino-emerald mb-6 text-center">Showdown</h2>
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
                          <td className="py-2 px-3 font-bold text-casino-emerald">{player.name}</td>
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

        {/* Player List */}
        <Card variant="glass" className="mt-8 p-6">
          <h2 className="text-3xl font-bold text-casino-emerald mb-6 text-center">Players</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gameState.players.map((player, i) => (
              <div key={player.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4">
                <div className="text-xs uppercase tracking-wide text-white/50 mb-1">Seat {i + 1}</div>
                <div className="text-lg font-bold text-casino-emerald">{player.name}</div>
                <div className="text-white">
                  Bankroll: <span className="text-casino-gold font-bold">${player.bankroll}</span>
                </div>
                <div className="text-white">
                  Cards: <span className="text-casino-purple font-bold">{player.hand.length}</span>
                </div>
                {player.hasFolded && (
                  <div className="text-red-400 font-bold">FOLDED</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default HostApp

