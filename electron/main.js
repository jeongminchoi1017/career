"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("./db");
const git_collector_1 = require("./git-collector");
const isDev = process.env.NODE_ENV === 'development';
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1100,
        height: 750,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        backgroundColor: '#0f0f13',
        autoHideMenuBar: true,
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
}
electron_1.app.whenReady().then(() => {
    (0, db_1.getDb)(); // init DB
    createWindow();
    setupIpc();
    scheduleNotifications();
    // Collect git logs on startup, every 24 hours, and on new commits
    (0, git_collector_1.collectGitLogs)();
    setInterval(git_collector_1.collectGitLogs, 24 * 60 * 60 * 1000);
    watchGitRepos();
});
// --- Git file watcher ---
const gitWatchers = [];
function watchGitRepos() {
    // Clean up existing watchers
    gitWatchers.forEach(w => w.close());
    gitWatchers.length = 0;
    const reposRaw = (0, db_1.getSetting)('git_repos');
    if (!reposRaw)
        return;
    let repos = [];
    try {
        repos = JSON.parse(reposRaw);
    }
    catch {
        return;
    }
    for (const repoPath of repos) {
        const headLog = path_1.default.join(repoPath, '.git', 'logs', 'HEAD');
        if (!fs_1.default.existsSync(headLog))
            continue;
        let debounce = null;
        const watcher = fs_1.default.watch(headLog, () => {
            if (debounce)
                clearTimeout(debounce);
            debounce = setTimeout(async () => {
                await (0, git_collector_1.collectGitLogs)();
                mainWindow?.webContents.send('git:updated');
            }, 1000);
        });
        gitWatchers.push(watcher);
    }
}
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
// --- Notifications ---
let morningTimer = null;
let checkinTimer = null;
let eveningTimer = null;
function scheduleNotifications() {
    scheduleMorning();
    scheduleCheckin();
    scheduleEvening();
}
function msUntil(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= now)
        target.setDate(target.getDate() + 1);
    return target.getTime() - now.getTime();
}
function scheduleMorning() {
    if (morningTimer)
        clearTimeout(morningTimer);
    const time = (0, db_1.getSetting)('morning_time') ?? '09:00';
    morningTimer = setTimeout(() => {
        sendNotification('Career Tracker', '오늘 할 일을 입력해 주세요 ☀️', 'todo');
        scheduleMorning();
    }, msUntil(time));
}
function scheduleCheckin() {
    if (checkinTimer)
        clearInterval(checkinTimer);
    const intervalMin = parseInt((0, db_1.getSetting)('checkin_interval') ?? '120');
    checkinTimer = setInterval(() => {
        sendNotification('Career Tracker', '지금 무엇을 하고 있나요? 체크인 해주세요 ✏️', 'checkin');
    }, intervalMin * 60 * 1000);
}
function scheduleEvening() {
    if (eveningTimer)
        clearTimeout(eveningTimer);
    const enabled = (0, db_1.getSetting)('evening_notify') !== 'false';
    if (!enabled)
        return;
    const time = (0, db_1.getSetting)('evening_time') ?? '18:00';
    eveningTimer = setTimeout(() => {
        sendNotification('Career Tracker', '오늘 하루도 수고했어요! 마무리 체크인을 해주세요 🌙', 'checkin');
        scheduleEvening();
    }, msUntil(time));
}
function sendNotification(title, body, action) {
    if (!electron_1.Notification.isSupported())
        return;
    const n = new electron_1.Notification({ title, body, silent: false });
    n.on('click', () => {
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.webContents.send(action === 'checkin' ? 'open:checkin' : 'open:todo');
    });
    n.show();
}
// --- IPC ---
function setupIpc() {
    electron_1.ipcMain.handle('db:insertLog', async (_, data) => {
        try {
            return (0, db_1.insertLog)(data);
        }
        catch (e) {
            console.error('[db:insertLog]', e);
            throw e;
        }
    });
    electron_1.ipcMain.handle('db:getLogs', (_, from, to) => (0, db_1.getLogs)(from, to));
    electron_1.ipcMain.handle('db:getLogsByDate', (_, date) => (0, db_1.getLogsByDate)(date));
    electron_1.ipcMain.handle('db:deleteLog', (_, id) => (0, db_1.deleteLog)(id));
    electron_1.ipcMain.handle('db:getTodos', (_, date) => (0, db_1.getTodos)(date));
    electron_1.ipcMain.handle('db:insertTodo', (_, date, content, work_type) => (0, db_1.insertTodo)(date, content, work_type));
    electron_1.ipcMain.handle('db:toggleTodo', (_, id, done) => (0, db_1.toggleTodo)(id, done));
    electron_1.ipcMain.handle('db:deleteTodo', (_, id) => (0, db_1.deleteTodo)(id));
    electron_1.ipcMain.handle('db:getSetting', (_, key) => (0, db_1.getSetting)(key));
    electron_1.ipcMain.handle('db:setSetting', (_, key, value) => {
        (0, db_1.setSetting)(key, value);
        if (['morning_time', 'checkin_interval', 'evening_notify', 'evening_time'].includes(key)) {
            scheduleNotifications();
        }
        if (key === 'git_repos') {
            watchGitRepos();
        }
    });
    electron_1.ipcMain.handle('db:getWorkTypes', () => (0, db_1.getWorkTypes)());
    electron_1.ipcMain.handle('db:insertWorkType', (_, label, color) => (0, db_1.insertWorkType)(label, color));
    electron_1.ipcMain.handle('db:deleteWorkType', (_, id) => (0, db_1.deleteWorkType)(id));
    electron_1.ipcMain.handle('db:reorderWorkTypes', (_, ids) => (0, db_1.reorderWorkTypes)(ids));
    electron_1.ipcMain.handle('db:getTechTags', () => (0, db_1.getTechTags)());
    electron_1.ipcMain.handle('db:insertTechTag', (_, label) => (0, db_1.insertTechTag)(label));
    electron_1.ipcMain.handle('db:deleteTechTag', (_, id) => (0, db_1.deleteTechTag)(id));
    electron_1.ipcMain.handle('db:getStats', () => (0, db_1.getStats)());
    electron_1.ipcMain.handle('git:collect', async () => {
        await (0, git_collector_1.collectGitLogs)();
        return true;
    });
    electron_1.ipcMain.handle('db:resetAllData', () => {
        (0, db_1.resetAllData)();
        return true;
    });
}
