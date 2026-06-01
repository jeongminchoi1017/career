"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('api', {
    // Logs
    insertLog: (data) => electron_1.ipcRenderer.invoke('db:insertLog', data),
    getLogs: (from, to) => electron_1.ipcRenderer.invoke('db:getLogs', from, to),
    getLogsByDate: (date) => electron_1.ipcRenderer.invoke('db:getLogsByDate', date),
    deleteLog: (id) => electron_1.ipcRenderer.invoke('db:deleteLog', id),
    // Todos
    getTodos: (date) => electron_1.ipcRenderer.invoke('db:getTodos', date),
    insertTodo: (date, content, work_type) => electron_1.ipcRenderer.invoke('db:insertTodo', date, content, work_type),
    toggleTodo: (id, done) => electron_1.ipcRenderer.invoke('db:toggleTodo', id, done),
    deleteTodo: (id) => electron_1.ipcRenderer.invoke('db:deleteTodo', id),
    // Settings
    getSetting: (key) => electron_1.ipcRenderer.invoke('db:getSetting', key),
    setSetting: (key, value) => electron_1.ipcRenderer.invoke('db:setSetting', key, value),
    // Work Types
    getWorkTypes: () => electron_1.ipcRenderer.invoke('db:getWorkTypes'),
    insertWorkType: (label, color) => electron_1.ipcRenderer.invoke('db:insertWorkType', label, color),
    deleteWorkType: (id) => electron_1.ipcRenderer.invoke('db:deleteWorkType', id),
    reorderWorkTypes: (ids) => electron_1.ipcRenderer.invoke('db:reorderWorkTypes', ids),
    // Tech Tags
    getTechTags: () => electron_1.ipcRenderer.invoke('db:getTechTags'),
    insertTechTag: (label) => electron_1.ipcRenderer.invoke('db:insertTechTag', label),
    deleteTechTag: (id) => electron_1.ipcRenderer.invoke('db:deleteTechTag', id),
    // Stats
    getStats: () => electron_1.ipcRenderer.invoke('db:getStats'),
    // Git
    collectGit: () => electron_1.ipcRenderer.invoke('git:collect'),
    // Events from main
    onOpenCheckin: (cb) => electron_1.ipcRenderer.on('open:checkin', cb),
    onOpenTodo: (cb) => electron_1.ipcRenderer.on('open:todo', cb),
    removeListener: (channel, cb) => electron_1.ipcRenderer.removeListener(channel, cb),
});
