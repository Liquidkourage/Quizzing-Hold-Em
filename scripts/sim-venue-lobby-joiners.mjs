#!/usr/bin/env node
/**
 * Spawns 20 fake players (display names like "Jordan K.") joining the venue LOBBY
 * at random times within the first 60 seconds so you can watch host + display UIs tick.
 *
 * Usage:
 *   npm run sim:lobby -- --room=YOURCODE [--url=http://localhost:7777]
 *
 * Prereqs: game server running; host has created the event with that room code.
 */

import { io } from 'socket.io-client'

const LOBBY = 'LOBBY'
const JOIN_WINDOW_MS = 60_000
const BOT_COUNT = 20

/** @type {readonly string[]} */
const FIRST_NAMES = [
  'Jordan',
  'Riley',
  'Casey',
  'Alex',
  'Quinn',
  'Morgan',
  'Reese',
  'Avery',
  'Skyler',
  'Drew',
  'Jamie',
  'Sam',
  'Cameron',
  'Taylor',
  'Jessie',
  'Rowan',
  'Sydney',
  'Blake',
  'Emerson',
  'Finley',
  'Hayden',
  'Logan',
  'Parker',
  'River',
  'Sage',
]

/** @type {readonly string[]} */
const LAST_INITIALS = 'ABCDEFGHJKLMNPRTWXYZ'.split('')

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** @returns {{ url: string, room: string }} */
function parseArgs() {
  const out = {
    url: (
      process.env.SOCKET_URL ||
      process.env.VITE_SOCKET_URL ||
      'http://localhost:7777'
    ).replace(/\/$/, ''),
    room: (process.env.ROOM || '').trim().toUpperCase(),
  }
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--room='))
      out.room = a.slice(7).trim().toUpperCase()
    else if (a.startsWith('--url='))
      out.url = a.slice(6).trim().replace(/\/$/, '')
  }
  if (!out.room) {
    console.error(
      [
        'Missing room code.',
        '',
        `  npm run sim:lobby -- --room=YOURCODE [--url=http://localhost:7777]`,
        `  SOCKET_URL=http://localhost:7777 ROOM=YOURCODE npm run sim:lobby`,
        '',
      ].join('\n')
    )
    process.exit(1)
  }
  return out
}

function generateBotNames(count) {
  const combos = []
  for (const f of FIRST_NAMES) {
    for (const L of LAST_INITIALS) {
      combos.push(`${f} ${L}.`)
    }
  }
  shuffleInPlace(combos)
  if (combos.length < count) throw new Error('Not enough unique name combos')
  return combos.slice(0, count)
}

function scheduleDelayMs(withinMs) {
  return Math.floor(Math.random() * (withinMs + 1))
}

function stamp() {
  return new Date().toISOString().slice(11, 23)
}

function main() {
  const { url, room } = parseArgs()
  const names = generateBotNames(BOT_COUNT)
  const sockets = []
  const timeouts = []
  let exited = false

  console.log(`Simulating ${BOT_COUNT} lobby joiners → ${url}  room=${room}`)
  console.log(`Each connects within 0–${JOIN_WINDOW_MS / 1000}s; sockets stay open (Ctrl+C to quit).\n`)

  for (let i = 0; i < BOT_COUNT; i++) {
    const delay = scheduleDelayMs(JOIN_WINDOW_MS)
    const name = names[i]
    const id = i + 1

    const tid = globalThis.setTimeout(() => {
      if (exited) return
      const socket = io(url, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      })

      sockets.push(socket)

      socket.on('connect', () => {
        socket.emit('hello', {
          role: 'player',
          name,
          roomCode: room,
          tableId: LOBBY,
        })
      })

      socket.on('ack', (ack) => {
        if (ack?.ok) {
          console.log(
            `[${stamp()}] ✓ ${id}/${BOT_COUNT} ${name} (${socket.id.slice(0, 8)})`
          )
        } else {
          console.warn(
            `[${stamp()}] ✗ ${id}/${BOT_COUNT} ${name}: ${ack?.message ?? JSON.stringify(ack)}`
          )
        }
      })

      socket.on('connect_error', (err) => {
        console.warn(`connect_error ${name}:`, err?.message ?? err)
      })

      socket.on('disconnect', (reason) => {
        console.log(`disconnect ${name}: ${reason}`)
      })
    }, delay)
    timeouts.push(tid)
  }

  const shutdown = () => {
    exited = true
    for (const t of timeouts) {
      globalThis.clearTimeout(t)
    }
    console.log('\nDisconnecting bots…')
    for (const s of sockets) {
      try {
        s.close()
      } catch {
        /* ignore */
      }
    }
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main()
