import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'career-tracker.db')
    db = new Database(dbPath)
    initSchema()
  }
  return db
}

function initSchema() {
  db.exec(`
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
    );

    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      work_type TEXT,
      done INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS work_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER
    );

    CREATE TABLE IF NOT EXISTS tech_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL
    );
  `)

  // Insert defaults if empty
  const wtCount = db.prepare('SELECT COUNT(*) as c FROM work_types').get() as { c: number }
  if (wtCount.c === 0) {
    const insert = db.prepare('INSERT INTO work_types (label, color, sort_order) VALUES (?, ?, ?)')
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
      insert.run(label, color, sort_order)
    }
  }

  const ttCount = db.prepare('SELECT COUNT(*) as c FROM tech_tags').get() as { c: number }
  if (ttCount.c === 0) {
    const insert = db.prepare('INSERT INTO tech_tags (label) VALUES (?)')
    const defaults = ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'NestJS', 'Next.js', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Docker', 'AWS', 'Git', 'GraphQL', 'REST API', 'Tailwind CSS', 'Prisma', 'Jest', 'Vite']
    for (const label of defaults) {
      insert.run(label)
    }
  }

  // Default settings
  const defaults: [string, string][] = [
    ['morning_time', '09:00'],
    ['checkin_interval', '120'],
    ['evening_notify', 'true'],
    ['evening_time', '18:00'],
    ['git_repos', '[]'],
  ]
  const upsert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  for (const [key, value] of defaults) {
    upsert.run(key, value)
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
  const db = getDb()
  return db.prepare(`
    INSERT INTO logs (timestamp, source, work_type, techs, description, impact, repo, commit_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.timestamp,
    data.source,
    data.work_type ?? null,
    data.techs ? JSON.stringify(data.techs) : null,
    data.description ?? null,
    data.impact ?? null,
    data.repo ?? null,
    data.commit_hash ?? null,
  )
}

export function getLogs(from?: string, to?: string) {
  const db = getDb()
  if (from && to) {
    return db.prepare('SELECT * FROM logs WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC').all(from, to)
  }
  return db.prepare('SELECT * FROM logs ORDER BY timestamp DESC').all()
}

export function getLogsByDate(date: string) {
  const db = getDb()
  return db.prepare("SELECT * FROM logs WHERE timestamp LIKE ? ORDER BY timestamp ASC").all(`${date}%`)
}

export function deleteLog(id: number) {
  getDb().prepare('DELETE FROM logs WHERE id = ?').run(id)
}

// --- Todos ---
export function getTodos(date: string) {
  return getDb().prepare('SELECT * FROM todos WHERE date = ? ORDER BY id ASC').all(date)
}

export function insertTodo(date: string, content: string, work_type?: string) {
  return getDb().prepare('INSERT INTO todos (date, content, work_type) VALUES (?, ?, ?)').run(date, content, work_type ?? null)
}

export function toggleTodo(id: number, done: boolean) {
  return getDb().prepare('UPDATE todos SET done = ? WHERE id = ?').run(done ? 1 : 0, id)
}

export function deleteTodo(id: number) {
  return getDb().prepare('DELETE FROM todos WHERE id = ?').run(id)
}

// --- Settings ---
export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string) {
  return getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

// --- Work Types ---
export function getWorkTypes() {
  return getDb().prepare('SELECT * FROM work_types ORDER BY sort_order ASC').all()
}

export function insertWorkType(label: string, color: string) {
  const db = getDb()
  const max = db.prepare('SELECT MAX(sort_order) as m FROM work_types').get() as { m: number | null }
  return db.prepare('INSERT INTO work_types (label, color, sort_order) VALUES (?, ?, ?)').run(label, color, (max.m ?? 0) + 1)
}

export function deleteWorkType(id: number) {
  return getDb().prepare('DELETE FROM work_types WHERE id = ?').run(id)
}

export function reorderWorkTypes(ids: number[]) {
  const update = getDb().prepare('UPDATE work_types SET sort_order = ? WHERE id = ?')
  ids.forEach((id, i) => update.run(i, id))
}

// --- Tech Tags ---
export function getTechTags() {
  return getDb().prepare('SELECT * FROM tech_tags ORDER BY label ASC').all()
}

export function insertTechTag(label: string) {
  return getDb().prepare('INSERT INTO tech_tags (label) VALUES (?)').run(label)
}

export function deleteTechTag(id: number) {
  return getDb().prepare('DELETE FROM tech_tags WHERE id = ?').run(id)
}

// --- Stats ---
export function getStats() {
  const db = getDb()
  const totalLogs = (db.prepare('SELECT COUNT(*) as c FROM logs').get() as { c: number }).c
  const totalCommits = (db.prepare("SELECT COUNT(*) as c FROM logs WHERE source = 'git'").get() as { c: number }).c
  const workDays = (db.prepare("SELECT COUNT(DISTINCT substr(timestamp,1,10)) as c FROM logs").get() as { c: number }).c
  return { totalLogs, totalCommits, workDays }
}
