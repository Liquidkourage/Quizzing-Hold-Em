import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { connect, onState, onToast, bet, fold } from '@qhe/net'
import { Card, NeonButton, JackpotDisplay, NumericPlayingCard, PokerChip } from '@qhe/ui'
import type { GameState } from '@qhe/core'

function PlayerApp() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [isJoined, setIsJoined] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState(20)

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Your Hand */}
          <Card variant="glass" className="p-6">
            <h2 className="text-2xl font-bold text-casino-emerald mb-6 text-center">Your Hand</h2>
            <div className="flex gap-3 justify-center mb-6">
              {currentPlayer?.hand.map((card, i) => (
                <motion.div 
                  key={i} 
                  initial={{ scale: 0, rotate: 180 }} 
                  animate={{ scale: 1, rotate: 0 }} 
                  transition={{ delay: i * 0.1 }}
                >
                  <NumericPlayingCard digit={card.digit} variant="cyan" style="neon" neonVariant="matrix" size="large" />
                </motion.div>
              ))}
            </div>
            <div className="text-center">
              <div className="text-sm text-white/80">Bankroll</div>
              <div className="text-3xl font-bold text-casino-gold">${currentPlayer?.bankroll || 0}</div>
            </div>
            {currentPlayer?.hasFolded && (
              <div className="mt-4 text-center">
                <div className="text-red-400 font-bold text-xl">FOLDED</div>
              </div>
            )}
          </Card>

          {/* Community Cards */}
          <Card variant="glass" className="p-6">
            <h2 className="text-2xl font-bold text-casino-emerald mb-6 text-center">Community Cards</h2>
            <div className="flex gap-3 justify-center mb-6">
              {gameState.round.communityCards.map((card, i) => (
                <motion.div 
                  key={i} 
                  initial={{ scale: 0, rotate: 180 }} 
                  animate={{ scale: 1, rotate: 0 }} 
                  transition={{ delay: i * 0.1 }}
                >
                  <NumericPlayingCard digit={card.digit} variant="cyan" style="neon" neonVariant="matrix" size="large" />
                </motion.div>
              ))}
            </div>
            <div className="text-center mb-4">
              <div className="text-sm text-white/80">Pot</div>
              <div className="text-3xl font-bold text-casino-emerald">${gameState.round.pot}</div>
            </div>
            {gameState.round.question && (
              <div className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
                <div className="text-sm text-white/80 mb-2">Question</div>
                <div className="text-sm text-casino-gold font-bold">{gameState.round.question.text}</div>
                {gameState.phase === 'showdown' && (
                  <div className="text-sm font-bold text-casino-emerald mt-2">
                    Answer: {gameState.round.question.answer}
                  </div>
                )}
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

        {/* Jackpot Display */}
        <div className="mt-8">
          <JackpotDisplay amount={gameState.round.pot} />
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
