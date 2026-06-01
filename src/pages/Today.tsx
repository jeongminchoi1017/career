import { useState, useEffect, useCallback } from 'react'
import api from '../api'
import type { Todo, Log } from '../types'
import './Today.css'

interface Props {
  onOpenCheckin: () => void
  onOpenTodo: () => void
  refresh: number
}

export default function Today({ onOpenCheckin, onOpenTodo, refresh }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [todos, setTodos] = useState<Todo[]>([])
  const [commits, setCommits] = useState<Log[]>([])

  const load = useCallback(async () => {
    const [t, c] = await Promise.all([
      api.getTodos(today),
      api.getLogsByDate(today),
    ])
    setTodos(t)
    setCommits(c.filter(l => l.source === 'git'))
  }, [today])

  useEffect(() => { load() }, [load, refresh])

  const toggle = async (todo: Todo) => {
    await api.toggleTodo(todo.id, !todo.done)
    load()
  }

  const remove = async (id: number) => {
    await api.deleteTodo(id)
    load()
  }

  const done = todos.filter(t => t.done).length
  const progress = todos.length ? Math.round((done / todos.length) * 100) : 0

  return (
    <div className="today-page">
      <div className="today-header">
        <div>
          <h1>오늘</h1>
          <p className="today-date">{new Date().toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="today-actions">
          <button className="action-btn" onClick={onOpenTodo}>+ 할 일</button>
          <button className="action-btn primary" onClick={onOpenCheckin}>✏️ 체크인</button>
        </div>
      </div>

      <section className="today-section">
        <div className="section-title-row">
          <h2>할 일 목록</h2>
          {todos.length > 0 && (
            <span className="progress-text">{done}/{todos.length} 완료</span>
          )}
        </div>
        {todos.length > 0 && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
        {todos.length === 0 ? (
          <div className="empty-hint">+ 할 일 버튼으로 오늘 계획을 추가해 보세요</div>
        ) : (
          <ul className="todo-list">
            {todos.map(todo => (
              <li key={todo.id} className={`todo-item ${todo.done ? 'done' : ''}`}>
                <button className="check-btn" onClick={() => toggle(todo)}>
                  {todo.done ? '✓' : ''}
                </button>
                <span className="todo-content">{todo.content}</span>
                {todo.work_type && <span className="todo-tag">{todo.work_type}</span>}
                <button className="delete-btn" onClick={() => remove(todo.id)}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="today-section">
        <h2>오늘 커밋</h2>
        {commits.length === 0 ? (
          <div className="empty-hint">연결된 Git 레포가 없거나 오늘 커밋이 없습니다</div>
        ) : (
          <ul className="commit-list">
            {commits.map(c => (
              <li key={c.id} className="commit-item">
                <span className="commit-hash">{c.commit_hash?.slice(0, 7)}</span>
                <span className="commit-msg">{c.description}</span>
                <div className="commit-meta">
                  <span className="commit-time">{new Date(c.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                  {c.techs && JSON.parse(c.techs).map((t: string) => (
                    <span key={t} className="tech-badge">{t}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
