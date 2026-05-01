/** Parse `{ "questions": [...] }` or a bare array of question-like objects */
export function parseQuestionsJson(raw: string): Record<string, unknown>[] {
  const j = JSON.parse(raw)
  if (Array.isArray(j)) return j as Record<string, unknown>[]
  if (j && typeof j === 'object' && Array.isArray((j as Record<string, unknown>).questions))
    return (j as Record<string, unknown>).questions as Record<string, unknown>[]
  throw new Error('JSON must be [ ... ] or { "questions": [ ... ] }')
}

/** Simple CSV with header row: text, answer, optional category & difficulty */
export function parseQuestionsCsv(csv: string): Record<string, unknown>[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((line) => line.length > 0)
  if (lines.length < 2) throw new Error('CSV needs a header row and at least one data row')

  const parseLine = (line: string): string[] => {
    const cells: string[] = []
    let cur = ''
    let quoted = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      const next = line[i + 1]
      if (c === '"' && quoted && next === '"') {
        cur += '"'
        i++
        continue
      }
      if (c === '"') {
        quoted = !quoted
        continue
      }
      if (!quoted && c === ',') {
        cells.push(cur.trim())
        cur = ''
        continue
      }
      cur += c
    }
    cells.push(cur.trim())
    return cells
  }

  const headerCells = parseLine(lines[0]!).map((s) =>
    s.replace(/^\ufeff/, '').toLowerCase().replace(/^"|"$/g, '').trim(),
  )

  const col = (...names: string[]) => {
    for (const n of names) {
      const i = headerCells.indexOf(n.toLowerCase())
      if (i >= 0) return i
    }
    return -1
  }
  const ixText = col('text', 'question', 'prompt')
  const ixAnswer = col('answer', 'correct')
  if (ixText < 0 || ixAnswer < 0) throw new Error('CSV header must include text (or question) and answer columns')
  const ixCat = col('category')
  const ixDiff = col('difficulty')

  const out: Record<string, unknown>[] = []
  for (let r = 1; r < lines.length; r++) {
    const cells = parseLine(lines[r]!)
    const strip = (s: string) => s.replace(/^"|"$/g, '').trim()
    const text = strip(cells[ixText] ?? '').replace(/^"|"$/g, '')
    const ansRaw = strip(cells[ixAnswer] ?? '')
    const row: Record<string, unknown> = { text, answer: Number(ansRaw) }
    if (ixCat >= 0 && cells[ixCat]) row.category = strip(cells[ixCat]!)
    if (ixDiff >= 0 && cells[ixDiff]) row.difficulty = Number(strip(cells[ixDiff]!))
    out.push(row)
  }
  return out
}
