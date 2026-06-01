export interface Log {
  id: number
  timestamp: string
  source: 'checkin' | 'git'
  work_type?: string
  techs?: string  // JSON string
  description?: string
  impact?: string
  repo?: string
  commit_hash?: string
}

export interface Todo {
  id: number
  date: string
  content: string
  work_type?: string
  done: number
}

export interface WorkType {
  id: number
  label: string
  color: string
  sort_order: number
}

export interface TechTag {
  id: number
  label: string
}

export interface Stats {
  totalLogs: number
  totalCommits: number
  workDays: number
}

export type Page = 'today' | 'timeline' | 'archive' | 'settings'
