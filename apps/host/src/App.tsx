import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, NeonButton, JackpotDisplay, PokerChip } from '@qhe/ui'
import { connect, onState, onToast, useSocket } from '@qhe/net'
import type { GameState } from '@qhe/core'

function HostApp() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const socket = useSocket()

  useEffect(() => {
    const cleanup = connect('host', 'HOST01')
    return cleanup
  }, [])

  useEffect(() => {
    const unsubscribe = onState((newGameState) => {
      console.log('🎰 Host: State update received:', {
        phase: newGameState?.phase,
        question: newGameState?.round?.question?.text,
        questionId: newGameState?.round?.question?.id
      })
      setGameState(newGameState)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = onToast((message) => {
      setToastMessage(message)
      setTimeout(() => setToastMessage(null), 3000)
    })
    return unsubscribe
  }, [])

  const handleStartGame = () => {
    if (socket) {
      socket.emit('action', { type: 'startGame' })
    }
  }

  const handleSetQuestion = () => {
    console.log('🎰 Host: Set Question button clicked')
    // Immediate toast test
    setToastMessage('Set Question button clicked!')
    setTimeout(() => setToastMessage(null), 3000)
    
    if (socket) {
      console.log('🎰 Host: Emitting setQuestion action')
      socket.emit('action', { type: 'setQuestion' })
    } else {
      console.log('🎰 Host: No socket available')
    }
  }

  const handleDealInitialCards = () => {
    if (socket) {
      socket.emit('action', { type: 'dealInitialCards' })
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
            🎰 ALL <PokerChip size="lg" className="mx-1" /> INQUIZITION
          </h1>
          <div className="text-xl text-white">
            Room Code: <span className="text-casino-emerald font-bold">{gameState.code}</span>
          </div>
          <div className="text-lg text-white mt-2">
            Phase: <span className="text-casino-gold font-bold">{gameState.phase}</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Game Controls */}
          <Card variant="glass" className="p-6">
            <h2 className="text-3xl font-bold text-casino-emerald mb-6 text-center">Game Controls</h2>
            
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
                variant="purple"
                size="large"
                onClick={handleSetQuestion}
                disabled={gameState.phase !== 'lobby' && gameState.phase !== 'question'}
                className="w-full"
              >
                Set Question
              </NeonButton>

              <NeonButton
                variant="blue"
                size="large"
                onClick={handleDealInitialCards}
                disabled={gameState.phase !== 'question'}
                className="w-full"
              >
                Deal Initial Cards
              </NeonButton>

              <NeonButton
                variant="blue"
                size="large"
                onClick={handleDealCommunityCards}
                disabled={gameState.phase !== 'betting'}
                className="w-full"
              >
                Deal Community Cards
              </NeonButton>

              <NeonButton
                variant="gold"
                size="large"
                onClick={handleRevealAnswer}
                disabled={gameState.phase !== 'betting'}
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
                <span className="text-casino-emerald font-bold">{gameState.players.length}</span>
              </div>
            </div>

            <div className="mt-8">
              <JackpotDisplay amount={gameState.round.pot} />
            </div>
          </Card>
        </div>

        {/* Player List */}
        <Card variant="glass" className="mt-8 p-6">
          <h2 className="text-3xl font-bold text-casino-emerald mb-6 text-center">Players</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gameState.players.map((player) => (
              <div key={player.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4">
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

