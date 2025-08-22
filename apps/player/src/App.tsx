import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { connect, onState, onToast, bet, fold } from '@qhe/net'
import { Card, NeonButton, NumericPlayingCard, PokerChip } from '@qhe/ui'
import type { GameState } from '@qhe/core'

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
  const [isJoined, setIsJoined] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState(20)
  const [composedAnswer, setComposedAnswer] = useState<ComposedAnswer>({ digits: [], display: '', value: 0 })
  const [selectedCards, setSelectedCards] = useState<Array<{type: 'hand' | 'community', index: number}>>([])

  const handleJoin = () => {
    if (!playerName || !roomCode) return
    const cleanup = connect('player', playerName, roomCode)
    setIsJoined(true)
    
    return cleanup
  }

  useEffect(() => {
    if (isJoined) {
      const unsubscribeState = onState(setGameState)
      const unsubscribeToast = onToast((message) => {
        setToastMessage(message)
        setTimeout(() => setToastMessage(null), 3000)
      })
      
      return () => {
        unsubscribeState()
        unsubscribeToast()
      }
    }
  }, [isJoined])

  const handleBet = () => {
    bet(betAmount)
  }

  const handleFold = () => {
    fold()
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
    setComposedAnswer(prev => ({
      digits: [...prev.digits, 'decimal'],
      display: prev.display + '.',
      value: parseFloat(prev.display + '.') || 0
    }))
  }

  const handleClearAnswer = () => {
    setComposedAnswer({ digits: [], display: '', value: 0 })
    setSelectedCards([])
  }

  const handleSubmitAnswer = () => {
    if (composedAnswer.value > 0) {
      // TODO: Submit answer to server
      console.log('Submitting answer:', composedAnswer.value)
      setToastMessage(`Answer submitted: ${composedAnswer.display}`)
    }
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

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <Card variant="glass" className="p-8 w-full max-w-md">
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
                  placeholder="Room Code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full p-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/60 focus:border-casino-emerald focus:outline-none"
                />
                <NeonButton 
                  variant="emerald"
                  size="large"
                  className="w-full" 
                  onClick={handleJoin}
                  disabled={!playerName || !roomCode}
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
            🎰 ALL <PokerChip size="lg" className="mx-1" /> INQUIZITION
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
  const canBet = gameState.phase === 'betting' && currentPlayer && !currentPlayer.hasFolded

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
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-black text-casino-emerald mb-4">🎮 PLAYER VIEW</h1>
          <div className="text-xl text-white">
            Room: <span className="text-casino-emerald font-bold">{roomCode}</span> | 
            Player: <span className="text-casino-gold font-bold">{playerName}</span>
          </div>
          <div className="mt-4 inline-block p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
            <div className="text-sm text-white/80">Game Phase</div>
            <div className="text-lg font-bold text-casino-emerald capitalize">{gameState.phase}</div>
          </div>
        </motion.div>

        {/* Game Info Section */}
        <Card variant="glass" className="mb-8 p-8">
          <div className="text-center mb-6">
            <div className="text-lg text-white/80">Pot</div>
            <div className="text-4xl font-bold text-casino-emerald">${gameState.round.pot}</div>
          </div>
          {gameState.round.question && (
            <div className="p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg max-w-2xl mx-auto">
              <div className="text-lg text-white/80 mb-3">Question</div>
              <div className="text-lg text-casino-gold font-bold">{gameState.round.question.text}</div>
              {gameState.phase === 'showdown' && (
                <div className="text-lg font-bold text-casino-emerald mt-3">
                  Answer: {gameState.round.question.answer}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Answer Composition Interface */}
        {gameState.phase === 'betting' && currentPlayer && !currentPlayer.hasFolded && (
          <Card variant="glass" className="mb-8 p-8">
            <h2 className="text-3xl font-bold text-casino-emerald mb-8 text-center">Compose Your Answer</h2>
            
            {/* Composed Answer Display */}
            <div className="text-center mb-8">
              <div className="text-lg text-white/80 mb-2">Your Answer</div>
              <div className="text-6xl font-bold text-casino-gold bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6 min-h-[120px] flex items-center justify-center">
                {composedAnswer.display || '0'}
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
                    {gameState.round.communityCards.map((card, i) => {
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
                            neonVariant={isSelected ? "pulse" : "matrix"} 
                            size="large" 
                          />
                        </motion.div>
                      )
                    })}
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
                        animation: 'neon-matrix 4s ease-in-out infinite'
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

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
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
                disabled={composedAnswer.value === 0}
              >
                Submit Answer
              </NeonButton>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Player Info */}
          <Card variant="glass" className="p-6">
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

          {/* Game Actions */}
          <Card variant="glass" className="p-6">
            <h2 className="text-2xl font-bold text-casino-emerald mb-6 text-center">Game Actions</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white/80">Bet Amount</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  min={0}
                  max={currentPlayer?.bankroll || 0}
                  className="w-full p-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white focus:border-casino-emerald focus:outline-none"
                />
              </div>
              <NeonButton 
                variant="emerald"
                size="large"
                className="w-full" 
                onClick={handleBet}
                disabled={!canBet || betAmount > (currentPlayer?.bankroll || 0)}
              >
                Bet ${betAmount}
              </NeonButton>
              <NeonButton 
                variant="red"
                size="large"
                className="w-full" 
                onClick={handleFold}
                disabled={!canBet}
              >
                Fold
              </NeonButton>
            </div>
          </Card>
        </div>

        {/* Other Players */}
        <Card variant="glass" className="mt-8 p-6">
          <h2 className="text-2xl font-bold text-casino-emerald mb-6 text-center">Other Players</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {gameState.players.filter(p => p.name !== playerName).map((player) => (
              <motion.div 
                key={player.id} 
                className="text-center p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
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
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default PlayerApp
