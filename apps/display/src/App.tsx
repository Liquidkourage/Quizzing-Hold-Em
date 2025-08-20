import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NumericPlayingCard } from '@qhe/ui'
import { connect, onState, onToast } from '@qhe/net'
import type { GameState } from '@qhe/core'

function DisplayApp() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    const cleanup = connect('display', 'DISPLAY01')
    return cleanup
  }, [])

  useEffect(() => {
    const unsubscribe = onState(setGameState)
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = onToast((message) => {
      setToastMessage(message)
      setTimeout(() => setToastMessage(null), 3000)
    })
    return unsubscribe
  }, [])

  // TEMPORARY: Create mock game state with 8 players for demonstration
  const mockGameState: GameState = {
    code: 'ABC123',
    hostId: 'demo',
    createdAt: Date.now(),
    phase: 'betting',
    bigBlind: 20,
    smallBlind: 10,
    minPlayers: 2,
    maxPlayers: 8,
    players: [
      { id: '1', name: 'Alice', bankroll: 1200, hand: [{ digit: 7 }, { digit: 2 }], hasFolded: false, isAllIn: false },
      { id: '2', name: 'Bob', bankroll: 850, hand: [{ digit: 9 }, { digit: 4 }], hasFolded: false, isAllIn: false },
      { id: '3', name: 'Carol', bankroll: 1100, hand: [{ digit: 1 }, { digit: 8 }], hasFolded: false, isAllIn: false },
      { id: '4', name: 'Dave', bankroll: 950, hand: [{ digit: 3 }, { digit: 6 }], hasFolded: false, isAllIn: false },
      { id: '5', name: 'Eve', bankroll: 1350, hand: [{ digit: 5 }, { digit: 0 }], hasFolded: false, isAllIn: false },
      { id: '6', name: 'Frank', bankroll: 700, hand: [{ digit: 2 }, { digit: 9 }], hasFolded: false, isAllIn: false },
      { id: '7', name: 'Grace', bankroll: 1600, hand: [{ digit: 4 }, { digit: 7 }], hasFolded: false, isAllIn: false },
      { id: '8', name: 'Henry', bankroll: 900, hand: [{ digit: 8 }, { digit: 1 }], hasFolded: false, isAllIn: false },
    ],
    round: {
      roundId: 'demo1',
      pot: 2450,
      communityCards: [
        { digit: 3 },
        { digit: 7 },
        { digit: 9 },
        { digit: 2 },
        { digit: 5 }
      ],
      question: {
        id: 'q1',
        text: "What is the capital of France?",
        answer: 1
      },
      dealerIndex: 0
    }
  }

  // Use mock state if no real game state
  const displayGameState = gameState || mockGameState

  if (!displayGameState) {
    return (
      <div className="min-h-screen bg-casino-gradient flex items-center justify-center">
        <div className="text-center">
          <motion.h1 
            className="text-6xl font-black text-casino-emerald mb-8"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            🎰 QUIZZING HOLD-EM
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

  // Calculate player positions around the table (larger ring around table)
  const getPlayerPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2 // Start from top
    
    // Center position (table is centered)
    const centerX = 50
    const centerY = 50
    
    // Large radius to position players well outside the table
    let radiusX = 35 // Large horizontal radius
    let radiusY = 35 // Large vertical radius
    
    // For players at 3 and 9 o'clock positions, adjust horizontal positioning
    const normalizedAngle = angle + Math.PI / 2
    const isRightSide = Math.abs(normalizedAngle - Math.PI / 2) < 0.4 // ~3 o'clock
    const isLeftSide = Math.abs(normalizedAngle - 3 * Math.PI / 2) < 0.4 // ~9 o'clock
    
    if (isRightSide || isLeftSide) {
      radiusX = 32 // Slightly smaller for side positions
    }
    
    const x = centerX + Math.cos(angle) * radiusX
    const y = centerY + Math.sin(angle) * radiusY
    
    return { x: `${x}%`, y: `${y}%` }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Casino Floor Background */}
      <div className="absolute inset-0">
        {/* Base casino floor */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
        
        {/* Much more visible carpet pattern overlay */}
        <div className="absolute inset-0 opacity-60">
          <div className="w-full h-full" style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(139, 69, 19, 0.3) 3px, transparent 3px),
              radial-gradient(circle at 75% 75%, rgba(160, 82, 45, 0.3) 3px, transparent 3px),
              linear-gradient(45deg, transparent 48%, rgba(139, 69, 19, 0.15) 49%, rgba(139, 69, 19, 0.15) 51%, transparent 52%),
              linear-gradient(-45deg, transparent 48%, rgba(160, 82, 45, 0.15) 49%, rgba(160, 82, 45, 0.15) 51%, transparent 52%)
            `,
            backgroundSize: '40px 40px, 40px 40px, 80px 80px, 80px 80px',
            backgroundPosition: '0 0, 20px 20px, 0 0, 0 0'
          }}></div>
        </div>
        
        {/* Ambient lighting effects */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 via-transparent to-blue-500/5"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-red-500/3 via-transparent to-green-500/3"></div>
        
        {/* Overhead lighting spots */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-radial from-yellow-200/10 to-transparent rounded-full"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-radial from-yellow-200/10 to-transparent rounded-full"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-gradient-radial from-blue-200/8 to-transparent rounded-full"></div>
        
        {/* Wall texture */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(90deg, transparent 98%, rgba(255, 255, 255, 0.1) 100%),
              linear-gradient(0deg, transparent 98%, rgba(255, 255, 255, 0.1) 100%)
            `,
            backgroundSize: '20px 20px'
          }}></div>
        </div>
      </div>

      {/* Toast Messages */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="fixed top-4 right-4 z-50 bg-black/80 backdrop-blur-md border border-white/20 rounded-xl shadow-lg p-4 text-white"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 p-2">
        {/* Header */}
        <motion.div 
          className="text-center mb-2"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl font-black text-yellow-400 mb-2">
            🎰 QUIZZING HOLD-EM
          </h1>
          <div className="text-lg text-white">
            Room: <span className="text-yellow-400 font-bold">{displayGameState.code}</span> | 
            Phase: <span className="text-yellow-400 font-bold">{displayGameState.phase}</span>
            {!gameState && <span className="text-red-400 ml-2">(DEMO MODE - 8 Players)</span>}
          </div>
        </motion.div>

        {/* Main Game Area - adjusted for bottom info panel */}
        <div className="relative w-full h-[calc(100vh-200px)] max-w-7xl mx-auto">
          {/* Players positioned around the table */}
          {displayGameState.players.map((player, index) => {
            const position = getPlayerPosition(index, displayGameState.players.length)
            return (
              <motion.div
                key={player.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                style={{ left: position.x, top: position.y }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <div className="bg-black/90 backdrop-blur-md border-2 border-yellow-600 rounded-lg p-3 text-center w-[120px] h-[130px] shadow-lg transform scale-75 origin-center relative">
                  <div className="text-yellow-400 font-bold text-sm mb-1">{player.name}</div>
                  <div className="text-white text-sm mb-1">
                    ${player.bankroll}
                  </div>
                  
                  {/* Player's hand - docked at bottom edge with overlapping cards */}
                  {player.hand.length > 0 && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex">
                      {player.hand.map((card, i) => (
                        <div key={i} className="transform scale-50 origin-bottom" style={{ marginLeft: i === 0 ? '0' : '-50px' }}>
                          <NumericPlayingCard digit={card.digit} variant="cyan" size="normal" faceDown={true} backDesign="star" />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Player status */}
                  {player.hasFolded && (
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-red-400 font-bold text-xs">FOLDED</div>
                  )}
                </div>
              </motion.div>
            )
          })}

          {/* Realistic Poker Table - Centered vertically in available space */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            {/* Table shadow */}
            <div className="absolute inset-0 w-[520px] h-[395px] bg-black/40 rounded-full blur-lg transform translate-y-2"></div>
            
            {/* Table base/rail */}
            <div className="w-[500px] h-[375px] bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900 rounded-full border-8 border-amber-600 shadow-2xl relative">
                            {/* FELT SURFACE - Direct application to rail padding */}
              <div 
                className="absolute inset-2 rounded-full border-4 border-amber-500"
                style={{
                  background: `
                    repeating-linear-gradient(
                      45deg,
                      #2d5a3d 0px,
                      #2d5a3d 2px,
                      #1f4429 2px,
                      #1f4429 4px
                    ),
                    repeating-linear-gradient(
                      -45deg,
                      transparent 0px,
                      transparent 2px,
                      rgba(0, 0, 0, 0.15) 2px,
                      rgba(0, 0, 0, 0.15) 4px
                    ),
                    linear-gradient(135deg, #2d7a4a, #1e5a33, #2d7a4a)
                  `,
                  backgroundSize: '4px 4px, 4px 4px, 100% 100%'
                }}
              >
                {/* Table markings - betting lines */}
                <div className="absolute inset-8 border-2 border-white/20 rounded-full"></div>
                <div className="absolute inset-12 border border-white/10 rounded-full"></div>
              </div>
                


              {/* Cup holders centered on the middle rail stripe - one per player */}
              {displayGameState.players.map((_, index) => {
                const angle = (index / displayGameState.players.length) * 2 * Math.PI - Math.PI / 2
                
                // Base ellipse dimensions - back to working pixel values
                const baseRadiusX = 242  // Horizontal radius
                const baseRadiusY = 195  // Vertical radius
                
                // Calculate base position
                let x = Math.cos(angle) * baseRadiusX
                let y = Math.sin(angle) * baseRadiusY
                
                // Adjust positioning based on angle regions
                const normalizedAngle = ((angle + Math.PI/2) % (2 * Math.PI)) / (2 * Math.PI)
                
                // Identify top and bottom regions for straight line alignment
                const isTopRegion = normalizedAngle > 0.9 || normalizedAngle < 0.1
                const isBottomRegion = normalizedAngle > 0.4 && normalizedAngle < 0.6
                
                // Identify corner regions
                const isCorner = (normalizedAngle > 0.125 && normalizedAngle < 0.375) || 
                               (normalizedAngle > 0.625 && normalizedAngle < 0.875)
                
                if (isTopRegion) {
                  // Create more pronounced inward bow for top line
                  const bowAmount = Math.abs(Math.cos(angle)) * 15 // Bow inward
                  y = -180 + bowAmount // Positioning
                } else if (isBottomRegion) {
                  // Create more pronounced inward bow for bottom line
                  const bowAmount = Math.abs(Math.cos(angle)) * 15 // Bow inward
                  y = 180 - bowAmount // Positioning
                } else if (isCorner) {
                  // Push corners out by increasing radius - minimal boost for nearly flat
                  x = Math.cos(angle) * (baseRadiusX + 0.5)
                  y = Math.sin(angle) * (baseRadiusY + 0.5)
                }
                
                // Note: Individual adjustments removed since we now have 8 cupholders instead of 50
                
                return (
                  <div 
                    key={`cupholder-${index}`}
                    className="absolute bg-amber-800 rounded-full border-2 border-amber-600 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                    style={{ 
                      left: `${243 + x}px`, 
                      top: `${181 + y}px`,
                      width: '20px',
                      height: '20px'
                    }}
                                      >
                    </div>
                )
              })}
              
              {/* Original cupholders (hidden for now) */}
              {false && displayGameState.players.map((_, index) => {
                const angle = (index / displayGameState.players.length) * 2 * Math.PI - Math.PI / 2
                const railCenterRadiusX = 248
                const railCenterRadiusY = 180
                const x = Math.cos(angle) * railCenterRadiusX
                const y = Math.sin(angle) * railCenterRadiusY
                
                return (
                  <div 
                    key={`original-cupholder-${index}`}
                    className="absolute w-6 h-6 bg-amber-800 rounded-full border-2 border-amber-600 transform -translate-x-1/2 -translate-y-1/2"
                    style={{ 
                      left: `${243 + x}px`, 
                      top: `${181 + y}px` 
                    }}
                  ></div>
                )
              })}
              
              {/* Pot display - positioned higher */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-24 text-center">
                <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2">
                  <div className="text-white text-sm">Pot: <span className="text-yellow-400 font-bold text-2xl">${displayGameState.round.pot}</span></div>
                </div>
              </div>

              {/* Community Cards - positioned higher */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-0">
                <div className="flex gap-2">
                  {displayGameState.round.communityCards && displayGameState.round.communityCards.length > 0 ? (
                    displayGameState.round.communityCards.map((card, i) => (
                      <NumericPlayingCard key={i} digit={card.digit} variant="cyan" style="neon" neonVariant="matrix" size="small" />
                    ))
                  ) : (
                    <div className="text-white/60 text-sm bg-black/40 backdrop-blur-sm rounded px-2 py-1">No community cards</div>
                  )}
                </div>
              </div>

              {/* Current question - positioned above pot */}
              {displayGameState.round.question && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-24 w-72">
                  <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-3 text-center">
                    <div className="text-white text-sm mb-1">Current Question:</div>
                    <div className="text-yellow-400 font-bold text-sm">{displayGameState.round.question.text}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Game Info Panel - Docked to bottom of screen */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-black/90 backdrop-blur-md border border-yellow-600 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-white text-sm">Players</div>
                <div className="text-yellow-400 font-bold text-xl">{displayGameState.players.length}</div>
              </div>
              <div>
                <div className="text-white text-sm">Total Pot</div>
                <div className="text-yellow-400 font-bold text-xl">${displayGameState.round.pot}</div>
              </div>
              <div>
                <div className="text-white text-sm">Phase</div>
                <div className="text-yellow-400 font-bold text-xl">{displayGameState.phase}</div>
              </div>
              <div>
                <div className="text-white text-sm">Room Code</div>
                <div className="text-yellow-400 font-bold text-xl">{displayGameState.code}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DisplayApp
