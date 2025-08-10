import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { connect, onState } from '@qhe/net';
import { Card, NeonButton } from '@qhe/ui';
import type { GameState } from '@qhe/core';

function HostApp() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomCode] = useState('HOST01');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = connect('host', 'Host', roomCode);
    setIsConnected(true);
    
    onState((state: GameState) => {
      setGameState(state);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomCode]);

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

  return (
    <div className='min-h-screen bg-gradient-to-br from-casino-dark via-purple-900 to-casino-dark p-8'>
      <div className='max-w-6xl mx-auto'>
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='text-center mb-8'
        >
          <h1 className='text-6xl font-bold text-casino-gold mb-4 animate-glow'>
             Quizzing Hold-Em
          </h1>
          <p className='text-2xl text-emerald-300'>Host Control Panel</p>
          <div className='mt-4 p-4 casino-card inline-block'>
            <p className='text-lg'>Room Code: <span className='text-casino-gold font-bold text-2xl'>{roomCode}</span></p>
          </div>
        </motion.div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          <Card className='p-6'>
            <h2 className='text-2xl font-bold text-casino-gold mb-4'>Game Controls</h2>
            <div className='space-y-4'>
              <NeonButton className='w-full' onClick={() => console.log('Start Game')}>
                 Start Game
              </NeonButton>
              <NeonButton className='w-full' onClick={() => console.log('Next Question')}>
                 Next Question
              </NeonButton>
              <NeonButton className='w-full' onClick={() => console.log('Deal Cards')}>
                 Deal Cards
              </NeonButton>
              <NeonButton className='w-full' onClick={() => console.log('Reveal Answer')}>
                 Reveal Answer
              </NeonButton>
            </div>
          </Card>

          <Card className='p-6'>
            <h2 className='text-2xl font-bold text-casino-gold mb-4'>Players ({gameState?.players.length || 0})</h2>
            <div className='space-y-2'>
              {gameState?.players.map((player) => (
                <div key={player.id} className='flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg'>
                  <span className='text-emerald-300'>{player.name}</span>
                  <span className='text-casino-gold'></span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className='mt-8 p-6'>
          <h2 className='text-2xl font-bold text-casino-gold mb-4'>Game Status</h2>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='text-center p-4 bg-zinc-800/50 rounded-lg'>
              <p className='text-sm text-gray-400'>Phase</p>
              <p className='text-xl font-bold text-emerald-300'>{gameState?.phase || 'lobby'}</p>
            </div>
            <div className='text-center p-4 bg-zinc-800/50 rounded-lg'>
              <p className='text-sm text-gray-400'>Pot</p>
              <p className='text-xl font-bold text-casino-gold'></p>
            </div>
            <div className='text-center p-4 bg-zinc-800/50 rounded-lg'>
              <p className='text-sm text-gray-400'>Big Blind</p>
              <p className='text-xl font-bold text-purple-300'></p>
            </div>
            <div className='text-center p-4 bg-zinc-800/50 rounded-lg'>
              <p className='text-sm text-gray-400'>Small Blind</p>
              <p className='text-xl font-bold text-purple-300'></p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default HostApp;
