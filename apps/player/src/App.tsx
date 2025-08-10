import { useState } from 'react';
import { motion } from 'framer-motion';
import { connect, onState } from '@qhe/net';
import { Card, NeonButton, DigitChip } from '@qhe/ui';
import type { GameState } from '@qhe/core';

function PlayerApp() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  const handleJoin = () => {
    if (!playerName || !roomCode) return;
    connect('player', playerName, roomCode);
    setIsConnected(true);
    setIsJoined(true);
    
    onState((state) => {
      setGameState(state);
    });
  };

  if (!isJoined) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-casino-dark via-purple-900 to-casino-dark'>
        <Card className='p-8 w-full max-w-md'>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-center'
          >
            <h1 className='text-4xl font-bold text-casino-gold mb-6'> Join Game</h1>
            <div className='space-y-4'>
              <input
                type='text'
                placeholder='Your Name'
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className='w-full p-3 rounded-lg bg-zinc-800 border border-zinc-600 text-white placeholder-gray-400 focus:border-emerald-400 focus:outline-none'
              />
              <input
                type='text'
                placeholder='Room Code'
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className='w-full p-3 rounded-lg bg-zinc-800 border border-zinc-600 text-white placeholder-gray-400 focus:border-emerald-400 focus:outline-none'
              />
              <NeonButton 
                className='w-full' 
                onClick={handleJoin}
                disabled={!playerName || !roomCode}
              >
                 Join Game
              </NeonButton>
            </div>
          </motion.div>
        </Card>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-400 mx-auto'></div>
          <p className='mt-4 text-xl'>Connecting to server...</p>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState?.players.find(p => p.name === playerName);

  return (
    <div className='min-h-screen bg-gradient-to-br from-casino-dark via-purple-900 to-casino-dark p-4'>
      <div className='max-w-4xl mx-auto'>
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='text-center mb-6'
        >
          <h1 className='text-3xl font-bold text-casino-gold mb-2'> Player View</h1>
          <p className='text-lg text-emerald-300'>Room: {roomCode} | Player: {playerName}</p>
        </motion.div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <Card className='p-4'>
            <h2 className='text-xl font-bold text-casino-gold mb-4'>Your Hand</h2>
            <div className='flex gap-2 justify-center'>
              {currentPlayer?.hand.map((card, i) => (
                <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}>
                  <DigitChip digit={card.digit} />
                </motion.div>
              ))}
            </div>
            <div className='mt-4 text-center'>
              <p className='text-sm text-gray-400'>Bankroll</p>
              <p className='text-2xl font-bold text-casino-gold'></p>
            </div>
          </Card>

          <Card className='p-4'>
            <h2 className='text-xl font-bold text-casino-gold mb-4'>Community Cards</h2>
            <div className='flex gap-2 justify-center'>
              {gameState?.round.communityCards.map((card, i) => (
                <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}>
                  <DigitChip digit={card.digit} />
                </motion.div>
              ))}
            </div>
            <div className='mt-4 text-center'>
              <p className='text-sm text-gray-400'>Pot</p>
              <p className='text-2xl font-bold text-casino-gold'></p>
            </div>
          </Card>

          <Card className='p-4'>
            <h2 className='text-xl font-bold text-casino-gold mb-4'>Game Actions</h2>
            <div className='space-y-3'>
              <NeonButton className='w-full' onClick={() => console.log('Call')}>
                 Call
              </NeonButton>
              <NeonButton className='w-full' onClick={() => console.log('Raise')}>
                 Raise
              </NeonButton>
              <NeonButton className='w-full' onClick={() => console.log('Fold')}>
                 Fold
              </NeonButton>
            </div>
          </Card>
        </div>

        <Card className='mt-6 p-4'>
          <h2 className='text-xl font-bold text-casino-gold mb-4'>Other Players</h2>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            {gameState?.players.filter(p => p.name !== playerName).map((player) => (
              <div key={player.id} className='text-center p-3 bg-zinc-800/50 rounded-lg'>
                <p className='text-emerald-300 font-semibold'>{player.name}</p>
                <p className='text-casino-gold'></p>
                {player.hasFolded && <p className='text-red-400 text-sm'>Folded</p>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default PlayerApp;
