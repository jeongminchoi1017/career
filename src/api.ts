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
    description: '체크인 모달 UI 구현',
    impact: '체크인 저장 시간 50% 단축',
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    source: 'git',
    techs: JSON.stringify(['TypeScript', 'Node.js']),
    description: 'feat: add sqlite db schema and ipc handlers',
    repo: '/dev/career-tracker',
    commit_hash: 'a1b2c3d4e5f6',
  },
]

const mockTodos: Todo[] = [
  { id: 1, date: new Date().toISOString().slice(0, 10), content: 'DB 스키마 설계', work_type: '기능 개발', done: 1 },
  { id: 2, date: new Date().toISOString().slice(0, 10), content: 'Electron IPC 연결', work_type: '기능 개발', done: 0 },
  { id: 3, date: new Date().toISOString().slice(0, 10), content: '타임라인 뷰 구현', work_type: '기능 개발', done: 0 },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronApi = (window as any).api

const mockApi = {
  insertLog: async () => {},
  getLogs: async () => mockLogs,
  getLogsByDate: async () => mockLogs,
  deleteLog: async () => {},
  getTodos: async () => mockTodos,
  insertTodo: async () => {},
  toggleTodo: async () => {},
  deleteTodo: async () => {},
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
  getWorkTypes: async () => mockWorkTypes,
  insertWorkType: async () => {},
  deleteWorkType: async () => {},
  reorderWorkTypes: async () => {},
  getTechTags: async () => mockTechTags,
  insertTechTag: async () => {},
  deleteTechTag: async () => {},
  getStats: async (): Promise<Stats> => ({ totalLogs: 42, totalCommits: 18, workDays: 12 }),
  collectGit: async () => {},
  onOpenCheckin: () => {},
  onOpenTodo: () => {},
  removeListener: () => {},
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

  onOpenCheckin(cb: () => void): void
  onOpenTodo(cb: () => void): void
  removeListener(channel: string, cb: (...args: unknown[]) => void): void
}
