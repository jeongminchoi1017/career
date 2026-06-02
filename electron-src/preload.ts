import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Logs
  insertLog: (data: object) => ipcRenderer.invoke('db:insertLog', data),
  getLogs: (from?: string, to?: string) => ipcRenderer.invoke('db:getLogs', from, to),
  getLogsByDate: (date: string) => ipcRenderer.invoke('db:getLogsByDate', date),
  deleteLog: (id: number) => ipcRenderer.invoke('db:deleteLog', id),

  // Todos
  getTodos: (date: string) => ipcRenderer.invoke('db:getTodos', date),
  insertTodo: (date: string, content: string, work_type?: string) => ipcRenderer.invoke('db:insertTodo', date, content, work_type),
  toggleTodo: (id: number, done: boolean) => ipcRenderer.invoke('db:toggleTodo', id, done),
  deleteTodo: (id: number) => ipcRenderer.invoke('db:deleteTodo', id),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('db:getSetting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('db:setSetting', key, value),

  // Work Types
  getWorkTypes: () => ipcRenderer.invoke('db:getWorkTypes'),
  insertWorkType: (label: string, color: string) => ipcRenderer.invoke('db:insertWorkType', label, color),
  deleteWorkType: (id: number) => ipcRenderer.invoke('db:deleteWorkType', id),
  reorderWorkTypes: (ids: number[]) => ipcRenderer.invoke('db:reorderWorkTypes', ids),

  // Tech Tags
  getTechTags: () => ipcRenderer.invoke('db:getTechTags'),
  insertTechTag: (label: string) => ipcRenderer.invoke('db:insertTechTag', label),
  deleteTechTag: (id: number) => ipcRenderer.invoke('db:deleteTechTag', id),

  // Stats
  getStats: () => ipcRenderer.invoke('db:getStats'),

  // Git
  collectGit: () => ipcRenderer.invoke('git:collect'),

  // Reset
  resetAllData: () => ipcRenderer.invoke('db:resetAllData'),

  // Events from main
  onOpenCheckin: (cb: () => void) => ipcRenderer.on('open:checkin', cb),
  onOpenTodo: (cb: () => void) => ipcRenderer.on('open:todo', cb),
  onGitUpdated: (cb: () => void) => ipcRenderer.on('git:updated', cb),
  removeListener: (channel: string, cb: (...args: unknown[]) => void) => ipcRenderer.removeListener(channel, cb),
})
