import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const VENUE_ANSWER_SETTINGS_FILE = path.join(__dirname, '..', 'data', 'venue-answer-settings.json')

/** Host / env default for `startAnswering` countdown (seconds). */
export const ANSWER_WINDOW_MIN_SEC = 15
export const ANSWER_WINDOW_MAX_SEC = 300

const overrides = new Map<string, number>()

function clampSec(n: number): number {
  const x = Math.floor(Number(n))
  if (!Number.isFinite(x)) return 45
  return Math.min(ANSWER_WINDOW_MAX_SEC, Math.max(ANSWER_WINDOW_MIN_SEC, x))
}

export function parseDefaultAnswerWindowFromEnv(): number {
  const raw = Number(
    process.env.ANSWER_WINDOW_SECONDS ?? process.env.ANSWER_WINDOW_SEC ?? '45',
  )
  if (!Number.isFinite(raw)) return 45
  return clampSec(raw)
}

let envDefaultSec = 45

export function initAnswerWindowEnvDefault(): void {
  envDefaultSec = parseDefaultAnswerWindowFromEnv()
}

function normalizeVenueKey(venue: string): string {
  return String(venue ?? '')
    .trim()
    .toUpperCase()
}

type StoreShape = Record<string, { answerWindowSeconds?: number }>

export function loadVenueAnswerWindowSettingsFromDisk(): void {
  overrides.clear()
  try {
    const txt = fs.readFileSync(VENUE_ANSWER_SETTINGS_FILE, 'utf8')
    const obj = JSON.parse(txt) as StoreShape
    if (!obj || typeof obj !== 'object') return
    for (const [k, v] of Object.entries(obj)) {
      const vn = normalizeVenueKey(k)
      if (!vn) continue
      const sec = typeof v?.answerWindowSeconds === 'number' ? v.answerWindowSeconds : NaN
      if (!Number.isFinite(sec)) continue
      overrides.set(vn, clampSec(sec))
    }
  } catch {
    /* missing file is fine */
  }
}

function persistToDisk(): void {
  const obj: StoreShape = {}
  for (const [k, sec] of overrides) {
    obj[k] = { answerWindowSeconds: sec }
  }
  const dir = path.dirname(VENUE_ANSWER_SETTINGS_FILE)
  try {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(VENUE_ANSWER_SETTINGS_FILE, `${JSON.stringify(obj, null, 2)}\n`, 'utf8')
  } catch (e) {
    console.error('Failed to persist venue answer window settings:', e)
  }
}

export function getVenueAnswerWindowSeconds(venueCode: string): number {
  const k = normalizeVenueKey(venueCode)
  const o = overrides.get(k)
  if (typeof o === 'number' && Number.isFinite(o)) return o
  return envDefaultSec
}

/** Saves override for this venue and persists to disk. */
export function setVenueAnswerWindowSecondsPersist(venueCode: string, seconds: number): number {
  const k = normalizeVenueKey(venueCode)
  const sec = clampSec(seconds)
  overrides.set(k, sec)
  persistToDisk()
  return sec
}

export function resolveAnswerWindowSecondsForStart(venueCode: string, payloadUnknown: unknown): number {
  if (payloadUnknown != null && typeof payloadUnknown === 'object') {
    const raw = (payloadUnknown as { answerWindowSeconds?: unknown }).answerWindowSeconds
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return clampSec(raw)
    }
  }
  return getVenueAnswerWindowSeconds(venueCode)
}
