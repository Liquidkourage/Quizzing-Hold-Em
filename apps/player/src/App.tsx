import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { connect, onState, onToast, fold, submitAnswer, check as checkAction, callBet as callAction, raiseBet as raiseAction, allIn as allInAction, useSocket, onSeated } from '@qhe/net'
import { Card, NeonButton, NumericPlayingCard, PokerChip } from '@qhe/ui'
import type { GameState } from '@qhe/core'
import { LOBBY_TABLE_ID } from '@qhe/core'

/** Hands are built from exactly five digit cards (holes + community); optional decimal in the player UI. */
const ANSWER_CARD_COUNT = 5

// Types for answer composition
interface ComposedAnswer {
  digits: (number | 'decimal')[]
  display: string
  value: number
}

function PlayerApp() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  /** When true (default), join venue lobby for random balancing; when false, use `tableId` manually. */
  const [autoSeat, setAutoSeat] = useState(() =>
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('manual') !== 'true' : true
  )
  const [tableId, setTableId] = useState(() =>
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('table') ??
          LOBBY_TABLE_ID
      : LOBBY_TABLE_ID
  )
  const [isJoined, setIsJoined] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  // Legacy bet amount (no longer used)
  // const [betAmount] = useState(20)
  const [raiseAmount, setRaiseAmount] = useState(0)
  const [composedAnswer, setComposedAnswer] = useState<ComposedAnswer>({ digits: [], display: '', value: 0 })
  const [selectedCards, setSelectedCards] = useState<Array<{type: 'hand' | 'community', index: number}>>([])
  const socket = useSocket()

  const joinTableId = autoSeat
    ? LOBBY_TABLE_ID
    : String(tableId || '').trim() || LOBBY_TABLE_ID

  const handleJoin = () => {
    if (!playerName || !roomCode) return
    if (!autoSeat && !String(tableId || '').trim()) return
    connect('player', playerName, roomCode, joinTableId)
    setIsJoined(true)

    return undefined
  }

  useEffect(() => {
    if (isJoined) {
      const unsubscribeState = onState(setGameState)
      const unsubscribeToast = onToast((message) => {
        setToastMessage(message)
        setTimeout(() => setToastMessage(null), 3000)
      })
      const unsubscribeSeated = onSeated(({ tableId: tid }) => {
        setToastMessage(`You're at table ${tid}`)
        setTimeout(() => setToastMessage(null), 4000)
      })

      return () => {
        unsubscribeState()
        unsubscribeToast()
        unsubscribeSeated()
      }
    }
  }, [isJoined])

  // Legacy free-form bet retained for compatibility (unused)

  const handleFold = () => {
    fold()
  }

  const handleCheck = () => {
    checkAction()
  }

  const handleCall = () => {
    callAction()
  }

  const handleRaise = () => {
    if (raiseAmount > 0) {
      raiseAction(raiseAmount)
    }
  }

  const handleAllIn = () => {
    allInAction()
  }

  // Answer composition functions
  const handleCardSelect = (type: 'hand' | 'community', index: number) => {
    // Check if this card is already selected
    const isAlreadySelected = selectedCards.some(sc => sc.type === type && sc.index === index)
    
    if (isAlreadySelected) {
      // Remove the card from the answer
      const cardToRemove = selectedCards.find(sc => sc.type === type && sc.index === index)
      if (cardToRemove) {
        const cardIndex = selectedCards.findIndex(sc => sc.type === type && sc.index === index)
        
        // Remove from selected cards
        setSelectedCards(prev => prev.filter((_, i) => i !== cardIndex))
        
        // Rebuild the answer without this card
        const newDigits = selectedCards.filter((_, i) => i !== cardIndex).map(sc => {
          if (sc.type === 'hand' && currentPlayer?.hand[sc.index]) {
            return currentPlayer.hand[sc.index].digit
          } else if (sc.type === 'community' && gameState?.round.communityCards[sc.index]) {
            return gameState.round.communityCards[sc.index].digit
          }
          return 0
        })
        
        const newDisplay = newDigits.map(d => d.toString()).join('')
        setComposedAnswer({
          digits: newDigits,
          display: newDisplay,
          value: parseFloat(newDisplay) || 0
        })
      }
      return
    }

    // Add the card to the answer
    if (selectedCards.length >= ANSWER_CARD_COUNT) {
      setToastMessage(`Your answer uses exactly ${ANSWER_CARD_COUNT} cards — tap a selected card to remove it, or clear.`)
      setTimeout(() => setToastMessage(null), 4000)
      return
    }
    if (type === 'hand' && currentPlayer?.hand[index]) {
      const digit = currentPlayer.hand[index].digit
      setComposedAnswer(prev => ({
        digits: [...prev.digits, digit],
        display: prev.display + digit.toString(),
        value: parseFloat(prev.display + digit.toString()) || 0
      }))
      setSelectedCards(prev => [...prev, { type, index }])
    } else if (type === 'community' && gameState?.round.communityCards[index]) {
      const digit = gameState.round.communityCards[index].digit
      setComposedAnswer(prev => ({
        digits: [...prev.digits, digit],
        display: prev.display + digit.toString(),
        value: parseFloat(prev.display + digit.toString()) || 0
      }))
      setSelectedCards(prev => [...prev, { type, index }])
    }
  }

  const handleAddDecimal = () => {
    const isDecimalSelected = composedAnswer.display.includes('.')
    
    if (isDecimalSelected) {
      // Remove the decimal from the answer
      const newDisplay = composedAnswer.display.replace('.', '')
      const newDigits = composedAnswer.digits.filter(d => d !== 'decimal')
      setComposedAnswer({
        digits: newDigits,
        display: newDisplay,
        value: parseFloat(newDisplay) || 0
      })
    } else {
      // Add the decimal to the answer
      setComposedAnswer(prev => ({
        digits: [...prev.digits, 'decimal'],
        display: prev.display + '.',
        value: parseFloat(prev.display + '.') || 0
      }))
    }
  }

  const handleClearAnswer = () => {
    setComposedAnswer({ digits: [], display: '', value: 0 })
    setSelectedCards([])
  }

  const handleSubmitAnswer = () => {
    if (selectedCards.length !== ANSWER_CARD_COUNT) {
      setToastMessage(`Select exactly ${ANSWER_CARD_COUNT} digit cards to build your answer.`)
      setTimeout(() => setToastMessage(null), 4000)
      return
    }
    const display = composedAnswer.display.trim()
    if (!display || !Number.isFinite(composedAnswer.value)) {
      setToastMessage('Compose a valid number from your five cards before submitting.')
      setTimeout(() => setToastMessage(null), 4000)
      return
    }
    submitAnswer(composedAnswer.value, (ack: { ok: boolean; message: string }) => {
      if (ack.ok) {
        setToastMessage(`Answer submitted: ${composedAnswer.display}`)
      } else {
        setToastMessage(`Error submitting answer: ${ack.message}`)
      }
    })
  }

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-casino-gradient relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 animate-pulse-slow"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-blue-500/10 animate-float"></div>
          <div className="absolute inset-0 bg-gradient-to-bl from-yellow-400/5 via-transparent to-purple-500/5 animate-glow"></div>
        </div>

        <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
          <Card variant="glass" className="w-full max-w-md p-6 sm:p-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-4xl font-black text-casino-emerald mb-6">🎰 JOIN GAME</h1>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full p-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/60 focus:border-casino-emerald focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Venue / room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full p-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/60 focus:border-casino-emerald focus:outline-none"
                />
                <label className="flex items-start gap-3 cursor-pointer text-left text-sm text-white/90">
                  <input
                    type="checkbox"
                    checked={autoSeat}
                    onChange={e => setAutoSeat(e.target.checked)}
                    className="mt-1 rounded border-white/30"
                  />
                  <span>Join lobby — host auto-assigns my table randomly when the round starts.</span>
                </label>
                {!autoSeat && (
                  <input
                    type="text"
                    placeholder="Table id (same as host, e.g. 1)"
                    value={tableId}
                    onChange={(e) => setTableId(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/60 focus:border-casino-emerald focus:outline-none"
                  />
                )}
                <NeonButton 
                  variant="emerald"
                  size="large"
                  className="w-full" 
                  onClick={handleJoin}
                  disabled={!playerName || !roomCode || (!autoSeat && !String(tableId || '').trim())}
                >
                  Join Game
                </NeonButton>
              </div>
            </motion.div>
          </Card>
        </div>
      </div>
    )
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

  const currentPlayer = gameState.players.find(p => p.name === playerName)
  const myId = socket?.id
  const myIndex = myId ? gameState.players.findIndex(p => p.id === myId) : gameState.players.findIndex(p => p.name === playerName)
  const showSeatNumbers = (gameState.tableId ?? '') !== LOBBY_TABLE_ID
  const isBettingPhase = gameState.phase === 'betting'
  const isBettingOpen = !!(gameState.round as any).isBettingOpen
  const isMyTurn = isBettingPhase && isBettingOpen && typeof (gameState.round as any).currentPlayerIndex === 'number' && (gameState.round as any).currentPlayerIndex === myIndex && currentPlayer && !currentPlayer.hasFolded
  const playerBets = (gameState.round as any).playerBets as Record<string, number> | undefined
  const myContribution = currentPlayer ? (playerBets?.[currentPlayer.id] || 0) : 0
  const currentBet = (gameState.round as any).currentBet || 0
  const toCall = Math.max(0, currentBet - myContribution)
  const canBet = isBettingPhase && currentPlayer && !currentPlayer.hasFolded
  const canCheck = isMyTurn && toCall === 0
  const canCall = isMyTurn && toCall > 0 && (currentPlayer?.bankroll || 0) > 0
  const minRaise = (gameState.bigBlind || 0)
  const canRaise = isMyTurn && (currentPlayer?.bankroll || 0) > toCall && raiseAmount >= minRaise && (toCall + raiseAmount) <= (currentPlayer?.bankroll || 0)
  const canAllIn = isMyTurn && (currentPlayer?.bankroll || 0) > 0
  const answerDeadline = gameState.round.answerDeadline ?? 0
  const remainingMs = Math.max(0, answerDeadline - Date.now())
  const remainingSec = Math.ceil(remainingMs / 1000)
  const wageringRound =
    (gameState.round as { bettingRound?: 1 | 2 }).bettingRound ?? 0
  const boardHiddenDuringBetting =
    gameState.phase === 'betting' &&
    wageringRound === 1 &&
    gameState.round.communityCards.length === 0

  /** Fixed bottom docks on phones; desktop keeps controls in-flow (lg+) */
  const needsMobileBetDock =
    gameState.phase === 'betting' && currentPlayer && !currentPlayer.hasFolded
  const needsMobileAnswerDock =
    gameState.phase === 'answering' && currentPlayer && !currentPlayer.hasFolded

  const mainScrollPaddingClass = [
    'relative z-10 px-3 pt-3 pb-6 sm:px-5 sm:pt-4 sm:pb-8 md:p-8',
    needsMobileBetDock ? 'max-lg:pb-[calc(17.5rem+env(safe-area-inset-bottom,0px))]' : '',
    needsMobileAnswerDock && !needsMobileBetDock
      ? 'max-lg:pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))]'
      : '',
  ]
    .filter(Boolean)
    .join(' ')

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
            className="fixed z-50 max-w-[min(92vw,22rem)] bg-glass-gradient backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-3 text-sm text-white sm:p-4 sm:text-base"
            style={{
              top: 'max(0.75rem, env(safe-area-inset-top, 0px))',
              right: 'max(0.75rem, env(safe-area-inset-right, 0px))',
            }}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={mainScrollPaddingClass}>
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 sm:mb-8"
        >
          <h1 className="mb-2 text-xl font-black tracking-tight text-casino-emerald sm:mb-2 sm:text-4xl sm:tracking-normal">
            <span className="sm:hidden">🎮 Playing</span>
            <span className="hidden sm:inline">🎮 PLAYER VIEW</span>
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-white sm:text-xl">
            <span>
              Venue <span className="text-casino-emerald font-bold">{gameState.code}</span>
            </span>
            <span className="text-white/35" aria-hidden>·</span>
            <span>
              Table <span className="text-casino-gold font-bold">{gameState.tableId ?? '1'}</span>
            </span>
            {showSeatNumbers && myIndex >= 0 && (
              <>
                <span className="text-white/35" aria-hidden>·</span>
                <span>
                  Seat <span className="text-casino-gold font-bold">{myIndex + 1}</span>
                </span>
              </>
            )}
            <span className="text-white/35 w-full sm:hidden" aria-hidden />
            <span className="sm:before:content-['·'] sm:before:px-2 sm:before:text-white/35">
              <span className="text-white/65 sm:hidden">You: </span>
              <span className="text-casino-gold font-semibold sm:font-bold truncate max-w-[10rem] sm:max-w-none inline-block align-bottom">
                {playerName}
              </span>
            </span>
          </div>
          <div className="mt-2 inline-block rounded-lg border border-white/20 bg-white/10 p-2 backdrop-blur-md sm:mt-4 sm:p-3">
            <div className="text-[11px] text-white/80 uppercase tracking-wide sm:text-sm">Phase</div>
            <div className="text-base font-bold capitalize text-casino-emerald sm:text-lg">{gameState.phase}</div>
            {gameState.phase === 'betting' && (
              <div className="mt-2 border-t border-white/10 pt-2 text-left text-[11px] text-white/75 sm:text-sm">
                Wager rnd{' '}
                <span className="font-bold text-casino-gold">{wageringRound || '—'}</span>
                {boardHiddenDuringBetting && (
                  <div className="mt-1 text-[10px] text-white/60 sm:text-xs">Flop not shown yet — board hidden until dealt.</div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {(gameState.tableId ?? '') === LOBBY_TABLE_ID && gameState.phase === 'lobby' && (
          <div className="mb-4 mx-auto max-w-xl rounded-xl border border-amber-400/50 bg-amber-950/35 px-3 py-3 text-center text-xs text-amber-100 sm:mb-6 sm:text-sm">
            Lobby pool — the host will randomly assign you to a table when they tap <strong>Assign from lobby</strong>.
          </div>
        )}

        {/* Game Info Section */}
        <Card variant="glass" className="mb-4 p-4 sm:mb-8 sm:p-8">
          <div className="mb-4 text-center sm:mb-6">
            <div className="text-base text-white/80 sm:text-lg">Pot</div>
            <div className="text-3xl font-bold text-casino-emerald sm:text-4xl">${gameState.round.pot}</div>
          </div>
          {gameState.round.question && (
            <div className="mx-auto max-w-2xl rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-md sm:p-6">
              <div className="mb-2 text-base text-white/80 sm:mb-3 sm:text-lg">Question</div>
              <div className="text-base font-bold text-casino-gold sm:text-lg">{gameState.round.question.text}</div>
              {gameState.phase === 'showdown' && (
                <div className="text-lg font-bold text-casino-emerald mt-3">
                  Answer: {gameState.round.question.answer}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Answer Composition Interface */}
        {(gameState.phase === 'betting' || gameState.phase === 'answering') && currentPlayer && !currentPlayer.hasFolded && (
          <Card variant="glass" className="mb-4 space-y-4 p-4 sm:mb-8 sm:p-8">
            <h2 className="mb-4 text-center text-2xl font-bold text-casino-emerald sm:mb-8 sm:text-3xl">
              Compose your answer
            </h2>
            {gameState.phase === 'betting' && (
              <p className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-center text-xs leading-snug text-white/60">
                Tap cards below anytime to rehearse — you can tap <strong className="text-white/85">Submit</strong> only
                once the host opens answering.
              </p>
            )}
            {gameState.phase === 'answering' && (
              <div className="mb-4 hidden text-center sm:block">
                <span className="mr-2 text-white/80">Time left:</span>
                <span className="text-2xl font-extrabold text-casino-gold">{remainingSec}s</span>
              </div>
            )}
            
            {/* Composed Answer Display */}
            <div className="mb-6 text-center sm:mb-8">
              <div className="mb-1 text-base text-white/80 sm:text-lg">Your answer</div>
              <div className="mb-3 text-xs text-casino-emerald/95 sm:text-sm">
                Tap exactly {ANSWER_CARD_COUNT} digit cards (holes and/or board); add a decimal if needed.
              </div>
              <div className="mb-2 text-xs text-white/70 sm:text-sm">
                Cards selected: {selectedCards.length}/{ANSWER_CARD_COUNT}
              </div>
              <div className="flex min-h-[5.5rem] items-center justify-center break-all rounded-lg border border-white/20 bg-white/10 px-2 py-4 text-4xl font-bold leading-tight text-casino-gold backdrop-blur-md sm:min-h-[7.5rem] sm:p-6 sm:text-6xl">
                {composedAnswer.display || '—'}
              </div>
            </div>

            {/* Available Cards */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-casino-emerald mb-4 text-center">Available Cards</h3>
              <div className="flex gap-3 justify-center flex-wrap">
                {/* Hole Cards Section */}
                <div className="flex flex-col items-center">
                  <div className="text-sm font-bold text-casino-gold mb-2">HOLE CARDS</div>
                  {/* Bracket line */}
                  <div className="relative w-full mb-2">
                    <div className="absolute left-0 right-0 h-0.5 bg-casino-gold"></div>
                    <div className="absolute left-0 top-0 w-0.5 h-2 bg-casino-gold"></div>
                    <div className="absolute right-0 top-0 w-0.5 h-2 bg-casino-gold"></div>
                  </div>
                  <div className="flex gap-3 items-end">
                    {currentPlayer.hand.map((card, i) => {
                      const isSelected = selectedCards.some(sc => sc.type === 'hand' && sc.index === i)
                      return (
                        <motion.div 
                          key={`hand-${i}`} 
                          className={`cursor-pointer ${isSelected ? 'ring-4 ring-casino-gold' : ''}`}
                          onClick={() => handleCardSelect('hand', i)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <NumericPlayingCard 
                            digit={card.digit} 
                            variant="cyan" 
                            style="neon" 
                            neonVariant={isSelected ? "pulse" : "matrix"} 
                            size="large" 
                          />
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                {/* Community Cards Section */}
                <div className="flex flex-col items-center">
                  <div className="text-sm font-bold text-casino-emerald mb-2">COMMUNITY CARDS</div>
                  {/* Bracket line */}
                  <div className="relative w-full mb-2">
                    <div className="absolute left-0 right-0 h-0.5 bg-casino-emerald"></div>
                    <div className="absolute left-0 top-0 w-0.5 h-2 bg-casino-emerald"></div>
                    <div className="absolute right-0 top-0 w-0.5 h-2 bg-casino-emerald"></div>
                  </div>
                  <div className="flex gap-3 items-end">
                    {boardHiddenDuringBetting ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={`board-hidden-${i}`} className="opacity-55 pointer-events-none">
                          <NumericPlayingCard
                            digit={0}
                            variant="cyan"
                            style="neon"
                            neonVariant="matrix"
                            size="large"
                            faceDown
                            backDesign="star"
                          />
                        </div>
                      ))
                    ) : (
                      gameState.round.communityCards.map((card, i) => {
                        const isSelected = selectedCards.some(sc => sc.type === 'community' && sc.index === i)
                        return (
                          <motion.div
                            key={`community-${i}`}
                            className={`cursor-pointer ${isSelected ? 'ring-4 ring-casino-gold' : ''}`}
                            onClick={() => handleCardSelect('community', i)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <NumericPlayingCard
                              digit={card.digit}
                              variant="cyan"
                              style="neon"
                              neonVariant={isSelected ? 'pulse' : 'matrix'}
                              size="large"
                            />
                          </motion.div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Decimal Point Card */}
                <div className="flex flex-col items-center">
                  <div className="text-sm font-bold text-purple-400 mb-2">DECIMAL</div>
                  {/* Bracket line */}
                  <div className="relative w-full mb-2">
                    <div className="absolute left-0 right-0 h-0.5 bg-purple-400"></div>
                    <div className="absolute left-0 top-0 w-0.5 h-2 bg-purple-400"></div>
                    <div className="absolute right-0 top-0 w-0.5 h-2 bg-purple-400"></div>
                  </div>
                  <motion.div 
                    className={`cursor-pointer ${composedAnswer.display.includes('.') ? 'ring-4 ring-casino-gold' : ''}`}
                    onClick={handleAddDecimal}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div 
                      style={{
                        width: '96px',
                        height: '144px',
                        background: 'rgba(0,0,0,0.9)',
                        border: '2px solid rgba(139,92,246,0.8)',
                        borderRadius: '12px',
                        position: 'relative',
                        overflow: 'hidden',
                        margin: '10px',
                        boxShadow: '0 0 20px rgba(139,92,246,0.8), 0 0 40px rgba(139,92,246,0.4), inset 0 0 20px rgba(139,92,246,0.2)',
                        animation: composedAnswer.display.includes('.') ? 'neon-pulse 2s ease-in-out infinite' : 'neon-matrix 4s ease-in-out infinite'
                      }}
                    >
                      <div 
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '48px',
                          fontWeight: 'bold',
                          color: 'rgba(139,92,246,0.8)',
                          zIndex: 10,
                          textShadow: '0 0 12px rgba(139,92,246,0.8)'
                        }}
                      >
                        <span style={{
                          background: 'rgba(0,0,0,0.8)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          boxShadow: '0 0 8px rgba(139,92,246,0.8)',
                          border: '1px solid rgba(139,92,246,0.8)',
                        }}>
                          .
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Action Buttons — duplicated in bottom dock while answering on phones */}
            <div
              className={`flex justify-center gap-4 ${needsMobileAnswerDock ? 'max-lg:hidden' : ''}`}
            >
              <NeonButton 
                variant="red"
                size="large"
                onClick={handleClearAnswer}
              >
                Clear Answer
              </NeonButton>
              <NeonButton 
                variant="emerald"
                size="large"
                onClick={handleSubmitAnswer}
                disabled={
                  gameState.phase !== 'answering' ||
                  selectedCards.length !== ANSWER_CARD_COUNT ||
                  !composedAnswer.display.trim()
                }
              >
                Submit Answer
              </NeonButton>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-8">
          {/* Player Info */}
          <Card variant="glass" className="p-4 sm:p-6">
            <h2 className="text-2xl font-bold text-casino-emerald mb-6 text-center">Player Info</h2>
            <div className="text-center mb-6">
              <div className="text-sm text-white/80">Bankroll</div>
              <div className="text-3xl font-bold text-casino-gold">${currentPlayer?.bankroll || 0}</div>
            </div>
            {currentPlayer?.hasFolded && (
              <div className="text-center">
                <div className="text-red-400 font-bold text-xl">FOLDED</div>
              </div>
            )}
          </Card>

          {/* Game Actions — wagering buttons use fixed dock on small screens while betting */}
          <Card variant="glass" className="p-4 sm:p-6">
            <h2 className="text-2xl font-bold text-casino-emerald mb-6 text-center">Game Actions</h2>
            <div className="space-y-4">
              {gameState.phase === 'betting' && (
                <div className="grid grid-cols-2 gap-3 text-white text-sm">
                  <div>Betting Round: <span className="font-bold">{(gameState.round as any).bettingRound ?? 1}</span></div>
                  <div>Your Bankroll: <span className="font-bold">${currentPlayer?.bankroll ?? 0}</span></div>
                  <div>Current Bet: <span className="font-bold">${currentBet}</span></div>
                  <div>Your Contribution: <span className="font-bold">${myContribution}</span></div>
                  <div>To Call: <span className="font-bold">${toCall}</span></div>
                  <div>Turn: <span className={`font-bold ${isMyTurn ? 'text-casino-gold' : ''}`}>{isMyTurn ? 'YOURS' : 'Other Player'}</span></div>
                </div>
              )}
              <div
                className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${gameState.phase === 'betting' ? 'hidden lg:grid' : 'grid'}`}
              >
                <NeonButton 
                  variant="emerald"
                  size="large"
                  className="w-full" 
                  onClick={handleCheck}
                  disabled={!canCheck}
                >
                  Check
                </NeonButton>
                <NeonButton 
                  variant="gold"
                  size="large"
                  className="w-full" 
                  onClick={handleCall}
                  disabled={!canCall}
                >
                  {toCall > 0 ? `Call $${toCall}` : 'Call'}
                </NeonButton>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm text-white/80">
                    Raise Amount
                    <span className="ml-2 text-white/50">(min ${minRaise})</span>
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={raiseAmount}
                      onChange={(e) => setRaiseAmount(Number(e.target.value))}
                      min={minRaise}
                      max={Math.max(0, (currentPlayer?.bankroll || 0) - toCall)}
                      placeholder={String(minRaise)}
                      className="w-full p-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white focus:border-casino-emerald focus:outline-none"
                    />
                    <NeonButton 
                      variant="purple"
                      size="large"
                      onClick={handleRaise}
                      disabled={!canRaise}
                    >
                      Raise
                    </NeonButton>
                  </div>
                </div>
                <NeonButton 
                  variant="red"
                  size="large"
                  className="w-full" 
                  onClick={handleFold}
                  disabled={!isMyTurn || !canBet}
                >
                  Fold
                </NeonButton>
                <NeonButton 
                  variant="blue"
                  size="large"
                  className="w-full" 
                  onClick={handleAllIn}
                  disabled={!canAllIn}
                >
                  All-In
                </NeonButton>
              </div>
            </div>
          </Card>
        </div>

        {/* Other Players */}
        <Card variant="glass" className="mt-6 p-4 sm:mt-8 sm:p-6">
          <h2 className="text-2xl font-bold text-casino-emerald mb-6 text-center">Other Players</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {gameState.players.filter(p => p.name !== playerName).map((player) => {
              const seatNum = gameState.players.findIndex(p => p.id === player.id) + 1
              return (
              <motion.div 
                key={player.id} 
                className="text-center p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {showSeatNumbers && seatNum > 0 && (
                  <div className="text-[11px] uppercase tracking-wide text-white/55 mb-0.5">Seat {seatNum}</div>
                )}
                <div className="text-casino-emerald font-bold text-lg">{player.name}</div>
                <div className="text-casino-gold text-xl font-bold">${player.bankroll}</div>
                {player.hasFolded && <div className="text-red-400 font-bold">FOLDED</div>}
                {player.hand.length > 0 && (
                  <div className="flex gap-1 justify-center mt-3">
                    {player.hand.map((card, i) => (
                      <NumericPlayingCard 
                        key={i} 
                        digit={card.digit} 
                        variant="purple" 
                        size="small" 
                        faceDown={gameState.phase !== 'showdown' || player.hasFolded}
                        backDesign="star"
                      />
                    ))}
                  </div>
                )}
              </motion.div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Mobile thumb-zone: wagering (betting only, max-lg) */}
      {needsMobileBetDock && currentPlayer && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-black/80 backdrop-blur-lg lg:hidden"
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
            paddingTop: '0.5rem',
          }}
        >
          <div className="mx-auto max-w-lg">
            <div className="mb-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-center text-[11px] text-white/80">
              <span>
                To call <span className="font-bold text-white">${toCall}</span>
              </span>
              <span className="text-white/35" aria-hidden>
                ·
              </span>
              <span>
                {isMyTurn ? (
                  <span className="font-bold text-casino-gold">Your turn</span>
                ) : (
                  <span>Waiting</span>
                )}
              </span>
              <span className="text-white/35" aria-hidden>
                ·
              </span>
              <span>
                Stack <span className="font-bold text-casino-gold">${currentPlayer.bankroll}</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NeonButton
                variant="emerald"
                size="normal"
                className="min-h-[2.75rem] w-full !px-3 !py-2.5 !text-sm"
                onClick={handleCheck}
                disabled={!canCheck}
              >
                Check
              </NeonButton>
              <NeonButton
                variant="gold"
                size="normal"
                className="min-h-[2.75rem] w-full !px-3 !py-2.5 !text-sm"
                onClick={handleCall}
                disabled={!canCall}
              >
                {toCall > 0 ? `Call $${toCall}` : 'Call'}
              </NeonButton>
            </div>
            <div className="mt-2 space-y-1.5">
              <label className="block text-[11px] text-white/75">
                Raise <span className="text-white/45">(min ${minRaise})</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(Number(e.target.value))}
                  min={minRaise}
                  max={Math.max(0, (currentPlayer.bankroll || 0) - toCall)}
                  placeholder={String(minRaise)}
                  className="min-h-[2.75rem] min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 p-2 text-sm text-white backdrop-blur-md focus:border-casino-emerald focus:outline-none"
                />
                <NeonButton
                  variant="purple"
                  size="normal"
                  className="min-h-[2.75rem] shrink-0 !px-4 !py-2.5 !text-sm"
                  onClick={handleRaise}
                  disabled={!canRaise}
                >
                  Raise
                </NeonButton>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <NeonButton
                variant="red"
                size="normal"
                className="min-h-[2.75rem] w-full !px-3 !py-2.5 !text-sm"
                onClick={handleFold}
                disabled={!isMyTurn || !canBet}
              >
                Fold
              </NeonButton>
              <NeonButton
                variant="blue"
                size="normal"
                className="min-h-[2.75rem] w-full !px-3 !py-2.5 !text-sm"
                onClick={handleAllIn}
                disabled={!canAllIn}
              >
                All-In
              </NeonButton>
            </div>
          </div>
        </div>
      )}

      {/* Mobile thumb-zone: answer actions (answering only, max-lg) */}
      {needsMobileAnswerDock && currentPlayer && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-black/80 backdrop-blur-lg lg:hidden"
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
            paddingTop: '0.75rem',
          }}
        >
          <div className="mx-auto max-w-lg space-y-3">
            <div className="text-center text-sm text-white/85">
              <span className="text-white/60">Time left: </span>
              <span className="text-xl font-extrabold tabular-nums text-casino-gold">{remainingSec}s</span>
            </div>
            <div className="flex justify-center gap-3">
              <NeonButton
                variant="red"
                size="normal"
                className="min-h-[2.75rem] flex-1 !px-4 !py-2.5 !text-sm"
                onClick={handleClearAnswer}
              >
                Clear
              </NeonButton>
              <NeonButton
                variant="emerald"
                size="normal"
                className="min-h-[2.75rem] flex-1 !px-4 !py-2.5 !text-sm"
                onClick={handleSubmitAnswer}
                disabled={
                  gameState.phase !== 'answering' ||
                  selectedCards.length !== ANSWER_CARD_COUNT ||
                  !composedAnswer.display.trim()
                }
              >
                Submit
              </NeonButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerApp
