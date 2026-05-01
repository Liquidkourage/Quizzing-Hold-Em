import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Question } from '@qhe/core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** Persisted alongside compiled output → `apps/server/data/question-banks.json` */
export const QUESTION_BANKS_FILE = path.join(__dirname, '..', 'data', 'question-banks.json')

function normalizeImportedQuestion(normVenuePrefix: string, q: unknown, index: number): Question | null {
  if (!q || typeof q !== 'object') return null
  const o = q as Record<string, unknown>
  const text = typeof o.text === 'string' ? o.text.trim() : ''
  const answer = Number(o.answer)
  if (!text || Number.isNaN(answer)) return null
  let id =
    typeof o.id === 'string' && o.id.trim().length > 0 ? o.id.trim() : ''
  if (!id) id = `imp-${normVenuePrefix}-${index}-${Date.now().toString(36)}`
  let category: string | undefined
  if (typeof o.category === 'string' && o.category.trim()) category = o.category.trim()
  let difficulty: number | undefined
  const d = Number(o.difficulty)
  if (!Number.isNaN(d) && d >= 1 && d <= 5) difficulty = d
  return { id, text, answer, category, difficulty }
}

export function loadVenueQuestionBanks(): Map<string, Question[]> {
  const out = new Map<string, Question[]>()
  try {
    const txt = fs.readFileSync(QUESTION_BANKS_FILE, 'utf8')
    const obj = JSON.parse(txt) as Record<string, unknown>
    if (!obj || typeof obj !== 'object') return out
    for (const [key, arr] of Object.entries(obj)) {
      const norm = key.trim().toUpperCase()
      if (!Array.isArray(arr)) continue
      const list: Question[] = []
      for (let i = 0; i < arr.length; i++) {
        const q = normalizeImportedQuestion(norm, arr[i], i)
        if (q) list.push(q)
      }
      if (list.length > 0) out.set(norm, list)
    }
  } catch {
    /** missing or corrupt file → start fresh */
  }
  return out
}

export function persistVenueQuestionBanks(map: Map<string, Question[]>): void {
  fs.mkdirSync(path.dirname(QUESTION_BANKS_FILE), { recursive: true })
  const obj: Record<string, Question[]> = {}
  for (const [k, v] of map) obj[k] = v.map((q) => ({ ...q }))
  fs.writeFileSync(QUESTION_BANKS_FILE, `${JSON.stringify(obj, null, 2)}\n`, 'utf8')
}

export function coerceImportQuestions(
  normVenue: string,
  rows: unknown[]
): Question[] {
  const validated: Question[] = []
  for (let i = 0; i < rows.length; i++) {
    const q = normalizeImportedQuestion(normVenue, rows[i], i)
    if (q) validated.push(q)
  }
  return validated
}
