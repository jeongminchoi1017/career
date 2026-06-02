// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Database } = require('node-sqlite3-wasm') as { Database: new (path: string) => DB }
import path from 'path'
import { app } from 'electron'

interface DB {
  run(sql: string, params?: unknown[]): void
  get(sql: string, params?: unknown[]): unknown
  all(sql: string, params?: unknown[]): unknown[]
  close(): void
}

let db: DB

export function getDb(): DB {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'career-tracker.db')
    db = new Database(dbPath)
    initSchema()
  }
  return db
}

export function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      source TEXT NOT NULL,
      work_type TEXT,
      techs TEXT,
      description TEXT,
      impact TEXT,
      repo TEXT,
      commit_hash TEXT
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      work_type TEXT,
      done INTEGER DEFAULT 0
    )
  `)
  db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`)
  db.run(`
    CREATE TABLE IF NOT EXISTS work_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER
    )
  `)
  db.run(`CREATE TABLE IF NOT EXISTS tech_tags (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL)`)

  // Default work types
  const wtCount = (db.get('SELECT COUNT(*) as c FROM work_types') as { c: number }).c
  if (wtCount === 0) {
    const defaults = [
      ['기능 개발', '#6366f1', 0],
      ['버그 수정', '#ef4444', 1],
      ['리팩토링', '#f59e0b', 2],
      ['코드 리뷰', '#10b981', 3],
      ['문서 작업', '#3b82f6', 4],
      ['테스트', '#8b5cf6', 5],
      ['배포/인프라', '#06b6d4', 6],
      ['회의/기획', '#ec4899', 7],
    ]
    for (const [label, color, sort_order] of defaults) {
      db.run('INSERT INTO work_types (label, color, sort_order) VALUES (?, ?, ?)', [label, color, sort_order])
    }
  }

  // Default tech tags
  const ttCount = (db.get('SELECT COUNT(*) as c FROM tech_tags') as { c: number }).c
  if (ttCount === 0) {
    const defaults = ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'NestJS', 'Next.js', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Docker', 'AWS', 'Git', 'GraphQL', 'REST API', 'Tailwind CSS', 'Prisma', 'Jest', 'Vite']
    for (const label of defaults) {
      db.run('INSERT INTO tech_tags (label) VALUES (?)', [label])
    }
  }

  // Default settings
  const settingDefaults: [string, string][] = [
    ['morning_time', '09:00'],
    ['checkin_interval', '120'],
    ['evening_notify', 'true'],
    ['evening_time', '18:00'],
    ['git_repos', '[]'],
  ]
  for (const [key, value] of settingDefaults) {
    db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value])
  }
}

// --- Logs ---
export function insertLog(data: {
  timestamp: string
  source: string
  work_type?: string
  techs?: string[]
  description?: string
  impact?: string
  repo?: string
  commit_hash?: string
}) {
  getDb().run(
    `INSERT INTO logs (timestamp, source, work_type, techs, description, impact, repo, commit_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.timestamp,
      data.source,
      data.work_type ?? null,
      data.techs ? JSON.stringify(data.techs) : null,
      data.description ?? null,
      data.impact ?? null,
      data.repo ?? null,
      data.commit_hash ?? null,
    ]
  )
}

export function getLogs(from?: string, to?: string) {
  const db = getDb()
  if (from && to) {
    return db.all('SELECT * FROM logs WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC', [from, to])
  }
  return db.all('SELECT * FROM logs ORDER BY timestamp DESC')
}

export function getLogsByDate(date: string) {
  return getDb().all("SELECT * FROM logs WHERE timestamp LIKE ? ORDER BY timestamp ASC", [`${date}%`])
}

export function deleteLog(id: number) {
  getDb().run('DELETE FROM logs WHERE id = ?', [id])
}

// --- Todos ---
export function getTodos(date: string) {
  return getDb().all('SELECT * FROM todos WHERE date = ? ORDER BY id ASC', [date])
}

export function insertTodo(date: string, content: string, work_type?: string) {
  getDb().run('INSERT INTO todos (date, content, work_type) VALUES (?, ?, ?)', [date, content, work_type ?? null])
}

export function toggleTodo(id: number, done: boolean) {
  getDb().run('UPDATE todos SET done = ? WHERE id = ?', [done ? 1 : 0, id])
}

export function deleteTodo(id: number) {
  getDb().run('DELETE FROM todos WHERE id = ?', [id])
}

// --- Settings ---
export function getSetting(key: string): string | null {
  const row = getDb().get('SELECT value FROM settings WHERE key = ?', [key]) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string) {
  getDb().run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
}

// --- Work Types ---
export function getWorkTypes() {
  return getDb().all('SELECT * FROM work_types ORDER BY sort_order ASC')
}

export function insertWorkType(label: string, color: string) {
  const db = getDb()
  const max = db.get('SELECT MAX(sort_order) as m FROM work_types') as { m: number | null }
  db.run('INSERT INTO work_types (label, color, sort_order) VALUES (?, ?, ?)', [label, color, (max.m ?? 0) + 1])
}

export function deleteWorkType(id: number) {
  getDb().run('DELETE FROM work_types WHERE id = ?', [id])
}

export function reorderWorkTypes(ids: number[]) {
  const db = getDb()
  ids.forEach((id, i) => db.run('UPDATE work_types SET sort_order = ? WHERE id = ?', [i, id]))
}

// --- Tech Tags ---
export function getTechTags() {
  return getDb().all('SELECT * FROM tech_tags ORDER BY label ASC')
}

export function insertTechTag(label: string) {
  getDb().run('INSERT INTO tech_tags (label) VALUES (?)', [label])
}

export function deleteTechTag(id: number) {
  getDb().run('DELETE FROM tech_tags WHERE id = ?', [id])
}

// --- Stats ---
export function getStats() {
  const db = getDb()
  const totalLogs = (db.get('SELECT COUNT(*) as c FROM logs') as { c: number }).c
  const totalCommits = (db.get("SELECT COUNT(*) as c FROM logs WHERE source = 'git'") as { c: number }).c
  const workDays = (db.get("SELECT COUNT(DISTINCT substr(timestamp,1,10)) as c FROM logs") as { c: number }).c
  return { totalLogs, totalCommits, workDays }
}

// --- Reset ---
export function resetAllData() {
  const db = getDb()
  db.run('DELETE FROM logs')
  db.run('DELETE FROM todos')
  db.run('DELETE FROM work_types')
  db.run('DELETE FROM tech_tags')
  db.run('DELETE FROM settings')
  initSchema()
}
