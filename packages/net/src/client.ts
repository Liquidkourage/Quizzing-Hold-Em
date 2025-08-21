import { io, Socket } from 'socket.io-client'
import type { GameState, ClientHello, ServerAck } from './index'

let socket: Socket | null = null

export function connect(role: 'host' | 'player' | 'display', name: string, roomCode: string = 'HOST01') {
  if (socket) {
    socket.disconnect()
  }

  // Connect to port 7777
  socket = io('http://localhost:7777')

  socket.on('connect', () => {
    console.log('Connected to server')
    
    const hello: ClientHello = {
      role,
      name,
      roomCode
    }
    
    socket!.emit('hello', hello)
  })

  socket.on('disconnect', () => {
    console.log('Disconnected from server')
  })

  return () => {
    if (socket) {
      socket.disconnect()
      socket = null
    }
  }
}

export function onState(callback: (state: GameState) => void) {
  if (!socket) return () => {}

  socket.on('state', callback)
  
  return () => {
    if (socket) {
      socket.off('state', callback)
    }
  }
}

export function onToast(callback: (message: string) => void) {
  if (!socket) return () => {}

  socket.on('toast', callback)
  
  return () => {
    if (socket) {
      socket.off('toast', callback)
    }
  }
}

export function onDealingCards(callback: () => void) {
  if (!socket) return () => {}

  socket.on('dealingCards', callback)
  
  return () => {
    if (socket) {
      socket.off('dealingCards', callback)
    }
  }
}

export function useSocket() {
  return socket
}

// Host actions
export function startGame(callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', { type: 'startGame' })
  if (callback) {
    socket.once('ack', callback)
  }
}

export function setQuestion(callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', { type: 'setQuestion' })
  if (callback) {
    socket.once('ack', callback)
  }
}

export function dealCards(type: 'initial' | 'community', callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', { type: type === 'initial' ? 'dealInitialCards' : 'dealCommunityCards' })
  if (callback) {
    socket.once('ack', callback)
  }
}

export function revealAnswer(callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', { type: 'revealAnswer' })
  if (callback) {
    socket.once('ack', callback)
  }
}

export function endRound(callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', { type: 'endRound' })
  if (callback) {
    socket.once('ack', callback)
  }
}

// Player actions
export function bet(amount: number, callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', { 
    type: 'bet', 
    payload: { playerId: socket.id, amount } 
  })
  if (callback) {
    socket.once('ack', callback)
  }
}

export function fold(callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', { 
    type: 'fold', 
    payload: { playerId: socket.id } 
  })
  if (callback) {
    socket.once('ack', callback)
  }
}

export function disconnect() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
