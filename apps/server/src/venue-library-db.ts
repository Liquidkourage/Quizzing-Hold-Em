import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { Pool } from 'pg'
import type { Question, Setlist } from '@qhe/core'
import {
  loadVenueLibrariesFromJsonDisk,
  type VenueLibraryData,
} from './venue-library-persist'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_SQLITE_PATH = path.join(__dirname, '..', 'data', 'venue-libraries.sqlite')

function resolveSqlitePath(): string {
  const raw =
    typeof process.env.VENUE_DATABASE_PATH === 'string' ? process.env.VENUE_DATABASE_PATH.trim() : ''
  if (raw) return raw
  return DEFAULT_SQLITE_PATH
}

/** Railway / managed Postgres */
function resolvePostgresUrl(): string | null {
  const u = typeof process.env.DATABASE_URL === 'string' ? process.env.DATABASE_URL.trim() : ''
  return u.length > 0 ? u : null
}

function shouldUseSsl(connectionString: string): boolean {
  const disable =
    process.env.PGSSLMODE === 'disable' ||
    /\bsslmode=disable\b/i.test(connectionString) ||
    /^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)(:\d+)?\//i.test(connectionString)
  return !disable
}

// --- Shared schema (Postgres + SQLite DDL aligned conceptually) -----------------

const PG_INIT_SQL = `
CREATE TABLE IF NOT EXISTS venue_questions (
  venue_code TEXT NOT NULL,
  question_id TEXT NOT NULL,
  text TEXT NOT NULL,
  answer DOUBLE PRECISION NOT NULL,
  category TEXT,
  difficulty INTEGER,
  bank_position INTEGER NOT NULL,
  PRIMARY KEY (venue_code, question_id)
);
CREATE INDEX IF NOT EXISTS idx_vq_venue_bank_pos ON venue_questions (venue_code, bank_position);
CREATE TABLE IF NOT EXISTS venue_setlists (
  venue_code TEXT NOT NULL,
  setlist_id TEXT NOT NULL,
  name TEXT NOT NULL,
  question_ids_json TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (venue_code, setlist_id)
);
`

function mapFromQuestionRows(
  qRows: Array<{
    venue_code: string
    question_id: string
    text: string
    answer: string | number
    category: string | null
    difficulty: string | number | null
    bank_position: string | number
  }>,
  sRows: Array<{
    venue_code: string
    setlist_id: string
    name: string
    question_ids_json: string
  }>,
): Map<string, VenueLibraryData> {
  const map = new Map<string, VenueLibraryData>()

  for (const r of qRows) {
    const k = String(r.venue_code).toUpperCase()
    if (!map.has(k)) map.set(k, { questions: [], setlists: [] })
    const entry = map.get(k)!
    const answer = typeof r.answer === 'string' ? Number(r.answer) : r.answer
    const difficulty =
      r.difficulty == null || r.difficulty === ''
        ? null
        : Number(r.difficulty)
    const q: Question = {
      id: r.question_id,
      text: r.text,
      answer,
      ...(r.category ? { category: r.category } : {}),
      ...(difficulty != null && !Number.isNaN(difficulty) ? { difficulty } : {}),
    }
    entry.questions.push(q)
  }

  for (const r of sRows) {
    const k = String(r.venue_code).toUpperCase()
    if (!map.has(k)) map.set(k, { questions: [], setlists: [] })
    const entry = map.get(k)!
    let questionIds: string[] = []
    try {
      const parsed = JSON.parse(r.question_ids_json)
      if (Array.isArray(parsed)) {
        questionIds = parsed
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .map((x) => x.trim())
      }
    } catch {
      questionIds = []
    }
    const sl: Setlist = { id: r.setlist_id, name: r.name, questionIds }
    entry.setlists.push(sl)
  }

  return map
}

// --- PostgreSQL ----------------------------------------------------------------

let pgPool: Pool | null = null
let pgSchemaReady = false

function getPgPool(): Pool {
  const url = resolvePostgresUrl()
  if (!url) throw new Error('DATABASE_URL is not set')
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
      ssl: shouldUseSsl(url) ? { rejectUnauthorized: false } : undefined,
    })
  }
  return pgPool
}

async function ensurePgSchema(pool: Pool): Promise<void> {
  if (pgSchemaReady) return
  await pool.query(PG_INIT_SQL)
  pgSchemaReady = true
}

async function migrateLegacyJsonIfPgEmpty(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ c: string }>('SELECT COUNT(*)::text AS c FROM venue_questions')
  const c = Number(rows[0]?.c ?? 0)
  if (c > 0) return
  const fromDisk = loadVenueLibrariesFromJsonDisk()
  if (fromDisk.size === 0) return
  await persistAllPostgres(pool, fromDisk)
}

async function persistAllPostgres(pool: Pool, map: Map<string, VenueLibraryData>): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM venue_questions')
    await client.query('DELETE FROM venue_setlists')
    for (const [venue, lib] of map) {
      const v = venue.toUpperCase()
      for (let i = 0; i < lib.questions.length; i++) {
        const q = lib.questions[i]
        await client.query(
          `INSERT INTO venue_questions (venue_code, question_id, text, answer, category, difficulty, bank_position)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [v, q.id, q.text, q.answer, q.category ?? null, q.difficulty ?? null, i],
        )
      }
      for (const sl of lib.setlists) {
        await client.query(
          `INSERT INTO venue_setlists (venue_code, setlist_id, name, question_ids_json)
           VALUES ($1,$2,$3,$4)`,
          [v, sl.id, sl.name, JSON.stringify(sl.questionIds)],
        )
      }
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

async function loadPostgres(): Promise<Map<string, VenueLibraryData>> {
  const pool = getPgPool()
  await ensurePgSchema(pool)
  await migrateLegacyJsonIfPgEmpty(pool)
  const [qRes, sRes] = await Promise.all([
    pool.query(
      `SELECT venue_code, question_id, text, answer, category, difficulty, bank_position
       FROM venue_questions ORDER BY venue_code ASC, bank_position ASC`,
    ),
    pool.query(
      `SELECT venue_code, setlist_id, name, question_ids_json FROM venue_setlists
       ORDER BY venue_code ASC, setlist_id ASC`,
    ),
  ])
  return mapFromQuestionRows(
    qRes.rows as Parameters<typeof mapFromQuestionRows>[0],
    sRes.rows as Parameters<typeof mapFromQuestionRows>[1],
  )
}

async function persistPostgres(map: Map<string, VenueLibraryData>): Promise<void> {
  const pool = getPgPool()
  await ensurePgSchema(pool)
  await persistAllPostgres(pool, map)
}

// --- SQLite (local fallback when DATABASE_URL unset) ----------------------------

let sqliteSingleton: Database | null = null

function openSqliteDatabase(): Database {
  if (sqliteSingleton) return sqliteSingleton
  const resolved = resolveSqlitePath()
  fs.mkdirSync(path.dirname(resolved), { recursive: true })
  const db = new Database(resolved)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSqliteSchema(db)
  migrateLegacySqliteIfEmpty(db)
  sqliteSingleton = db
  return db
}

function initSqliteSchema(db: Database): void {
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

function migrateLegacySqliteIfEmpty(db: Database): void {
  const row = db.prepare('SELECT COUNT(*) AS c FROM venue_questions').get() as { c: number }
  if (row.c > 0) return
  const fromDisk = loadVenueLibrariesFromJsonDisk()
  if (fromDisk.size === 0) return
  persistAllSqlite(db, fromDisk)
}

function persistAllSqlite(db: Database, map: Map<string, VenueLibraryData>): void {
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

function loadSqliteSync(): Map<string, VenueLibraryData> {
  const db = openSqliteDatabase()
  const qRows = db
    .prepare(
      `SELECT venue_code, question_id, text, answer, category, difficulty, bank_position
       FROM venue_questions ORDER BY venue_code ASC, bank_position ASC`,
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
      `SELECT venue_code, setlist_id, name, question_ids_json FROM venue_setlists
       ORDER BY venue_code ASC, setlist_id ASC`,
    )
    .all() as Array<{
    venue_code: string
    setlist_id: string
    name: string
    question_ids_json: string
  }>
  return mapFromQuestionRows(qRows as Parameters<typeof mapFromQuestionRows>[0], sRows)
}

function persistSqliteSync(map: Map<string, VenueLibraryData>): void {
  const db = openSqliteDatabase()
  persistAllSqlite(db, map)
}

// --- Public API ----------------------------------------------------------------

export async function persistVenueLibraries(map: Map<string, VenueLibraryData>): Promise<void> {
  if (resolvePostgresUrl()) {
    await persistPostgres(map)
    return
  }
  persistSqliteSync(map)
}

export async function loadVenueLibraries(): Promise<Map<string, VenueLibraryData>> {
  if (resolvePostgresUrl()) {
    return loadPostgres()
  }
  return loadSqliteSync()
}
