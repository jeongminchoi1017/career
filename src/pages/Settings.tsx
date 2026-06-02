import { useState, useEffect } from 'react'
import api from '../api'
import type { WorkType, TechTag } from '../types'
import './Settings.css'

const COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316']

export default function Settings() {
  const [morningTime, setMorningTime] = useState('09:00')
  const [checkinInterval, setCheckinInterval] = useState('120')
  const [eveningNotify, setEveningNotify] = useState(true)
  const [eveningTime, setEveningTime] = useState('18:00')
  const [repos, setRepos] = useState<string[]>([])
  const [newRepo, setNewRepo] = useState('')
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [techTags, setTechTags] = useState<TechTag[]>([])
  const [newWtLabel, setNewWtLabel] = useState('')
  const [newWtColor, setNewWtColor] = useState(COLORS[0])
  const [newTech, setNewTech] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    const [morning, interval, evening, eveningT, reposRaw, wt, tt] = await Promise.all([
      api.getSetting('morning_time'),
      api.getSetting('checkin_interval'),
      api.getSetting('evening_notify'),
      api.getSetting('evening_time'),
      api.getSetting('git_repos'),
      api.getWorkTypes(),
      api.getTechTags(),
    ])
    if (morning) setMorningTime(morning)
    if (interval) setCheckinInterval(interval)
    if (evening !== null) setEveningNotify(evening !== 'false')
    if (eveningT) setEveningTime(eveningT)
    if (reposRaw) setRepos(JSON.parse(reposRaw))
    setWorkTypes(wt)
    setTechTags(tt)
  }

  const saveSettings = async () => {
    await Promise.all([
      api.setSetting('morning_time', morningTime),
      api.setSetting('checkin_interval', checkinInterval),
      api.setSetting('evening_notify', String(eveningNotify)),
      api.setSetting('evening_time', eveningTime),
      api.setSetting('git_repos', JSON.stringify(repos)),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addRepo = async () => {
    const path = newRepo.trim()
    if (!path || repos.includes(path)) return
    const updated = [...repos, path]
    setRepos(updated)
    setNewRepo('')
    await api.setSetting('git_repos', JSON.stringify(updated))
  }

  const removeRepo = async (r: string) => {
    const updated = repos.filter(x => x !== r)
    setRepos(updated)
    await api.setSetting('git_repos', JSON.stringify(updated))
  }

  const addWorkType = async () => {
    if (!newWtLabel.trim()) return
    await api.insertWorkType(newWtLabel.trim(), newWtColor)
    setNewWtLabel('')
    const wt = await api.getWorkTypes()
    setWorkTypes(wt)
  }

  const removeWorkType = async (id: number) => {
    await api.deleteWorkType(id)
    const wt = await api.getWorkTypes()
    setWorkTypes(wt)
  }

  const addTech = async () => {
    if (!newTech.trim()) return
    await api.insertTechTag(newTech.trim())
    setNewTech('')
    const tt = await api.getTechTags()
    setTechTags(tt)
  }

  const removeTech = async (id: number) => {
    await api.deleteTechTag(id)
    const tt = await api.getTechTags()
    setTechTags(tt)
  }

  const collectGit = async () => {
    await api.collectGit()
    alert('Git 커밋 수집 완료!')
  }

  return (
    <div className="settings-page">
      <h1>설정</h1>

      <div className="settings-section">
        <h2>알림</h2>
        <div className="setting-row">
          <label>모닝 루틴 시간</label>
          <input type="time" className="time-input" value={morningTime} onChange={e => setMorningTime(e.target.value)} />
        </div>
        <div className="setting-row">
          <label>체크인 주기</label>
          <div className="btn-group">
            {[['60', '1시간'], ['120', '2시간'], ['180', '3시간']].map(([val, label]) => (
              <button
                key={val}
                className={`interval-btn ${checkinInterval === val ? 'active' : ''}`}
                onClick={() => setCheckinInterval(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="setting-row">
          <label>퇴근 마무리 알림</label>
          <div className="toggle-row">
            <button
              className={`toggle ${eveningNotify ? 'on' : ''}`}
              onClick={() => setEveningNotify(v => !v)}
            >
              <span className="toggle-thumb" />
            </button>
            {eveningNotify && (
              <input type="time" className="time-input" value={eveningTime} onChange={e => setEveningTime(e.target.value)} />
            )}
          </div>
        </div>
        <button className="save-btn" onClick={saveSettings}>
          {saved ? '저장됨 ✓' : '설정 저장'}
        </button>
      </div>

      <div className="settings-section">
        <h2>Git 레포</h2>
        <div className="add-row">
          <input
            className="text-input"
            placeholder="레포 절대 경로 (예: C:\Dev\my-project)"
            value={newRepo}
            onChange={e => setNewRepo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRepo()}
          />
          <button className="add-btn" onClick={addRepo}>추가</button>
        </div>
        <ul className="item-list">
          {repos.map(r => (
            <li key={r} className="item-row">
              <span className="item-label mono">{r}</span>
              <button className="remove-btn" onClick={() => removeRepo(r)}>✕</button>
            </li>
          ))}
        </ul>
        {repos.length > 0 && (
          <button className="collect-btn" onClick={collectGit}>지금 수집</button>
        )}
      </div>

      <div className="settings-section">
        <h2>작업 유형</h2>
        <div className="add-row">
          <input
            className="text-input"
            placeholder="유형 이름"
            value={newWtLabel}
            onChange={e => setNewWtLabel(e.target.value)}
          />
          <div className="color-picker">
            {COLORS.map(c => (
              <button
                key={c}
                className={`color-dot ${newWtColor === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setNewWtColor(c)}
              />
            ))}
          </div>
          <button className="add-btn" onClick={addWorkType}>추가</button>
        </div>
        <ul className="item-list">
          {workTypes.map(wt => (
            <li key={wt.id} className="item-row">
              <span className="color-indicator" style={{ background: wt.color }} />
              <span className="item-label">{wt.label}</span>
              <button className="remove-btn" onClick={() => removeWorkType(wt.id)}>✕</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="settings-section">
        <h2>기술 스택</h2>
        <div className="add-row">
          <input
            className="text-input"
            placeholder="기술 스택 이름"
            value={newTech}
            onChange={e => setNewTech(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTech()}
          />
          <button className="add-btn" onClick={addTech}>추가</button>
        </div>
        <div className="tech-grid">
          {techTags.map(tt => (
            <div key={tt.id} className="tech-chip">
              <span>{tt.label}</span>
              <button onClick={e => { e.stopPropagation(); removeTech(tt.id) }}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
