import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import type { Question, Setlist } from '@qhe/core'
import {
  loadVenueLibrariesFromJsonDisk,
  type VenueLibraryData,
} from './venue-library-persist'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'venue-libraries.sqlite')

function resolveDbPath(): string {
  const raw = typeof process.env.VENUE_DATABASE_PATH === 'string' ? process.env.VENUE_DATABASE_PATH.trim() : ''
  if (raw) return raw
  return DEFAULT_DB_PATH
}

let singleton: Database | null = null

function openDatabase(): Database {
  if (singleton) return singleton
  const resolved = resolveDbPath()
  fs.mkdirSync(path.dirname(resolved), { recursive: true })
  const db = new Database(resolved)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSchema(db)
  migrateLegacyJsonIfEmpty(db)
  singleton = db
  return db
}

function initSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS venue_questions (
      venue_code TEXT NOT NULL,
      question_id TEXT NOT NULL,
      text TEXT NOT NULL,
      answer REAL NOT NULL,
      category TEXT,
      difficulty INTEGER,
      bank_position INTEGER NOT NULL,
      PRIMARY KEY (venue_code, question_id)
    );
    CREATE INDEX IF NOT EXISTS idx_vq_venue_bank_pos
      ON venue_questions (venue_code, bank_position);
    CREATE TABLE IF NOT EXISTS venue_setlists (
      venue_code TEXT NOT NULL,
      setlist_id TEXT NOT NULL,
      name TEXT NOT NULL,
      question_ids_json TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (venue_code, setlist_id)
    );
  `)
}

function migrateLegacyJsonIfEmpty(db: Database): void {
  const row = db.prepare('SELECT COUNT(*) AS c FROM venue_questions').get() as { c: number }
  if (row.c > 0) return
  const fromDisk = loadVenueLibrariesFromJsonDisk()
  if (fromDisk.size === 0) return
  persistAll(db, fromDisk)
}

function persistAll(db: Database, map: Map<string, VenueLibraryData>): void {
  const delQ = db.prepare('DELETE FROM venue_questions')
  const delS = db.prepare('DELETE FROM venue_setlists')
  const insQ = db.prepare(`
    INSERT INTO venue_questions (venue_code, question_id, text, answer, category, difficulty, bank_position)
    VALUES (@venue_code, @question_id, @text, @answer, @category, @difficulty, @bank_position)
  `)
  const insS = db.prepare(`
    INSERT INTO venue_setlists (venue_code, setlist_id, name, question_ids_json)
    VALUES (@venue_code, @setlist_id, @name, @question_ids_json)
  `)

  const tx = db.transaction(() => {
    delQ.run()
    delS.run()
    for (const [venue, lib] of map) {
      const v = venue.toUpperCase()
      lib.questions.forEach((q, i) => {
        insQ.run({
          venue_code: v,
          question_id: q.id,
          text: q.text,
          answer: q.answer,
          category: q.category ?? null,
          difficulty: q.difficulty ?? null,
          bank_position: i,
        })
      })
      for (const sl of lib.setlists) {
        insS.run({
          venue_code: v,
          setlist_id: sl.id,
          name: sl.name,
          question_ids_json: JSON.stringify(sl.questionIds),
        })
      }
    }
  })
  tx()
}

export function persistVenueLibraries(map: Map<string, VenueLibraryData>): void {
  const db = openDatabase()
  persistAll(db, map)
}

export function loadVenueLibraries(): Map<string, VenueLibraryData> {
  const db = openDatabase()
  const map = new Map<string, VenueLibraryData>()

  const qRows = db
    .prepare(
      `SELECT venue_code, question_id, text, answer, category, difficulty, bank_position
       FROM venue_questions
       ORDER BY venue_code ASC, bank_position ASC`
    )
    .all() as Array<{
    venue_code: string
    question_id: string
    text: string
    answer: number
    category: string | null
    difficulty: number | null
    bank_position: number
  }>

  const sRows = db
    .prepare(
      `SELECT venue_code, setlist_id, name, question_ids_json FROM venue_setlists ORDER BY venue_code ASC, setlist_id ASC`
    )
    .all() as Array<{
    venue_code: string
    setlist_id: string
    name: string
    question_ids_json: string
  }>

  for (const r of qRows) {
    const k = r.venue_code.toUpperCase()
    if (!map.has(k)) map.set(k, { questions: [], setlists: [] })
    const entry = map.get(k)!
    const q: Question = {
      id: r.question_id,
      text: r.text,
      answer: r.answer,
      ...(r.category ? { category: r.category } : {}),
      ...(r.difficulty != null && !Number.isNaN(r.difficulty) ? { difficulty: r.difficulty } : {}),
    }
    entry.questions.push(q)
  }

  for (const r of sRows) {
    const k = r.venue_code.toUpperCase()
    if (!map.has(k)) map.set(k, { questions: [], setlists: [] })
    const entry = map.get(k)!
    let questionIds: string[] = []
    try {
      const parsed = JSON.parse(r.question_ids_json)
      if (Array.isArray(parsed)) {
        questionIds = parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())
      }
    } catch {
      questionIds = []
    }
    const sl: Setlist = { id: r.setlist_id, name: r.name, questionIds }
    entry.setlists.push(sl)
  }

  return map
}
