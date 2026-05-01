/// <reference path="./vite-import-meta.d.ts" />

import { io, Socket } from 'socket.io-client'
import type { GameState, Question, ClientHello, ServerAck } from './index'

let socket: Socket | null = null

function socketOrigin(): string {
  const configured = import.meta.env?.VITE_SOCKET_URL as string | undefined
  if (configured && configured.length > 0) {
    return configured.replace(/\/$/, '')
  }
  if (import.meta.env?.DEV) {
    return 'http://localhost:7777'
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'http://localhost:7777'
}

export function connect(role: 'host' | 'player' | 'display', name: string, roomCode: string = 'HOST01', tableId: string = '1') {
  if (socket) {
    socket.disconnect()
  }

  socket = io(socketOrigin())

  socket.on('connect', () => {
    console.log('Connected to server')
    
    const hello: ClientHello = {
      role,
      name,
      roomCode,
      tableId
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

export function onDealingCommunityCards(callback: () => void) {
  if (!socket) return () => {}

  socket.on('dealingCommunityCards', callback)
  
  return () => {
    if (socket) {
      socket.off('dealingCommunityCards', callback)
    }
  }
}

export function onSeated(callback: (info: { tableId: string }) => void) {
  if (!socket) return () => {}

  socket.on('seated', callback)
  return () => {
    if (socket) socket.off('seated', callback)
  }
}

export function onQuestionBank(callback: (questions: Question[]) => void) {
  if (!socket) return () => {}

  socket.on('questionBank', callback)
  return () => {
    if (socket) socket.off('questionBank', callback)
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

export function setQuestion(callback?: (ack: ServerAck) => void): void
export function setQuestion(opts: { questionId?: string }, callback?: (ack: ServerAck) => void): void
export function setQuestion(
  optsOrCallback?: { questionId?: string } | ((ack: ServerAck) => void),
  maybeCallback?: (ack: ServerAck) => void
) {
  if (!socket) return
  let payload: Record<string, unknown> = {}
  let cb = maybeCallback
  if (typeof optsOrCallback === 'function') {
    cb = optsOrCallback
  } else if (optsOrCallback?.questionId != null && optsOrCallback.questionId !== '') {
    payload = { questionId: optsOrCallback.questionId }
  }
  socket.emit('action', { type: 'setQuestion', payload })
  if (cb) socket.once('ack', cb)
}

export function questionBankAdd(payload: {
  text: string
  answer: number
  category?: string
  difficulty?: number
}) {
  if (!socket) return
  socket.emit('action', { type: 'questionBankAdd', payload })
}

export function questionBankUpdate(payload: {
  id: string
  text?: string
  answer?: number
  category?: string | null
  difficulty?: number | null
}) {
  if (!socket) return
  socket.emit('action', { type: 'questionBankUpdate', payload })
}

export function questionBankDelete(id: string) {
  if (!socket) return
  socket.emit('action', { type: 'questionBankDelete', payload: { id } })
}

export function questionBankMove(id: string, direction: 'up' | 'down') {
  if (!socket) return
  socket.emit('action', { type: 'questionBankMove', payload: { id, direction } })
}

export function questionBankRestoreSamples() {
  if (!socket) return
  socket.emit('action', { type: 'questionBankResetSamples' })
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

export function startAnswering(callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', { type: 'startAnswering' })
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

export function check(callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', {
    type: 'check',
    payload: { playerId: socket.id }
  })
  if (callback) socket.once('ack', callback)
}

export function callBet(callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', {
    type: 'call',
    payload: { playerId: socket.id }
  })
  if (callback) socket.once('ack', callback)
}

export function raiseBet(amount: number, callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', {
    type: 'raise',
    payload: { playerId: socket.id, amount }
  })
  if (callback) socket.once('ack', callback)
}

export function allIn(callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', {
    type: 'allIn',
    payload: { playerId: socket.id }
  })
  if (callback) socket.once('ack', callback)
}

export function submitAnswer(answer: number, callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', { 
    type: 'submitAnswer', 
    payload: { playerId: socket.id, answer } 
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

// Host admin actions
export function adminCloseBetting(callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', { type: 'adminCloseBetting' })
  if (callback) socket.once('ack', callback)
}

export function adminAdvanceTurn(callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', { type: 'adminAdvanceTurn' })
  if (callback) socket.once('ack', callback)
}

export function adminSetBlinds(smallBlind: number, bigBlind: number, callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', { type: 'adminSetBlinds', payload: { smallBlind, bigBlind } })
  if (callback) socket.once('ack', callback)
}

export function assignTablesFromLobby() {
  if (!socket) return
  socket.emit('action', { type: 'assignTablesFromLobby' })
}

/** Host-only: add CPU seats tracked as `vp:*` player ids (server autopilots betting and answers). */
export function addVirtualPlayers(count = 2) {
  if (!socket) return
  socket.emit('action', { type: 'addVirtualPlayers', payload: { count } })
}

export function clearVirtualPlayers() {
  if (!socket) return
  socket.emit('action', { type: 'clearVirtualPlayers' })
}
