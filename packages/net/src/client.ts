/// <reference path="./vite-import-meta.d.ts" />

import { io, Socket } from 'socket.io-client'
import type {
  GameState,
  ClientHello,
  ServerAck,
  HostLibrarySnapshot,
  DisplayLayoutPayload,
  DisplayVenueWallSnapshot,
  HostVenueGameplayHintsPayload,
  HostVenueFeltBeatPayload,
} from './index'

let socket: Socket | null = null

/** Same-origin demo bridge (e.g. host tab → display tab) when socket/server is unavailable. */
const DISPLAY_LAYOUT_LOCAL_BROADCAST_CHANNEL = 'qhe-display-layout-demo'

function isDisplayLayoutPayloadLocal(v: unknown): v is DisplayLayoutPayload {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  if (o.layout === 'singleTable') {
    return typeof o.tableId === 'string' && o.tableId.length > 0
  }
  if (o.layout === 'venueWall') {
    if (o.focusTable === null) return true
    return (
      typeof o.focusTable === 'number' &&
      Number.isInteger(o.focusTable) &&
      o.focusTable >= 1 &&
      o.focusTable <= 8
    )
  }
  return false
}

function postDisplayLayoutLocal(layout: DisplayLayoutPayload) {
  if (typeof BroadcastChannel === 'undefined') return
  try {
    const ch = new BroadcastChannel(DISPLAY_LAYOUT_LOCAL_BROADCAST_CHANNEL)
    ch.postMessage(layout)
    ch.close()
  } catch {
    /* private mode / quota */
  }
}

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

export type ConnectOptions = {
  hostSecret?: string
  /** Role display: bootstrap when server has no persisted layout */
  displayVenueWall?: boolean
  displayFocusTable?: number | null
  /** Role display only: pairing flow — omit venue until host enters code */
  displayAwaitPairing?: boolean
}

export function connect(
  role: 'host' | 'player' | 'display',
  name: string,
  roomCode: string = 'HOST01',
  tableId: string = '1',
  options?: ConnectOptions
) {
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
      tableId,
      ...(options?.hostSecret?.trim()
        ? { hostSecret: options.hostSecret.trim() }
        : {}),
      ...(role === 'display'
        ? {
            ...(typeof options?.displayVenueWall === 'boolean'
              ? { displayVenueWall: options.displayVenueWall }
              : {}),
            ...(options?.displayFocusTable !== undefined
              ? { displayFocusTable: options.displayFocusTable }
              : {}),
            ...(options?.displayAwaitPairing === true ? { displayAwaitPairing: true } : {}),
          }
        : {}),
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

export function onHostLibrary(callback: (snapshot: HostLibrarySnapshot) => void) {
  if (!socket) return () => {}

  socket.on('hostLibrary', callback)
  return () => {
    if (socket) socket.off('hostLibrary', callback)
  }
}

export function onHostVenueGameplayHints(callback: (payload: HostVenueGameplayHintsPayload) => void) {
  if (!socket) return () => {}

  socket.on('hostVenueGameplayHints', callback)
  return () => {
    if (socket) socket.off('hostVenueGameplayHints', callback)
  }
}

export function onHostVenueFeltBeat(callback: (payload: HostVenueFeltBeatPayload) => void) {
  if (!socket) return () => {}

  socket.on('hostVenueFeltBeat', callback)
  return () => {
    if (socket) socket.off('hostVenueFeltBeat', callback)
  }
}

export function onDisplayLayout(callback: (layout: DisplayLayoutPayload) => void) {
  if (!socket) return () => {}
  socket.on('displayLayout', callback)
  return () => {
    if (socket) socket.off('displayLayout', callback)
  }
}

export function onDisplayVenueSnapshot(callback: (payload: DisplayVenueWallSnapshot) => void) {
  if (!socket) return () => {}
  socket.on('displayVenueSnapshot', callback)
  return () => {
    if (socket) socket.off('displayVenueSnapshot', callback)
  }
}

/** When `keepConnected`, drop pairing listeners only (venue handoff reuse). */
export type DisplayPairingTeardown = (opts?: { keepConnected?: boolean }) => void

export function connectDisplayAwaitingPairing(
  displayName: string,
  handlers: {
    onPairingCode: (code: string) => void
    onVenueAssigned: (venueCode: string) => void
  }
): DisplayPairingTeardown {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  socket = io(socketOrigin())

  const onPairing = (p: { code: string }) => handlers.onPairingCode(p.code)
  const onAssigned = (p: { venueCode: string }) => handlers.onVenueAssigned(p.venueCode)

  socket.on('displayPairingCode', onPairing)
  socket.on('displayVenueAssigned', onAssigned)

  socket.on('connect', () => {
    socket!.emit(
      'hello',
      {
        role: 'display',
        name: displayName,
        roomCode: 'PAIRING',
        tableId: '1',
        displayAwaitPairing: true,
      } as ClientHello
    )
  })

  socket.on('disconnect', () => {
    console.log('Disconnected from server')
  })

  return (opts?: { keepConnected?: boolean }) => {
    if (!socket) return
    socket.off('displayPairingCode', onPairing)
    socket.off('displayVenueAssigned', onAssigned)
    if (!opts?.keepConnected) {
      socket.disconnect()
      socket = null
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

export function questionBankImportRows(rows: unknown[], replace: boolean) {
  if (!socket) return
  socket.emit('action', { type: 'questionBankImportRows', payload: { rows, replace } })
}

export function selectTriviaSetlist(setlistId: string | null) {
  if (!socket) return
  if (setlistId == null || setlistId === '') {
    socket.emit('action', { type: 'selectTriviaSetlist', payload: {} })
  } else {
    socket.emit('action', { type: 'selectTriviaSetlist', payload: { setlistId } })
  }
}

export function nextQuestionFromSetlist() {
  if (!socket) return
  socket.emit('action', { type: 'nextQuestionFromSetlist' })
}

export function setlistCreate(name: string) {
  if (!socket) return
  socket.emit('action', { type: 'setlistCreate', payload: { name } })
}

export function setlistSave(payload: { id: string; name?: string; questionIds?: string[] }) {
  if (!socket) return
  socket.emit('action', { type: 'setlistSave', payload })
}

export function setlistDelete(id: string) {
  if (!socket) return
  socket.emit('action', { type: 'setlistDelete', payload: { id } })
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

export function startAnswering(callback?: (ack: ServerAck) => void): void
export function startAnswering(
  opts: { answerWindowSeconds?: number },
  callback?: (ack: ServerAck) => void
): void
export function startAnswering(
  optsOrCallback?: { answerWindowSeconds?: number } | ((ack: ServerAck) => void),
  maybeCallback?: (ack: ServerAck) => void
) {
  if (!socket) return
  let cb = maybeCallback
  let seconds: number | undefined
  if (typeof optsOrCallback === 'function') {
    cb = optsOrCallback
  } else if (optsOrCallback && typeof optsOrCallback === 'object') {
    const s = optsOrCallback.answerWindowSeconds
    if (typeof s === 'number' && Number.isFinite(s)) seconds = s
  }
  socket.emit('action', {
    type: 'startAnswering',
    ...(seconds !== undefined ? { payload: { answerWindowSeconds: seconds } } : {}),
  })
  if (cb) socket.once('ack', cb)
}

/** Host-only: persist default answer countdown (seconds) for this venue; also in `hostLibrary`. */
export function setVenueAnswerWindowSeconds(seconds: number, callback?: (ack: ServerAck) => void) {
  if (!socket) return
  socket.emit('action', { type: 'setVenueAnswerWindow', payload: { seconds } })
  if (callback) socket.once('ack', callback)
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

/** Host-only: where TVs should point (venue wall vs single felt). */
export function displaySetLayout(layout: DisplayLayoutPayload) {
  if (socket) {
    socket.emit('action', { type: 'displaySetLayout', payload: layout })
  }
  postDisplayLayoutLocal(layout)
}

/** Display: apply host layout changes relayed locally (demo / no server). Cleanup on unsubscribe. */
export function subscribeDisplayLayoutLocal(
  callback: (layout: DisplayLayoutPayload) => void
): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {}
  let ch: BroadcastChannel
  try {
    ch = new BroadcastChannel(DISPLAY_LAYOUT_LOCAL_BROADCAST_CHANNEL)
  } catch {
    return () => {}
  }
  const onMessage = (ev: MessageEvent) => {
    if (!isDisplayLayoutPayloadLocal(ev.data)) return
    callback(ev.data)
  }
  ch.addEventListener('message', onMessage)
  return () => {
    ch.removeEventListener('message', onMessage)
    ch.close()
  }
}

/** Host-only: attach a pairing TV (shows on /display pairing screen) to this venue. Code is 4 characters. */
export function pairDisplayWithHost(code: string, callback?: (ack: ServerAck) => void) {
  if (!socket) return
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
  socket.emit('action', { type: 'pairDisplayWithHost', payload: { code: normalized } })
  if (callback) socket.once('ack', callback)
}
