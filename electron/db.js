"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.insertLog = insertLog;
exports.getLogs = getLogs;
exports.getLogsByDate = getLogsByDate;
exports.deleteLog = deleteLog;
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
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
let db;
function getDb() {
    if (!db) {
        const dbPath = path_1.default.join(electron_1.app.getPath('userData'), 'career-tracker.db');
        db = new better_sqlite3_1.default(dbPath);
        initSchema();
    }
    return db;
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
  `);
    // Insert defaults if empty
    const wtCount = db.prepare('SELECT COUNT(*) as c FROM work_types').get();
    if (wtCount.c === 0) {
        const insert = db.prepare('INSERT INTO work_types (label, color, sort_order) VALUES (?, ?, ?)');
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
            insert.run(label, color, sort_order);
        }
    }
    const ttCount = db.prepare('SELECT COUNT(*) as c FROM tech_tags').get();
    if (ttCount.c === 0) {
        const insert = db.prepare('INSERT INTO tech_tags (label) VALUES (?)');
        const defaults = ['React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'NestJS', 'Next.js', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Docker', 'AWS', 'Git', 'GraphQL', 'REST API', 'Tailwind CSS', 'Prisma', 'Jest', 'Vite'];
        for (const label of defaults) {
            insert.run(label);
        }
    }
    // Default settings
    const defaults = [
        ['morning_time', '09:00'],
        ['checkin_interval', '120'],
        ['evening_notify', 'true'],
        ['evening_time', '18:00'],
        ['git_repos', '[]'],
    ];
    const upsert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of defaults) {
        upsert.run(key, value);
    }
}
// --- Logs ---
function insertLog(data) {
    const db = getDb();
    return db.prepare(`
    INSERT INTO logs (timestamp, source, work_type, techs, description, impact, repo, commit_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(data.timestamp, data.source, data.work_type ?? null, data.techs ? JSON.stringify(data.techs) : null, data.description ?? null, data.impact ?? null, data.repo ?? null, data.commit_hash ?? null);
}
function getLogs(from, to) {
    const db = getDb();
    if (from && to) {
        return db.prepare('SELECT * FROM logs WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp DESC').all(from, to);
    }
    return db.prepare('SELECT * FROM logs ORDER BY timestamp DESC').all();
}
function getLogsByDate(date) {
    const db = getDb();
    return db.prepare("SELECT * FROM logs WHERE timestamp LIKE ? ORDER BY timestamp ASC").all(`${date}%`);
}
function deleteLog(id) {
    getDb().prepare('DELETE FROM logs WHERE id = ?').run(id);
}
// --- Todos ---
function getTodos(date) {
    return getDb().prepare('SELECT * FROM todos WHERE date = ? ORDER BY id ASC').all(date);
}
function insertTodo(date, content, work_type) {
    return getDb().prepare('INSERT INTO todos (date, content, work_type) VALUES (?, ?, ?)').run(date, content, work_type ?? null);
}
function toggleTodo(id, done) {
    return getDb().prepare('UPDATE todos SET done = ? WHERE id = ?').run(done ? 1 : 0, id);
}
function deleteTodo(id) {
    return getDb().prepare('DELETE FROM todos WHERE id = ?').run(id);
}
// --- Settings ---
function getSetting(key) {
    const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row?.value ?? null;
}
function setSetting(key, value) {
    return getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}
// --- Work Types ---
function getWorkTypes() {
    return getDb().prepare('SELECT * FROM work_types ORDER BY sort_order ASC').all();
}
function insertWorkType(label, color) {
    const db = getDb();
    const max = db.prepare('SELECT MAX(sort_order) as m FROM work_types').get();
    return db.prepare('INSERT INTO work_types (label, color, sort_order) VALUES (?, ?, ?)').run(label, color, (max.m ?? 0) + 1);
}
function deleteWorkType(id) {
    return getDb().prepare('DELETE FROM work_types WHERE id = ?').run(id);
}
function reorderWorkTypes(ids) {
    const update = getDb().prepare('UPDATE work_types SET sort_order = ? WHERE id = ?');
    ids.forEach((id, i) => update.run(i, id));
}
// --- Tech Tags ---
function getTechTags() {
    return getDb().prepare('SELECT * FROM tech_tags ORDER BY label ASC').all();
}
function insertTechTag(label) {
    return getDb().prepare('INSERT INTO tech_tags (label) VALUES (?)').run(label);
}
function deleteTechTag(id) {
    return getDb().prepare('DELETE FROM tech_tags WHERE id = ?').run(id);
}
// --- Stats ---
function getStats() {
    const db = getDb();
    const totalLogs = db.prepare('SELECT COUNT(*) as c FROM logs').get().c;
    const totalCommits = db.prepare("SELECT COUNT(*) as c FROM logs WHERE source = 'git'").get().c;
    const workDays = db.prepare("SELECT COUNT(DISTINCT substr(timestamp,1,10)) as c FROM logs").get().c;
    return { totalLogs, totalCommits, workDays };
}
