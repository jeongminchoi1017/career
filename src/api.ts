import type { Log, Todo, WorkType, TechTag, Stats } from './types'

// Mock data for browser preview (no Electron context)
const mockWorkTypes: WorkType[] = [
  { id: 1, label: '기능 개발', color: '#6366f1', sort_order: 0 },
  { id: 2, label: '버그 수정', color: '#ef4444', sort_order: 1 },
  { id: 3, label: '리팩토링', color: '#f59e0b', sort_order: 2 },
  { id: 4, label: '코드 리뷰', color: '#10b981', sort_order: 3 },
  { id: 5, label: '문서 작업', color: '#3b82f6', sort_order: 4 },
]

const mockTechTags: TechTag[] = [
  { id: 1, label: 'React' }, { id: 2, label: 'TypeScript' },
  { id: 3, label: 'Node.js' }, { id: 4, label: 'NestJS' },
  { id: 5, label: 'PostgreSQL' }, { id: 6, label: 'Docker' },
  { id: 7, label: 'AWS' }, { id: 8, label: 'Prisma' },
]

const mockLogs: Log[] = [
  {
    id: 1,
    timestamp: new Date().toISOString(),
    source: 'checkin',
    work_type: '기능 개발',
    techs: JSON.stringify(['React', 'TypeScript']),
    description: '타임라인 수정/삭제 기능 구현',
    impact: '사용자 편의성 향상',
  },
]

const mockTodos: Todo[] = []

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronApi = (window as any).api

const mockApi = {
  insertLog: async () => {},
  getLogs: async () => mockLogs,
  getLogsByDate: async () => mockLogs,
  deleteLog: async (id: number) => {
    const idx = mockLogs.findIndex(l => l.id === id)
    if (idx !== -1) mockLogs.splice(idx, 1)
  },
  updateLog: async (id: number, data: { work_type?: string; techs?: string[]; description?: string; impact?: string }) => {
    const log = mockLogs.find(l => l.id === id)
    if (log) {
      if (data.work_type !== undefined) log.work_type = data.work_type
      if (data.techs !== undefined) log.techs = JSON.stringify(data.techs)
      if (data.description !== undefined) log.description = data.description
      if (data.impact !== undefined) log.impact = data.impact
    }
  },
  getTodos: async () => [...mockTodos],
  insertTodo: async (_date: string, content: string, work_type?: string) => {
    mockTodos.push({ id: Date.now(), date: new Date().toISOString().slice(0, 10), content, work_type, done: 0 })
  },
  toggleTodo: async (id: number, done: boolean) => {
    const t = mockTodos.find(t => t.id === id)
    if (t) t.done = done ? 1 : 0
  },
  deleteTodo: async (id: number) => {
    const idx = mockTodos.findIndex(t => t.id === id)
    if (idx !== -1) mockTodos.splice(idx, 1)
  },
  getSetting: async (key: string) => {
    const defaults: Record<string, string> = {
      morning_time: '09:00',
      checkin_interval: '120',
      evening_notify: 'true',
      evening_time: '18:00',
      git_repos: '[]',
    }
    return defaults[key] ?? null
  },
  setSetting: async () => {},
  getWorkTypes: async () => [...mockWorkTypes],
  insertWorkType: async (label: string, color: string) => {
    mockWorkTypes.push({ id: Date.now(), label, color, sort_order: mockWorkTypes.length })
  },
  deleteWorkType: async (id: number) => {
    const idx = mockWorkTypes.findIndex(w => w.id === id)
    if (idx !== -1) mockWorkTypes.splice(idx, 1)
  },
  reorderWorkTypes: async () => {},
  getTechTags: async () => [...mockTechTags],
  insertTechTag: async (label: string) => {
    mockTechTags.push({ id: Date.now(), label })
  },
  deleteTechTag: async (id: number) => {
    const idx = mockTechTags.findIndex(t => t.id === id)
    if (idx !== -1) mockTechTags.splice(idx, 1)
  },
  getStats: async (): Promise<Stats> => ({ totalLogs: 0, totalCommits: 0, workDays: 0 }),
  collectGit: async () => {},
  resetAllData: async () => {
    mockLogs.splice(0)
    mockTodos.splice(0)
  },
  onOpenCheckin: () => {},
  onOpenTodo: () => {},
  onGitUpdated: () => {},
  removeListener: () => {},
  hideWidget: () => {},
  openMainWindow: () => {},
}

export default (electronApi ?? mockApi) as {
  insertLog(data: {
    timestamp: string
    source: string
    work_type?: string
    techs?: string[]
    description?: string
    impact?: string
  }): Promise<void>
  getLogs(from?: string, to?: string): Promise<Log[]>
  getLogsByDate(date: string): Promise<Log[]>
  deleteLog(id: number): Promise<void>
  updateLog(id: number, data: { work_type?: string; techs?: string[]; description?: string; impact?: string }): Promise<void>

  getTodos(date: string): Promise<Todo[]>
  insertTodo(date: string, content: string, work_type?: string): Promise<void>
  toggleTodo(id: number, done: boolean): Promise<void>
  deleteTodo(id: number): Promise<void>

  getSetting(key: string): Promise<string | null>
  setSetting(key: string, value: string): Promise<void>

  getWorkTypes(): Promise<WorkType[]>
  insertWorkType(label: string, color: string): Promise<void>
  deleteWorkType(id: number): Promise<void>
  reorderWorkTypes(ids: number[]): Promise<void>

  getTechTags(): Promise<TechTag[]>
  insertTechTag(label: string): Promise<void>
  deleteTechTag(id: number): Promise<void>

  getStats(): Promise<Stats>
  collectGit(): Promise<void>
  resetAllData(): Promise<void>

  onOpenCheckin(cb: () => void): void
  onOpenTodo(cb: () => void): void
  onGitUpdated(cb: () => void): void
  removeListener(channel: string, cb: (...args: unknown[]) => void): void
  hideWidget?(): void
  openMainWindow?(): void
}
