import { useState, useEffect } from 'react'
import api from '../api'
import type { Log, Stats } from '../types'
import './Archive.css'

export default function Archive() {
  const [logs, setLogs] = useState<Log[]>([])
  const [stats, setStats] = useState<Stats>({ totalLogs: 0, totalCommits: 0, workDays: 0 })
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10))
  const [exporting, setExporting] = useState(false)
  const [exportText, setExportText] = useState('')

  useEffect(() => {
    api.getStats().then(setStats)
  }, [])

  useEffect(() => {
    api.getLogs(fromDate + 'T00:00:00', toDate + 'T23:59:59').then(setLogs)
  }, [fromDate, toDate])

  const grouped = logs.reduce<Record<string, Log[]>>((acc, log) => {
    const date = log.timestamp.slice(0, 10)
    if (!acc[date]) acc[date] = []
    acc[date].push(log)
    return acc
  }, {})

  const exportMd = async () => {
    setExporting(true)
    const lines: string[] = [
      `# 작업 이력 — ${fromDate.replace(/-/g, '.')} ~ ${toDate.replace(/-/g, '.')}`,
      '',
    ]

    const sorted = Object.keys(grouped).sort()
    for (const date of sorted) {
      lines.push(`## ${date.replace(/-/g, '.')}`)
      for (const log of grouped[date]) {
        const time = new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        const source = log.source === 'git' ? '[Git]' : '[체크인]'
        const techs = log.techs ? ` (${JSON.parse(log.techs).join(', ')})` : ''
        lines.push(`- ${time} ${source} ${log.description ?? ''}${techs}`)
        if (log.impact) lines.push(`  - 임팩트: ${log.impact}`)
        if (log.work_type) lines.push(`  - 유형: ${log.work_type}`)
      }
      lines.push('')
    }

    setExportText(lines.join('\n'))
    setExporting(false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportText)
  }

  return (
    <div className="archive-page">
      <div className="archive-header">
        <h1>아카이브</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalLogs}</div>
          <div className="stat-label">총 기록 수</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalCommits}</div>
          <div className="stat-label">커밋 수</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.workDays}</div>
          <div className="stat-label">작업 일수</div>
        </div>
      </div>

      <div className="filter-row">
        <input type="date" className="date-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <span className="filter-sep">~</span>
        <input type="date" className="date-input" value={toDate} onChange={e => setToDate(e.target.value)} />
        <button className="export-btn" onClick={exportMd} disabled={exporting || logs.length === 0}>
          {exporting ? '생성 중...' : '이력서용 내보내기'}
        </button>
      </div>

      {exportText && (
        <div className="export-box">
          <div className="export-box-header">
            <span>마크다운 내보내기 — Claude에 붙여넣어 이력서 문구를 생성해 보세요</span>
            <button className="copy-btn" onClick={copyToClipboard}>복사</button>
          </div>
          <pre className="export-text">{exportText}</pre>
        </div>
      )}

      <div className="log-groups">
        {Object.keys(grouped).sort().reverse().map(date => (
          <div key={date} className="log-group">
            <div className="group-date">
              {new Date(date + 'T12:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
              <span className="group-count">{grouped[date].length}건</span>
            </div>
            {grouped[date].map(log => (
              <div key={log.id} className={`log-row ${log.source}`}>
                <span className={`src-dot ${log.source}`} />
                <span className="log-time">
                  {new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="log-desc">{log.description}</span>
                {log.techs && (
                  <div className="log-techs">
                    {JSON.parse(log.techs).map((t: string) => (
                      <span key={t} className="tech-sm">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
        {logs.length === 0 && <div className="archive-empty">해당 기간에 기록이 없습니다</div>}
      </div>
    </div>
  )
}
