import { useState, useEffect, useCallback } from 'react'
import api from '../api'
import type { Log } from '../types'
import EditLogModal from '../components/EditLogModal'
import './Timeline.css'

interface Props {
  refresh: number
}

export default function Timeline({ refresh }: Props) {
  const [logs, setLogs] = useState<Log[]>([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [editingLog, setEditingLog] = useState<Log | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const load = useCallback(async () => {
    const data = await api.getLogsByDate(date)
    setLogs(data)
  }, [date])

  useEffect(() => { load() }, [load, refresh])

  const prevDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() - 1)
    setDate(d.toISOString().slice(0, 10))
  }

  const nextDay = () => {
    const d = new Date(date)
    d.setDate(d.getDate() + 1)
    setDate(d.toISOString().slice(0, 10))
  }

  const isToday = date === new Date().toISOString().slice(0, 10)

  const remove = async (id: number) => {
    await api.deleteLog(id)
    setConfirmDeleteId(null)
    load()
  }

  return (
    <div className="timeline-page">
      <div className="timeline-header">
        <h1>타임라인</h1>
        <div className="date-nav">
          <button onClick={prevDay}>‹</button>
          <span>{new Date(date + 'T12:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
          <button onClick={nextDay} disabled={isToday}>›</button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="timeline-empty">이날의 기록이 없습니다</div>
      ) : (
        <div className="timeline">
          {logs.map((log, i) => (
            <div key={log.id} className="timeline-row">
              <div className="timeline-time">
                {new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="timeline-line">
                <div className={`timeline-dot ${log.source}`} />
                {i < logs.length - 1 && <div className="timeline-connector" />}
              </div>
              <div className={`timeline-card ${log.source}`}>
                <div className="card-top">
                  <span className={`source-badge ${log.source}`}>
                    {log.source === 'git' ? 'Git' : '체크인'}
                  </span>
                  {log.work_type && <span className="work-type-label">{log.work_type}</span>}
                  {log.source === 'checkin' && (
                    <div className="card-actions">
                      <button className="card-edit" onClick={() => setEditingLog(log)}>✏️</button>
                      {confirmDeleteId === log.id ? (
                        <>
                          <span className="delete-confirm-text">삭제?</span>
                          <button className="card-delete-confirm" onClick={() => remove(log.id)}>확인</button>
                          <button className="card-delete-cancel" onClick={() => setConfirmDeleteId(null)}>취소</button>
                        </>
                      ) : (
                        <button className="card-delete" onClick={() => setConfirmDeleteId(log.id)}>🗑</button>
                      )}
                    </div>
                  )}
                </div>
                <p className="card-desc">{log.description}</p>
                {log.impact && <p className="card-impact">⚡ {log.impact}</p>}
                {log.techs && (
                  <div className="card-techs">
                    {JSON.parse(log.techs).map((t: string) => (
                      <span key={t} className="tech-badge">{t}</span>
                    ))}
                  </div>
                )}
                {log.repo && <p className="card-repo">📁 {log.repo.split(/[/\\]/).pop()}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingLog && (
        <EditLogModal
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
