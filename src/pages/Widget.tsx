import { useState, useEffect, useCallback } from 'react'
import api from '../api'
import type { Todo, Log, WorkType, TechTag } from '../types'
import { localDateString, localISOString } from '../utils/date'
import './Widget.css'

export default function Widget() {
  const today = localDateString()
  const [todos, setTodos] = useState<Todo[]>([])
  const [checkins, setCheckins] = useState<Log[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [techTags, setTechTags] = useState<TechTag[]>([])

  const [checkinInput, setCheckinInput] = useState('')
  const [showDetail, setShowDetail] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [selectedTechs, setSelectedTechs] = useState<string[]>([])

  const [todoInput, setTodoInput] = useState('')
  const [savedCheckin, setSavedCheckin] = useState(false)
  const [savedTodo, setSavedTodo] = useState(false)

  const load = useCallback(async () => {
    const [t, logs] = await Promise.all([
      api.getTodos(today),
      api.getLogsByDate(today),
    ])
    setTodos(t)
    setCheckins(logs.filter(l => l.source === 'checkin'))
  }, [today])

  useEffect(() => {
    load()
    api.getWorkTypes().then(setWorkTypes)
    api.getTechTags().then(setTechTags)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') api.hideWidget?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [load])

  const toggleTech = (label: string) => {
    setSelectedTechs(prev =>
      prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]
    )
  }

  const saveCheckin = async () => {
    if (!checkinInput.trim()) return
    await api.insertLog({
      timestamp: localISOString(),
      source: 'checkin',
      work_type: selectedType || undefined,
      techs: selectedTechs.length ? selectedTechs : undefined,
      description: checkinInput.trim(),
    })
    setCheckinInput('')
    setSelectedType('')
    setSelectedTechs([])
    setShowDetail(false)
    setSavedCheckin(true)
    setTimeout(() => setSavedCheckin(false), 1500)
    load()
  }

  const saveTodo = async () => {
    if (!todoInput.trim()) return
    await api.insertTodo(today, todoInput.trim())
    setTodoInput('')
    setSavedTodo(true)
    setTimeout(() => setSavedTodo(false), 1500)
    load()
  }

  const toggleTodo = async (todo: Todo) => {
    await api.toggleTodo(todo.id, !todo.done)
    load()
  }

  const doneTodos = todos.filter(t => t.done).length

  return (
    <div className="widget">
      {/* Header */}
      <div className="widget-header">
        <div className="widget-header-left">
          <span className="widget-title">Career Tracker</span>
          <span className="widget-date">
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>
        <button className="widget-close" onClick={() => api.hideWidget?.()}>✕</button>
      </div>

      {/* Stats */}
      <div className="widget-stats">
        <div className="stat-pill">
          <span className="stat-pill-icon">✏️</span>
          <span>체크인 <strong>{checkins.length}</strong>건</span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-icon">☀️</span>
          <span>할 일 <strong>{doneTodos}/{todos.length}</strong></span>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="widget-body">

        {/* Checkin section */}
        <div className="widget-section">
          <div className="widget-label">빠른 체크인</div>
          <div className="widget-input-row">
            <input
              className="widget-input"
              placeholder="지금 뭐 했어요? (Enter)"
              value={checkinInput}
              onChange={e => setCheckinInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveCheckin()}
              autoFocus
            />
            {savedCheckin && <span className="widget-saved">✓</span>}
          </div>

          {/* Detail toggle */}
          <button
            className="widget-detail-toggle"
            onClick={() => setShowDetail(v => !v)}
          >
            {showDetail ? '▲ 간단히' : '▼ 상세 입력'}
          </button>

          {showDetail && (
            <div className="widget-detail">
              <div className="widget-label" style={{ marginBottom: '6px' }}>작업 유형</div>
              <div className="widget-tag-group">
                {workTypes.map(wt => (
                  <button
                    key={wt.id}
                    className={`widget-tag ${selectedType === wt.label ? 'active' : ''}`}
                    style={selectedType === wt.label
                      ? { background: wt.color, borderColor: wt.color, color: '#fff' }
                      : { borderColor: wt.color, color: wt.color }}
                    onClick={() => setSelectedType(selectedType === wt.label ? '' : wt.label)}
                  >
                    {wt.label}
                  </button>
                ))}
              </div>

              <div className="widget-label" style={{ margin: '10px 0 6px' }}>기술 스택</div>
              <div className="widget-tag-group">
                {techTags.map(tt => (
                  <button
                    key={tt.id}
                    className={`widget-tag tech ${selectedTechs.includes(tt.label) ? 'active' : ''}`}
                    onClick={() => toggleTech(tt.label)}
                  >
                    {tt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Todo section */}
        <div className="widget-section">
          <div className="widget-label-row">
            <span className="widget-label">할 일</span>
            {todos.length > 0 && (
              <span className="widget-label-count">{doneTodos}/{todos.length}</span>
            )}
          </div>

          {todos.length > 0 && (
            <ul className="widget-todo-list">
              {todos.map(todo => (
                <li
                  key={todo.id}
                  className={`widget-todo-item ${todo.done ? 'done' : ''}`}
                  onClick={() => toggleTodo(todo)}
                >
                  <span className="widget-todo-check">{todo.done ? '✓' : ''}</span>
                  <span className="widget-todo-text">{todo.content}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="widget-input-row" style={{ marginTop: todos.length ? '8px' : '0' }}>
            <input
              className="widget-input"
              placeholder="+ 할 일 추가 (Enter)"
              value={todoInput}
              onChange={e => setTodoInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveTodo()}
            />
            {savedTodo && <span className="widget-saved">✓</span>}
          </div>
        </div>

      </div>

      {/* Footer */}
      <button className="widget-open-main" onClick={() => api.openMainWindow?.()}>
        전체 보기 →
      </button>
    </div>
  )
}
