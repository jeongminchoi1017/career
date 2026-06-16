"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.initSchema = initSchema;
exports.insertLog = insertLog;
exports.getLogs = getLogs;
exports.getLogsByDate = getLogsByDate;
exports.deleteLog = deleteLog;
exports.updateLog = updateLog;
exports.getTodos = getTodos;
exports.insertTodo = insertTodo;
exports.toggleTodo = toggleTodo;
exports.deleteTodo = deleteTodo;
exports.getSetting = getSetting;
exports.setSetting = setSetting;
exports.getWorkTypes = getWorkTypes;
exports.insertWorkType = insertWorkType;
exports.deleteWorkType = deleteWorkType;
exports.reorderWorkTypes = reorderWorkTypes;
exports.getTechTags = getTechTags;
exports.insertTechTag = insertTechTag;
exports.deleteTechTag = deleteTechTag;
exports.getStats = getStats;
exports.cleanGitLogs = cleanGitLogs;
exports.resetAllData = resetAllData;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Database } = require('node-sqlite3-wasm');
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
let db;
function getDb() {
    if (!db) {
        // 개발/운영 모두 동일한 경로 사용 (productName 기준)
        const userDataPath = electron_1.app.getPath('userData').replace(/career-tracker$/i, 'Career Tracker');
        const dbPath = path_1.default.join(userDataPath, 'career-tracker.db');
        // 디렉토리가 없으면 생성
        const fs = require('fs');
        if (!fs.existsSync(userDataPath))
            fs.mkdirSync(userDataPath, { recursive: true });
        db = new Database(dbPath);
        initSchema();
    }
    return db;
}
function toLocalISO(d) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${y}-${mo}-${day}T${h}:${mi}:${s}.${ms}`;
}
function toLocalDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function migrateUTCTimestamps() {
    // Migrate log timestamps from UTC (ends with Z or +offset) to local ISO
    const rows = db.all("SELECT id, timestamp FROM logs WHERE timestamp LIKE '%Z' OR timestamp LIKE '%+%'");
    // Collect date pairs where UTC date != local date (evidence of timezone mismatch)
    const datePairs = new Map(); // utcDate → localDate
    for (const row of rows) {
        const d = new Date(row.timestamp);
        if (isNaN(d.getTime()))
            continue;
        const utcDate = row.timestamp.slice(0, 10);
        const localDate = toLocalDateStr(d);
        if (utcDate !== localDate)
            datePairs.set(utcDate, localDate);
        db.run('UPDATE logs SET timestamp = ? WHERE id = ?', [toLocalISO(d), row.id]);
    }
    // Fix todos whose date was saved as UTC date (e.g. 08:00 KST saved as previous UTC date)
    for (const [utcDate, localDate] of datePairs) {
        db.run('UPDATE todos SET date = ? WHERE date = ?', [localDate, utcDate]);
    }
}
function initSchema() {
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
  `);
    db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      work_type TEXT,
      done INTEGER DEFAULT 0
    )
  `);
    db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
    // Run one-time migrations
    const dbVersion = parseInt(db.get('SELECT value FROM settings WHERE key = ?', ['db_version'])?.value ?? '0');
    if (dbVersion < 1) {
        migrateUTCTimestamps();
        db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['db_version', '1']);
    }
    db.run(`
    CREATE TABLE IF NOT EXISTS work_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER
    )
  `);
    db.run(`CREATE TABLE IF NOT EXISTS tech_tags (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL)`);
    // Default work types
    const wtCount = db.get('SELECT COUNT(*) as c FROM work_types').c;
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
        ];
        for (const [label, color, sort_order] of defaults) {
            db.run('INSERT INTO work_types (label, color, sort_order) VALUES (?, ?, ?)', [label, color, sort_order]);
        }
    }
    // Default tech tags
    const ttCount = db.get('SELECT COUNT(*) as c FROM tech_tags').c;
    if (ttCount === 0) {
        const defaults = ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'NestJS', 'Next.js', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Docker', 'AWS', 'Git', 'GraphQL', 'REST API', 'Tailwind CSS', 'Prisma', 'Jest', 'Vite'];
        for (const label of defaults) {
            db.run('INSERT INTO tech_tags (label) VALUES (?)', [label]);
        }
    }
    // Default settings
    const settingDefaults = [
        ['morning_time', '09:00'],
        ['checkin_interval', '120'],
        ['evening_notify', 'true'],
        ['evening_time', '18:00'],
        ['git_repos', '[]'],
    ];
    for (const [key, value] of settingDefaults) {
        db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    }
}
// --- Logs ---
function insertLog(data) {
    getDb().run(`INSERT INTO logs (timestamp, source, work_type, techs, description, impact, repo, commit_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
        data.timestamp,
        data.source,
        data.work_type ?? null,
        data.techs ? JSON.stringify(data.techs) : null,
        data.description ?? null,
        data.impact ?? null,
        data.repo ?? null,
        data.commit_hash ?? null,
    ]);
}
function getLogs(from, to) {
    const db = getDb();
    if (from && to) {
        return db.all('SELECT * FROM logs WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC', [from, to]);
    }
    return db.all('SELECT * FROM logs ORDER BY timestamp DESC');
}
function getLogsByDate(date) {
    return getDb().all("SELECT * FROM logs WHERE timestamp LIKE ? ORDER BY timestamp ASC", [`${date}%`]);
}
function deleteLog(id) {
    getDb().run('DELETE FROM logs WHERE id = ?', [id]);
}
function updateLog(id, data) {
    getDb().run(`UPDATE logs SET work_type = ?, techs = ?, description = ?, impact = ? WHERE id = ?`, [
        data.work_type ?? null,
        data.techs ? JSON.stringify(data.techs) : null,
        data.description ?? null,
        data.impact ?? null,
        id,
    ]);
}
// --- Todos ---
function getTodos(date) {
    return getDb().all('SELECT * FROM todos WHERE date = ? ORDER BY id ASC', [date]);
}
function insertTodo(date, content, work_type) {
    getDb().run('INSERT INTO todos (date, content, work_type) VALUES (?, ?, ?)', [date, content, work_type ?? null]);
}
function toggleTodo(id, done) {
    getDb().run('UPDATE todos SET done = ? WHERE id = ?', [done ? 1 : 0, id]);
}
function deleteTodo(id) {
    getDb().run('DELETE FROM todos WHERE id = ?', [id]);
}
// --- Settings ---
function getSetting(key) {
    const row = getDb().get('SELECT value FROM settings WHERE key = ?', [key]);
    return row?.value ?? null;
}
function setSetting(key, value) {
    getDb().run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}
// --- Work Types ---
function getWorkTypes() {
    return getDb().all('SELECT * FROM work_types ORDER BY sort_order ASC');
}
function insertWorkType(label, color) {
    const db = getDb();
    const max = db.get('SELECT MAX(sort_order) as m FROM work_types');
    db.run('INSERT INTO work_types (label, color, sort_order) VALUES (?, ?, ?)', [label, color, (max.m ?? 0) + 1]);
}
function deleteWorkType(id) {
    getDb().run('DELETE FROM work_types WHERE id = ?', [id]);
}
function reorderWorkTypes(ids) {
    const db = getDb();
    ids.forEach((id, i) => db.run('UPDATE work_types SET sort_order = ? WHERE id = ?', [i, id]));
}
// --- Tech Tags ---
function getTechTags() {
    return getDb().all('SELECT * FROM tech_tags ORDER BY label ASC');
}
function insertTechTag(label) {
    getDb().run('INSERT INTO tech_tags (label) VALUES (?)', [label]);
}
function deleteTechTag(id) {
    getDb().run('DELETE FROM tech_tags WHERE id = ?', [id]);
}
// --- Stats ---
function getStats() {
    const db = getDb();
    const totalLogs = db.get('SELECT COUNT(*) as c FROM logs').c;
    const totalCommits = db.get("SELECT COUNT(*) as c FROM logs WHERE source = 'git'").c;
    const workDays = db.get("SELECT COUNT(DISTINCT substr(timestamp,1,10)) as c FROM logs").c;
    return { totalLogs, totalCommits, workDays };
}
// --- Clean git logs ---
function cleanGitLogs() {
    getDb().run("DELETE FROM logs WHERE source = 'git'");
}
// --- Reset ---
function resetAllData() {
    const db = getDb();
    db.run('DELETE FROM logs');
    db.run('DELETE FROM todos');
    db.run('DELETE FROM work_types');
    db.run('DELETE FROM tech_tags');
    db.run('DELETE FROM settings');
    initSchema();
}
