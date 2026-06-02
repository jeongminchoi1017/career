import { app, BrowserWindow, ipcMain, Notification, Tray, Menu, globalShortcut, nativeImage, screen } from 'electron'
import path from 'path'
import fs from 'fs'
import {
  getDb, insertLog, getLogs, getLogsByDate, deleteLog, updateLog,
  getTodos, insertTodo, toggleTodo, deleteTodo,
  getSetting, setSetting,
  getWorkTypes, insertWorkType, deleteWorkType, reorderWorkTypes,
  getTechTags, insertTechTag, deleteTechTag,
  getStats, resetAllData,
} from './db'
import { collectGitLogs } from './git-collector'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let widgetWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createTrayIcon(): Electron.NativeImage {
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    buf[i * 4]     = 0x81  // R
    buf[i * 4 + 1] = 0x8c  // G
    buf[i * 4 + 2] = 0xf8  // B
    buf[i * 4 + 3] = 0xff  // A
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

function createWidgetWindow() {
  widgetWindow = new BrowserWindow({
    width: 360,
    height: 480,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: false,
    backgroundColor: '#1a1a26',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    widgetWindow.loadURL('http://localhost:5173/widget.html')
  } else {
    widgetWindow.loadFile(path.join(__dirname, '../dist/widget.html'))
  }

  widgetWindow.on('blur', () => widgetWindow?.hide())
  widgetWindow.on('closed', () => { widgetWindow = null })
}

function toggleWidget() {
  if (!widgetWindow) createWidgetWindow()
  if (widgetWindow!.isVisible()) {
    widgetWindow!.hide()
  } else {
    // 화면 우측 하단에 위치
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    const ww = 360, wh = 480
    widgetWindow!.setBounds({ x: width - ww - 16, y: height - wh - 16, width: ww, height: wh })
    widgetWindow!.show()
    widgetWindow!.focus()
  }
}

function createTray() {
  tray = new Tray(createTrayIcon())
  tray.setToolTip('Career Tracker')
  tray.on('click', toggleWidget)
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '위젯 열기', click: toggleWidget },
    { label: '앱 열기', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: '종료', click: () => app.quit() },
  ]))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0f0f13',
    autoHideMenuBar: true,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  getDb()
  createWindow()
  createWidgetWindow()
  createTray()
  setupIpc()
  scheduleNotifications()

  globalShortcut.register('CommandOrControl+Shift+Space', toggleWidget)

  collectGitLogs()
  setInterval(collectGitLogs, 24 * 60 * 60 * 1000)
  watchGitRepos()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// --- Git file watcher ---
const gitWatchers: fs.FSWatcher[] = []

function watchGitRepos() {
  // Clean up existing watchers
  gitWatchers.forEach(w => w.close())
  gitWatchers.length = 0

  const reposRaw = getSetting('git_repos')
  if (!reposRaw) return
  let repos: string[] = []
  try { repos = JSON.parse(reposRaw) } catch { return }

  for (const repoPath of repos) {
    const headLog = path.join(repoPath, '.git', 'logs', 'HEAD')
    if (!fs.existsSync(headLog)) continue

    let debounce: ReturnType<typeof setTimeout> | null = null
    const watcher = fs.watch(headLog, () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(async () => {
        await collectGitLogs()
        mainWindow?.webContents.send('git:updated')
      }, 1000)
    })
    gitWatchers.push(watcher)
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// --- Notifications ---
let morningTimer: ReturnType<typeof setTimeout> | null = null
let checkinTimer: ReturnType<typeof setInterval> | null = null
let eveningTimer: ReturnType<typeof setTimeout> | null = null

function scheduleNotifications() {
  scheduleMorning()
  scheduleCheckin()
  scheduleEvening()
}

function msUntil(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  const now = new Date()
  const target = new Date()
  target.setHours(h, m, 0, 0)
  if (target <= now) target.setDate(target.getDate() + 1)
  return target.getTime() - now.getTime()
}

function scheduleMorning() {
  if (morningTimer) clearTimeout(morningTimer)
  const time = getSetting('morning_time') ?? '09:00'
  morningTimer = setTimeout(() => {
    sendNotification('Career Tracker', '오늘 할 일을 입력해 주세요 ☀️', 'todo')
    scheduleMorning()
  }, msUntil(time))
}

function scheduleCheckin() {
  if (checkinTimer) clearInterval(checkinTimer)
  const intervalMin = parseInt(getSetting('checkin_interval') ?? '120')
  checkinTimer = setInterval(() => {
    sendNotification('Career Tracker', '지금 무엇을 하고 있나요? 체크인 해주세요 ✏️', 'checkin')
  }, intervalMin * 60 * 1000)
}

function scheduleEvening() {
  if (eveningTimer) clearTimeout(eveningTimer)
  const enabled = getSetting('evening_notify') !== 'false'
  if (!enabled) return
  const time = getSetting('evening_time') ?? '18:00'
  eveningTimer = setTimeout(() => {
    sendNotification('Career Tracker', '오늘 하루도 수고했어요! 마무리 체크인을 해주세요 🌙', 'checkin')
    scheduleEvening()
  }, msUntil(time))
}

function sendNotification(title: string, body: string, action: 'checkin' | 'todo') {
  if (!Notification.isSupported()) return
  const n = new Notification({ title, body, silent: false })
  n.on('click', () => {
    mainWindow?.show()
    mainWindow?.focus()
    mainWindow?.webContents.send(action === 'checkin' ? 'open:checkin' : 'open:todo')
  })
  n.show()
}

// --- IPC ---
function setupIpc() {
  ipcMain.handle('db:insertLog', async (_, data) => {
    try {
      return insertLog(data)
    } catch (e) {
      console.error('[db:insertLog]', e)
      throw e
    }
  })
  ipcMain.handle('db:getLogs', (_, from, to) => getLogs(from, to))
  ipcMain.handle('db:getLogsByDate', (_, date) => getLogsByDate(date))
  ipcMain.handle('db:deleteLog', (_, id) => deleteLog(id))
  ipcMain.handle('db:updateLog', (_, id, data) => updateLog(id, data))

  ipcMain.handle('db:getTodos', (_, date) => getTodos(date))
  ipcMain.handle('db:insertTodo', (_, date, content, work_type) => insertTodo(date, content, work_type))
  ipcMain.handle('db:toggleTodo', (_, id, done) => toggleTodo(id, done))
  ipcMain.handle('db:deleteTodo', (_, id) => deleteTodo(id))

  ipcMain.handle('db:getSetting', (_, key) => getSetting(key))
  ipcMain.handle('db:setSetting', (_, key, value) => {
    setSetting(key, value)
    if (['morning_time', 'checkin_interval', 'evening_notify', 'evening_time'].includes(key)) {
      scheduleNotifications()
    }
    if (key === 'git_repos') {
      watchGitRepos()
    }
  })

  ipcMain.handle('db:getWorkTypes', () => getWorkTypes())
  ipcMain.handle('db:insertWorkType', (_, label, color) => insertWorkType(label, color))
  ipcMain.handle('db:deleteWorkType', (_, id) => deleteWorkType(id))
  ipcMain.handle('db:reorderWorkTypes', (_, ids) => reorderWorkTypes(ids))

  ipcMain.handle('db:getTechTags', () => getTechTags())
  ipcMain.handle('db:insertTechTag', (_, label) => insertTechTag(label))
  ipcMain.handle('db:deleteTechTag', (_, id) => deleteTechTag(id))

  ipcMain.handle('db:getStats', () => getStats())

  ipcMain.handle('git:collect', async () => {
    await collectGitLogs()
    return true
  })

  ipcMain.handle('db:resetAllData', () => {
    resetAllData()
    return true
  })

  ipcMain.handle('widget:hide', () => widgetWindow?.hide())
  ipcMain.handle('widget:openMain', () => {
    mainWindow?.show()
    mainWindow?.focus()
    widgetWindow?.hide()
  })
}
