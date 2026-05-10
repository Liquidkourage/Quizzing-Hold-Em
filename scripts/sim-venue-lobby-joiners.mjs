#!/usr/bin/env node
/**
 * Spawns 20 fake players (display names like "Jordan K.") joining the venue LOBBY
 * at random times within the first 60 seconds so you can watch host + display UIs tick.
 *
 * Usage:
 *   npm run sim:lobby -- HOST01
 *   npm run sim:lobby -- --room HOST01
 *   npm run sim:lobby -- --room=HOST01 [--url=http://127.0.0.1:7777]
 *
 * PowerShell/npm: put a bare **`--`** before `--url`; otherwise npm may not forward it and this
 * script stays on localhost. Bypass npm entirely like this (repo root):
 *   node scripts/sim-venue-lobby-joiners.mjs --room HOST01 --url https://YOUR_DEPLOY_ORIGIN
 *
 * Railway deploy:
 *   npm run sim:lobby -- --room HOST01 --url=https://YOUR_APP.up.railway.app
 * Quick check: https://YOUR_APP.up.railway.app/health should return `ok`.
 *
 * Prereqs: backend reachable at that URL; host opened that room code on this venue.
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
  const raw = process.argv.slice(2)
  const out = {
    url: (
      process.env.SOCKET_URL ||
      process.env.VITE_SOCKET_URL ||
      'http://127.0.0.1:7777'
    ).replace(/\/$/, ''),
    room: String(process.env.ROOM || '').trim().toUpperCase(),
  }

  /** First bare token (often how npm forwards args on Windows) */
  const positionals = []

  for (let i = 0; i < raw.length; i++) {
    const a = raw[i]
    if (a === '--room' || a === '-r') {
      const next = raw[i + 1]
      if (next != null && !next.startsWith('-')) {
        out.room = next.trim().toUpperCase()
        i++
      }
      continue
    }
    if (a.startsWith('--room=')) {
      out.room = a.slice(7).trim().toUpperCase()
      continue
    }
    if (a === '--url' || a === '-u') {
      const next = raw[i + 1]
      if (next != null && !next.startsWith('-')) {
        out.url = next.trim().replace(/\/$/, '')
        i++
      }
      continue
    }
    if (a.startsWith('--url=')) {
      out.url = a.slice(6).trim().replace(/\/$/, '')
      continue
    }
    if (!a.startsWith('-')) positionals.push(a)
  }

  if (!out.room && positionals.length > 0)
    out.room = positionals[0].trim().toUpperCase()

  if (!out.room) {
    console.error(
      [
        'Missing room code.',
        '',
        `  npm run sim:lobby -- HOST01`,
        `  npm run sim:lobby -- --room HOST01`,
        `  npm run sim:lobby -- --room=HOST01 [--url=http://127.0.0.1:7777]`,
        `  ROOM=HOST01 npm run sim:lobby`,
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

/** Best-effort; Engine.IO attaches extra fields inconsistently across versions */
function describeConnectErr(err) {
  if (err == null) return '(no detail)'
  const msg = typeof err.message === 'string' ? err.message : ''
  const cause =
    err.cause &&
    typeof err.cause.message === 'string' &&
    err.cause.message.length > 0
      ? err.cause.message
      : ''
  const desc =
    typeof err.description === 'string' && err.description.length > 0
      ? err.description
      : ''
  return [msg, cause, desc].filter(Boolean).join(' — ') || String(err)
}

async function probeHealth(baseUrl) {
  const healthUrl = `${baseUrl.replace(/\/$/, '')}/health`
  try {
    const res = await fetch(healthUrl, {
      signal: AbortSignal.timeout(8000),
    })
    const text = (await res.text()).trim()
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    if (!text.startsWith('ok')) {
      throw new Error(`unexpected body: ${text.slice(0, 80)}`)
    }
  } catch (e) {
    const why =
      e?.name === 'AbortError'
        ? 'request timed out'
        : (e instanceof Error ? e.message : String(e))
    const targetingLocalLoopback =
      /127\.0\.0\.1|localhost/i.test(baseUrl.replace(/^\s+/, ''))
    /** If user meant remote deploy, `--url` often failed to reach this process (npm omitting `--`) */
    const remoteHint =
      targetingLocalLoopback ?
        [
          '',
          `This URL still looks LOCAL (${baseUrl}). If your backend is on Railway, the flag --url=https://… likely did not reach this script.`,
          '',
          `Use npm’s argument separator (--), then flags:`,
          `  npm run sim:lobby -- --room HOST01 --url=https://YOUR_APP.up.railway.app`,
          `Or call node directly from the repo root (avoids npm):`,
          `  node scripts/sim-venue-lobby-joiners.mjs --room HOST01 --url https://YOUR_APP.up.railway.app`,
          `Or PowerShell:`,
          `  $env:SOCKET_URL='https://YOUR_APP.up.railway.app'`,
          `  npm run sim:lobby -- HOST01`,
          '',
        ].join('\n')
      : ''
    console.error(
      [
        `Could not reach ${healthUrl} (${why}).`,
        '',
        'Start the Socket.IO server first — this script hits the backend port directly:',
        '  npm start --workspace apps/server',
        '  npm run dev   # full stack; server defaults to PORT 7777',
        '',
        `Current socket base URL: ${baseUrl}`,
        'Wrong port or host? Pass `--url=…` AFTER `npm run sim:lobby --` or set SOCKET_URL.',
        '`localhost` vs `127.0.0.1`: this script defaults to 127.0.0.1 to avoid occasional Windows loopback quirks.',
        '',
        ...(remoteHint ? remoteHint.split('\n') : []),
      ].join('\n')
    )
    process.exit(1)
  }
}

async function main() {
  const { url, room } = parseArgs()
  await probeHealth(url)
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
        /** Polling first avoids noisy “websocket error” fallbacks on some setups */
        transports: ['polling', 'websocket'],
        reconnection: false,
        timeout: 25_000,
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
        console.warn(
          `[${stamp()}] connect_error ${name} (${id}/${BOT_COUNT}): ${describeConnectErr(err)}`
        )
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

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
