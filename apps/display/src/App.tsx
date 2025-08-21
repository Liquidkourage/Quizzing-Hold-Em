import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NumericPlayingCard } from '@qhe/ui'
import { connect, onState, onToast, onDealingCards } from '@qhe/net'
import type { GameState } from '@qhe/core'

function DisplayApp() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isDealing, setIsDealing] = useState(false)
  const [dealingCards, setDealingCards] = useState<Array<{id: string, playerIndex: number, cardIndex: number, digit: number}>>([])
  const [hasDealtCards, setHasDealtCards] = useState(false) // Track if cards have been dealt - start false to hide initial cards

  // Calculate responsive scale factor based on viewport
  const [scaleFactor, setScaleFactor] = useState(1)
  
  useEffect(() => {
    const calculateScale = () => {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      // Base dimensions for 1920x1080 (our current design target)
      const baseWidth = 1920
      const baseHeight = 1080
      
      // Calculate scale based on the smaller dimension to ensure everything fits
      const widthScale = viewportWidth / baseWidth
      const heightScale = viewportHeight / baseHeight
      const scale = Math.min(widthScale, heightScale, 1.5) // Cap at 1.5x to prevent giant elements
      
      setScaleFactor(scale)
    }
    
    calculateScale()
    window.addEventListener('resize', calculateScale)
    return () => window.removeEventListener('resize', calculateScale)
  }, [])

  // Helper function to scale pixel values
  const scale = (pixels: number) => pixels * scaleFactor

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

  // Create demo game state with 8 players for demonstration
  const [demoGameState, setDemoGameState] = useState<GameState>({
    code: 'ABC123',
    hostId: 'demo',
    createdAt: Date.now(),
    phase: 'betting',
    bigBlind: 20,
    smallBlind: 10,
    minPlayers: 2,
    maxPlayers: 8,
    players: [
      { id: '1', name: 'Alice', bankroll: 1200, hand: [], hasFolded: false, isAllIn: false },
      { id: '2', name: 'Bob', bankroll: 850, hand: [], hasFolded: false, isAllIn: false },
      { id: '3', name: 'Carol', bankroll: 1100, hand: [], hasFolded: false, isAllIn: false },
      { id: '4', name: 'Dave', bankroll: 950, hand: [], hasFolded: false, isAllIn: false },
      { id: '5', name: 'Eve', bankroll: 1350, hand: [], hasFolded: false, isAllIn: false },
      { id: '6', name: 'Frank', bankroll: 700, hand: [], hasFolded: false, isAllIn: false },
      { id: '7', name: 'Grace', bankroll: 1600, hand: [], hasFolded: false, isAllIn: false },
      { id: '8', name: 'Henry', bankroll: 900, hand: [], hasFolded: false, isAllIn: false },
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
  })

  // Use real game state or demo state
  const displayGameState = gameState || demoGameState

  // Function to trigger dealing animation
  const triggerDealingAnimation = useCallback(() => {
    console.log('🎰 Triggering dealing animation!')
    setIsDealing(true)
    setDealingCards([])
    setHasDealtCards(false) // Hide static cards during animation
    
    // Create dealing cards in standard poker order: one card at a time around the table
    const cards: Array<{id: string, playerIndex: number, cardIndex: number, digit: number}> = []
    
    // Deal cards one at a time: first card to all players, then second card to all players
    for (let cardIndex = 0; cardIndex < 2; cardIndex++) {
      displayGameState.players.forEach((player, playerIndex) => {
        if (player.hand.length > cardIndex) {
          // Use actual cards from player's hand
          cards.push({
            id: `dealing-${playerIndex}-${cardIndex}`,
            playerIndex,
            cardIndex,
            digit: player.hand[cardIndex].digit
          })
        } else {
          // Create demo cards for animation if no cards exist yet
          cards.push({
            id: `dealing-${playerIndex}-${cardIndex}`,
            playerIndex,
            cardIndex,
            digit: Math.floor(Math.random() * 9) + 1 // Random digit 1-9
          })
        }
      })
    }
    
    console.log('🎰 Created', cards.length, 'dealing cards:', cards)
    
    // Animate cards one by one with delays
    cards.forEach((card, index) => {
      setTimeout(() => {
        console.log('🎰 Adding card to animation:', card)
        setDealingCards(prev => [...prev, card])
      }, index * 200) // 200ms delay between each card
    })
    
    // End dealing animation after all cards are dealt
    setTimeout(() => {
      console.log('🎰 Ending dealing animation')
      setIsDealing(false)
      setDealingCards([])
      setHasDealtCards(true) // Mark that cards have been dealt
      
      // For demo mode, populate the player hands with the dealt cards
      if (!gameState) {
        // This is demo mode, so we need to update the demo state with the dealt cards
        const updatedPlayers = displayGameState.players.map((player) => ({
          ...player,
          hand: [
            { digit: (Math.floor(Math.random() * 9) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 },
            { digit: (Math.floor(Math.random() * 9) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 }
          ]
        }))
        
        setDemoGameState(prev => ({
          ...prev,
          players: updatedPlayers
        }))
        
        console.log('🎰 Demo mode - populated player hands with cards')
      }
    }, cards.length * 200 + 1000)
  }, [displayGameState.players])

  useEffect(() => {
    const unsubscribe = onDealingCards(() => {
      // Add a delay to wait for the server to update the game state with the new cards
      setTimeout(() => {
        triggerDealingAnimation()
      }, 500) // Wait 500ms for server state update
    })
    return unsubscribe
  }, [displayGameState, triggerDealingAnimation])

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

  // Calculate player positions around the table (perfectly aligned with cupholders)
  const getPlayerPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2 // Start from top
    
    // Use the same angle logic as cupholders for perfect alignment
    const normalizedAngle = ((angle + Math.PI/2) % (2 * Math.PI)) / (2 * Math.PI)
    
    // Identify top and bottom regions for straight line alignment (same as cupholders)
    const isTopRegion = normalizedAngle > 0.9 || normalizedAngle < 0.1
    const isBottomRegion = normalizedAngle > 0.4 && normalizedAngle < 0.6
    
    // Identify corner regions
    const isCorner = (normalizedAngle > 0.125 && normalizedAngle < 0.375) || 
                     (normalizedAngle > 0.625 && normalizedAngle < 0.875)
    
    let cupholderX, cupholderY
    
    // Calculate cupholder position (scaled up by 1.62x for larger table)
    const scaleTable = 1.62
    if (isTopRegion) {
      const bowAmount = Math.abs(Math.cos(angle)) * scale(15 * scaleTable)
      cupholderX = Math.cos(angle) * scale(242 * scaleTable)
      cupholderY = scale((-180 + bowAmount) * scaleTable)
    } else if (isBottomRegion) {
      const bowAmount = Math.abs(Math.cos(angle)) * scale(15 * scaleTable)
      cupholderX = Math.cos(angle) * scale(242 * scaleTable)
      cupholderY = scale((180 - bowAmount) * scaleTable)
    } else if (isCorner) {
      cupholderX = Math.cos(angle) * scale((242 + 0.5) * scaleTable)
      cupholderY = Math.sin(angle) * scale((195 + 0.5) * scaleTable)
    } else {
      cupholderX = Math.cos(angle) * scale(242 * scaleTable)
      cupholderY = Math.sin(angle) * scale(195 * scaleTable)
    }
    
    // Calculate direction from table center (0,0) to cupholder
    const cupholderDistance = Math.sqrt(cupholderX * cupholderX + cupholderY * cupholderY)
    const directionX = cupholderX / cupholderDistance
    const directionY = cupholderY / cupholderDistance
    
    // Position player just outside the table by extending the cupholder position outward
    // Adjust extension distance based on position - corners out, edges in
    let extensionDistance = scale(142) // Base extension (88px * 1.62 scale)
    
    // Determine if this is a corner or edge position for 8-player layout
    // Corner positions: 2,4,6,8 (0-indexed: 1,3,5,7) - need to be pushed out 10%
    // Edge positions: 1,3,5,7 (0-indexed: 0,2,4,6) - need to be pulled in 10%
    const isCornerPosition = index % 2 === 1 // Odd indices are corners (1,3,5,7)
    
    if (isCornerPosition) {
      // Corner positions - push out 10%
      extensionDistance = extensionDistance * 1.1
    } else {
      // Edge positions - pull in 10%
      extensionDistance = extensionDistance * 0.9
    }
    
    const playerX = cupholderX + (directionX * extensionDistance)
    const playerY = cupholderY + (directionY * extensionDistance)
    
    // Position relative to the table center in the viewport
    // Table is centered at 50% of viewport with transform translate
    // Adjust for offset to align with visual center
    return { x: `calc(50% + ${playerX}px - ${scale(55)}px)`, y: `calc(50% + ${playerY}px - ${scale(60)}px)` }
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
          <h1 
            className="font-black text-yellow-400 mb-2"
            style={{ fontSize: scale(36) }}
          >
            🎰 QUIZZING HOLD-EM
          </h1>
          <div 
            className="text-white"
            style={{ fontSize: scale(18) }}
          >
            Room: <span className="text-yellow-400 font-bold">{displayGameState.code}</span> | 
            Phase: <span className="text-yellow-400 font-bold">{displayGameState.phase}</span>
            {!gameState && <span className="text-red-400 ml-2">(DEMO MODE - 8 Players)</span>}
          </div>
          

        </motion.div>

        {/* Main Game Area - adjusted for bottom info panel */}
        <div className="relative w-full h-[calc(100vh-200px)] max-w-7xl mx-auto">
          
          {/* Dealing Animation */}
          <AnimatePresence>
            {isDealing && (
              <div className="absolute inset-0 z-50 pointer-events-none">
                {/* Debug info */}
                <div className="absolute top-4 left-4 bg-black/80 text-white p-2 rounded text-xs">
                  Dealing: {isDealing ? 'YES' : 'NO'}<br/>
                  Cards: {dealingCards.length}<br/>
                  {dealingCards.map(card => `${card.playerIndex}-${card.cardIndex}`).join(', ')}
                </div>
                
                {/* Dealer deck of cards in center */}
                <motion.div
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                  initial={{ scale: 0, opacity: 0, rotateY: 0 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Stack of cards to simulate a deck */}
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      style={{
                        left: `${i * scale(2)}px`,
                        top: `${i * scale(-1)}px`,
                        zIndex: 5 - i
                      }}
                      animate={{
                        rotateY: [0, 5, -5, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.1
                      }}
                    >
                      <NumericPlayingCard 
                        digit={0} 
                        variant="cyan" 
                        size="normal" 
                        faceDown={true}
                        backDesign="star"
                        style="neon"
                        neonVariant="matrix"
                      />
                    </motion.div>
                  ))}
                </motion.div>
                {dealingCards.map((dealingCard) => {
                  // Calculate exact endpoint to match static card positioning
                  const calculateCardEndpoint = (playerIndex: number, cardIndex: number) => {
                    const playerPosition = getPlayerPosition(playerIndex, displayGameState.players.length)
                    
                    // Parse the position values
                    const targetX = parseFloat(playerPosition.x.replace('calc(50% + ', '').replace('px)', ''))
                    const targetY = parseFloat(playerPosition.y.replace('calc(50% + ', '').replace('px)', ''))
                    
                    // Calculate viewport center
                    const containerWidth = window.innerWidth
                    const viewportHeight = window.innerHeight - 200
                    const centerX = containerWidth / 2
                    const centerY = viewportHeight / 2
                    
                    // Player container positioning: absolute with transform -translate-x-1/2 -translate-y-1/2
                    const playerCenterX = centerX + targetX
                    const playerCenterY = centerY + targetY
                    
                    // Static card positioning inside player container:
                    // - Container: w-[120px] h-[130px] with scale-[1.40625]
                    // - Cards: absolute bottom-0 left-1/2 transform -translate-x-1/2 flex
                    // - Each card: scale-50 origin-bottom with marginLeft: i === 0 ? '0' : '-50px'
                    
                    const containerScale = 1.40625 * scaleFactor
                    const cardScale = 0.5
                    
                    // Container dimensions after scaling (now just the base scale factor)
                    const scaledHeight = scale(130 * 1.40625)
                    
                    // Cards are positioned at bottom-0 (bottom of container)
                    const cardsBottomY = playerCenterY + (scaledHeight / 2)
                    
                    // Cards use flex with overlapping via negative margin
                    // First card (index 0): no offset
                    // Second card (index 1): -50px margin (before scale)
                    const baseCardWidth = scale(96) // Normal NumericPlayingCard width
                    const baseCardHeight = scale(144) // Normal NumericPlayingCard height
                    const scaledCardWidth = baseCardWidth * cardScale
                    const cardOverlap = scale(-50) // px overlap before scaling
                    
                    // Calculate card X position
                    // Cards are centered horizontally (left-1/2 transform -translate-x-1/2)
                    // Add small offset to move cards slightly right and up
                    const horizontalOffset = scale(16) // px adjustment to move right (fine-tuned from 18)
                    const verticalOffset = scale(-8) // px adjustment to move up
                    let cardX
                    
                    if (cardIndex === 0) {
                      // First card is centered
                      cardX = playerCenterX - (scaledCardWidth / 2) + horizontalOffset
                    } else {
                      // Second card overlaps by -50px (before container scaling)
                      const overlapScaled = cardOverlap * containerScale
                      cardX = playerCenterX - (scaledCardWidth / 2) + overlapScaled + horizontalOffset
                    }
                    
                    // Card Y position accounts for card height and origin-bottom
                    const scaledCardHeight = baseCardHeight * cardScale * containerScale
                    const cardY = cardsBottomY - scaledCardHeight + verticalOffset
                    
                    return { x: cardX, y: cardY, scale: cardScale }
                  }
                  
                  const endpoint = calculateCardEndpoint(dealingCard.playerIndex, dealingCard.cardIndex)
                  
                  // Calculate exact center for animation start (same as deck position)
                  const containerWidth = window.innerWidth
                  const viewportHeight = window.innerHeight - 200
                  const centerX = containerWidth / 2
                  const centerY = viewportHeight / 2
                  
                  const finalX = endpoint.x
                  const finalY = endpoint.y
                  const finalScale = endpoint.scale
                  
                  return (
                    <motion.div
                      key={dealingCard.id}
                      className="absolute"
                      style={{ 
                        left: 0, 
                        top: 0 
                      }}
                      initial={{ 
                        x: centerX,
                        y: centerY,
                        scale: 0.1,
                        rotate: Math.random() * 360 - 180,
                        opacity: 0
                      }}
                      animate={{ 
                        x: finalX,
                        y: finalY,
                        scale: finalScale, // Match the exact card scale
                        rotate: 0,
                        opacity: 1
                      }}
                      transition={{ 
                        duration: 1.2,
                        ease: "easeOut",
                        type: "spring",
                        stiffness: 100,
                        damping: 10
                      }}
                    >
                      <NumericPlayingCard 
                        digit={dealingCard.digit} 
                        variant="cyan" 
                        size="normal" 
                        faceDown={true}
                        backDesign="star"
                        style="neon"
                        neonVariant="pulse"
                      />
                    </motion.div>
                  )
                })}
              </div>
            )}
          </AnimatePresence>
          {/* Players positioned around the table - positioned relative to viewport center */}
          {displayGameState.players.map((player, index) => {
            const position = getPlayerPosition(index, displayGameState.players.length)
            return (
              <motion.div 
                key={player.id} 
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                style={{ 
                  left: position.x, 
                  top: position.y 
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <div 
                  className="bg-black/90 backdrop-blur-md border-2 border-yellow-600 rounded-lg p-3 text-center shadow-lg origin-center relative"
                  style={{
                    width: scale(120 * 1.40625),
                    height: scale(130 * 1.40625)
                  }}
                >
                  <div 
                    className="text-yellow-400 font-bold mb-1"
                    style={{ fontSize: scale(14) }}
                  >
                    {player.name}
                  </div>
                  <div 
                    className="text-white mb-1"
                    style={{ fontSize: scale(14) }}
                  >
                    ${player.bankroll}
                  </div>
                  
                  {/* Player's hand - docked at bottom edge with overlapping cards */}
                  {player.hand.length > 0 && !isDealing && hasDealtCards && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex">
                                        {player.hand.map((card, i) => (
                        <div 
                          key={i} 
                          className="transform origin-bottom" 
                          style={{ 
                            transform: `scale(${0.5})`,
                            marginLeft: i === 0 ? '0' : `${scale(-50)}px` 
                          }}
                        >
                          <NumericPlayingCard digit={card.digit} variant="cyan" size="normal" faceDown={true} backDesign="star" />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Player status */}
                  {player.hasFolded && (
                    <div 
                      className="absolute left-1/2 transform -translate-x-1/2 text-red-400 font-bold"
                      style={{ 
                        bottom: scale(24),
                        fontSize: scale(12)
                      }}
                    >
                      FOLDED
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}

          {/* Realistic Poker Table - Centered vertically in available space */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            {/* Table shadow */}
            <div 
              className="absolute inset-0 bg-black/40 rounded-full blur-lg transform translate-y-2"
              style={{
                width: scale(842),
                height: scale(637)
              }}
            ></div>
            
            {/* Table base/rail */}
            <div 
              className="bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900 rounded-full border-8 border-amber-600 shadow-2xl relative"
              style={{
                width: scale(810),
                height: scale(605)
              }}
            >
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
                
                // Base ellipse dimensions - scaled up for larger table
                const baseRadiusX = scale(392)  // Horizontal radius (242 * 1.62)
                const baseRadiusY = scale(316)  // Vertical radius (195 * 1.62)
                
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
                  const bowAmount = Math.abs(Math.cos(angle)) * scale(24.3) // Bow inward (15 * 1.62)
                  y = scale(-291.6) + bowAmount // Positioning (-180 * 1.62)
                } else if (isBottomRegion) {
                  // Create more pronounced inward bow for bottom line
                  const bowAmount = Math.abs(Math.cos(angle)) * scale(24.3) // Bow inward (15 * 1.62)
                  y = scale(291.6) - bowAmount // Positioning (180 * 1.62)
                } else if (isCorner) {
                  // Push corners out by increasing radius - minimal boost for nearly flat
                  x = Math.cos(angle) * (baseRadiusX + scale(0.81))
                  y = Math.sin(angle) * (baseRadiusY + scale(0.81))
                }
                
                // Note: Individual adjustments removed since we now have 8 cupholders instead of 50
                
                return (
                  <div 
                    key={`cupholder-${index}`}
                    className="absolute bg-amber-800 rounded-full border-2 border-amber-600 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                    style={{ 
                      left: `${scale(394) + x}px`, 
                      top: `${scale(293) + y}px`,
                      width: scale(32),
                      height: scale(32)
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
              <div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 text-center"
                style={{ transform: 'translate(-50%, -50%) translateY(-' + scale(96) + 'px)' }}
              >
                <div 
                  className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg"
                  style={{ padding: `${scale(8)}px ${scale(16)}px` }}
                >
                  <div 
                    className="text-white"
                    style={{ fontSize: scale(14) }}
                  >
                    Pot: <span 
                      className="text-yellow-400 font-bold"
                      style={{ fontSize: scale(24) }}
                    >
                      ${displayGameState.round.pot}
                    </span>
                  </div>
                </div>
              </div>

              {/* Community Cards - positioned higher */}
              <div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2"
                style={{ transform: 'translate(-50%, -50%)' }}
              >
                <div 
                  className="flex"
                  style={{ gap: scale(8) }}
                >
                  {displayGameState.round.communityCards && displayGameState.round.communityCards.length > 0 ? (
                    displayGameState.round.communityCards.map((card, i) => (
                      <NumericPlayingCard key={i} digit={card.digit} variant="cyan" style="neon" neonVariant="matrix" size="small" />
                    ))
                  ) : (
                    <div 
                      className="text-white/60 bg-black/40 backdrop-blur-sm rounded"
                      style={{ 
                        fontSize: scale(14),
                        padding: `${scale(4)}px ${scale(8)}px`
                      }}
                    >
                      No community cards
                    </div>
                  )}
                </div>
              </div>

              {/* Current question - positioned above pot */}
              {displayGameState.round.question && (
                <div 
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2"
                  style={{ 
                    transform: 'translate(-50%, -50%) translateY(-' + scale(96) + 'px)',
                    width: scale(288)
                  }}
                >
                  <div 
                    className="bg-black/80 backdrop-blur-md border border-white/20 rounded-lg text-center"
                    style={{ padding: scale(12) }}
                  >
                    <div 
                      className="text-white mb-1"
                      style={{ fontSize: scale(14) }}
                    >
                      Current Question:
                    </div>
                    <div 
                      className="text-yellow-400 font-bold"
                      style={{ fontSize: scale(14) }}
                    >
                      {displayGameState.round.question.text}
                    </div>
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
            <div 
              className="grid grid-cols-2 md:grid-cols-4 text-center"
              style={{ gap: scale(16) }}
            >
            <div>
                <div 
                  className="text-white"
                  style={{ fontSize: scale(14) }}
                >
                  Players
                </div>
                <div 
                  className="text-yellow-400 font-bold"
                  style={{ fontSize: scale(20) }}
                >
                  {displayGameState.players.length}
                </div>
            </div>
            <div>
                <div 
                  className="text-white"
                  style={{ fontSize: scale(14) }}
                >
                  Total Pot
                </div>
                <div 
                  className="text-yellow-400 font-bold"
                  style={{ fontSize: scale(20) }}
                >
                  ${displayGameState.round.pot}
                </div>
            </div>
            <div>
                <div 
                  className="text-white"
                  style={{ fontSize: scale(14) }}
                >
                  Phase
                </div>
                <div 
                  className="text-yellow-400 font-bold"
                  style={{ fontSize: scale(20) }}
                >
                  {displayGameState.phase}
                </div>
            </div>
            <div>
                <div 
                  className="text-white"
                  style={{ fontSize: scale(14) }}
                >
                  Room Code
                </div>
                <div 
                  className="text-yellow-400 font-bold"
                  style={{ fontSize: scale(20) }}
                >
                  {displayGameState.code}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DisplayApp
