import { useState, useEffect, useCallback } from 'react'
import Today from './pages/Today'
import Timeline from './pages/Timeline'
import Archive from './pages/Archive'
import Settings from './pages/Settings'
import CheckinModal from './components/CheckinModal'
import TodoModal from './components/TodoModal'
import type { Page } from './types'
import api from './api'
import './App.css'

export default function App() {
  const [page, setPage] = useState<Page>('today')
  const [showCheckin, setShowCheckin] = useState(false)
  const [showTodo, setShowTodo] = useState(false)
  const [refresh, setRefresh] = useState(0)

  const bump = useCallback(() => setRefresh(r => r + 1), [])

  useEffect(() => {
    api.getSetting('theme').then(t => {
      if (t) document.documentElement.setAttribute('data-theme', t)
    })
  }, [])

  useEffect(() => {
    const checkinCb = () => setShowCheckin(true)
    const todoCb = () => setShowTodo(true)
    const gitCb = () => bump()
    api.onOpenCheckin(checkinCb)
    api.onOpenTodo(todoCb)
    api.onGitUpdated(gitCb)
    return () => {
      api.removeListener('open:checkin', checkinCb)
      api.removeListener('open:todo', todoCb)
      api.removeListener('git:updated', gitCb)
    }
  }, [])

  const today = new Date().toISOString().slice(0, 10)

  const NAV: { key: Page; label: string; icon: string }[] = [
    { key: 'today', label: '오늘', icon: '☀️' },
    { key: 'timeline', label: '타임라인', icon: '📋' },
    { key: 'archive', label: '아카이브', icon: '📁' },
    { key: 'settings', label: '설정', icon: '⚙️' },
  ]

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-logo">Career<br/>Tracker</div>
        <ul className="nav-list">
          {NAV.map(n => (
            <li key={n.key}>
              <button
                className={`nav-item ${page === n.key ? 'active' : ''}`}
                onClick={() => setPage(n.key)}
              >
                <span className="nav-icon">{n.icon}</span>
                <span>{n.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <button className="sidebar-checkin" onClick={() => setShowCheckin(true)}>
          ✏️ 체크인
        </button>
      </nav>

      <main className="content">
        {page === 'today' && (
          <Today
            onOpenTodo={() => setShowTodo(true)}
            refresh={refresh}
          />
        )}
        {page === 'timeline' && <Timeline refresh={refresh} />}
        {page === 'archive' && <Archive />}
        {page === 'settings' && <Settings />}
      </main>

      {showCheckin && (
        <CheckinModal
          onClose={() => setShowCheckin(false)}
          onSaved={bump}
        />
      )}
      {showTodo && (
        <TodoModal
          date={today}
          onClose={() => setShowTodo(false)}
          onSaved={bump}
        />
      )}
    </div>
  )
}
