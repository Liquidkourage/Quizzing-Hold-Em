import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { connect, onState } from '@qhe/net';
import { Card, DigitChip } from '@qhe/ui';
import type { GameState } from '@qhe/core';

function DisplayApp() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomCode] = useState('DISPLAY');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = connect('display', 'Display', roomCode);
    setIsConnected(true);
    
    onState((state) => {
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
      <div className='max-w-7xl mx-auto'>
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='text-center mb-8'
        >
          <h1 className='text-7xl font-bold text-casino-gold mb-4 animate-glow'>
             Quizzing Hold-Em
          </h1>
          <p className='text-3xl text-emerald-300 mb-4'>Live Game Display</p>
          <div className='inline-block p-4 casino-card'>
            <p className='text-2xl'>Room: <span className='text-casino-gold font-bold'>{roomCode}</span></p>
          </div>
        </motion.div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
          <Card className='p-8'>
            <h2 className='text-3xl font-bold text-casino-gold mb-6 text-center'>Current Question</h2>
            {gameState?.round.question ? (
              <div className='text-center'>
                <p className='text-2xl text-white mb-4'>{gameState.round.question.text}</p>
                <div className='text-4xl font-bold text-casino-gold animate-pulse'>
                  Answer: {gameState.round.question.answer}
                </div>
              </div>
            ) : (
              <div className='text-center text-xl text-gray-400'>
                Waiting for question...
              </div>
            )}
          </Card>

          <Card className='p-8'>
            <h2 className='text-3xl font-bold text-casino-gold mb-6 text-center'>Community Cards</h2>
            <div className='flex gap-4 justify-center'>
              {gameState?.round.communityCards.map((card, i) => (
                <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.2 }}>
                  <DigitChip digit={card.digit} />
                </motion.div>
              ))}
            </div>
            <div className='text-center mt-6'>
              <p className='text-2xl text-gray-400'>Pot</p>
              <p className='text-5xl font-bold text-casino-gold'></p>
            </div>
          </Card>
        </div>

        <Card className='p-8'>
          <h2 className='text-3xl font-bold text-casino-gold mb-6 text-center'>Players</h2>
          <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6'>
            {gameState?.players.map((player) => (
              <motion.div 
                key={player.id} 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className='text-center p-4 bg-zinc-800/50 rounded-xl'
              >
                <p className='text-xl font-bold text-emerald-300 mb-2'>{player.name}</p>
                <p className='text-2xl font-bold text-casino-gold mb-3'></p>
                <div className='flex gap-1 justify-center'>
                  {player.hand.map((card, i) => (
                    <DigitChip key={i} digit={card.digit} />
                  ))}
                </div>
                {player.hasFolded && (
                  <p className='text-red-400 text-lg font-bold mt-2'>FOLDED</p>
                )}
              </motion.div>
            ))}
          </div>
        </Card>

        <Card className='mt-8 p-6'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-6 text-center'>
            <div>
              <p className='text-lg text-gray-400'>Game Phase</p>
              <p className='text-3xl font-bold text-emerald-300 uppercase'>{gameState?.phase || 'lobby'}</p>
            </div>
            <div>
              <p className='text-lg text-gray-400'>Players</p>
              <p className='text-3xl font-bold text-purple-300'>{gameState?.players.length || 0}</p>
            </div>
            <div>
              <p className='text-lg text-gray-400'>Big Blind</p>
              <p className='text-3xl font-bold text-purple-300'></p>
            </div>
            <div>
              <p className='text-lg text-gray-400'>Small Blind</p>
              <p className='text-3xl font-bold text-purple-300'></p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default DisplayApp;
