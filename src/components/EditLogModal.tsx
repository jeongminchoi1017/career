import { useState, useEffect } from 'react'
import api from '../api'
import type { Log, WorkType, TechTag } from '../types'
import './Modal.css'

interface Props {
  log: Log
  onClose: () => void
  onSaved: () => void
}

export default function EditLogModal({ log, onClose, onSaved }: Props) {
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [techTags, setTechTags] = useState<TechTag[]>([])
  const [selectedType, setSelectedType] = useState(log.work_type ?? '')
  const [selectedTechs, setSelectedTechs] = useState<string[]>(
    log.techs ? JSON.parse(log.techs) : []
  )
  const [description, setDescription] = useState(log.description ?? '')
  const [impact, setImpact] = useState(log.impact ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getWorkTypes().then(setWorkTypes)
    api.getTechTags().then(setTechTags)
  }, [])

  const toggleTech = (label: string) => {
    setSelectedTechs(prev =>
      prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]
    )
  }

  const save = async () => {
    if (!description.trim()) return
    setSaving(true)
    setError('')
    try {
      await api.updateLog(log.id, {
        work_type: selectedType || undefined,
        techs: selectedTechs.length ? selectedTechs : undefined,
        description: description.trim(),
        impact: impact.trim() || undefined,
      })
      onSaved()
      onClose()
    } catch (e) {
      setError(`저장 실패: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>체크인 수정</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <section>
            <label className="section-label">작업 유형</label>
            <div className="tag-group">
              {workTypes.map(wt => (
                <button
                  key={wt.id}
                  className={`tag-btn ${selectedType === wt.label ? 'active' : ''}`}
                  style={selectedType === wt.label
                    ? { backgroundColor: wt.color, borderColor: wt.color }
                    : { borderColor: wt.color, color: wt.color }}
                  onClick={() => setSelectedType(selectedType === wt.label ? '' : wt.label)}
                >
                  {wt.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="section-label">기술 스택 (복수 선택)</label>
            <div className="tag-group">
              {techTags.map(tt => (
                <button
                  key={tt.id}
                  className={`tag-btn tech ${selectedTechs.includes(tt.label) ? 'active' : ''}`}
                  onClick={() => toggleTech(tt.label)}
                >
                  {tt.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className="section-label">작업 내용 *</label>
            <input
              className="text-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              autoFocus
            />
          </section>

          <section>
            <label className="section-label">임팩트 <span className="optional">(선택)</span></label>
            <input
              className="text-input"
              placeholder="예: 로그인 실패율 12% 감소"
              value={impact}
              onChange={e => setImpact(e.target.value)}
            />
          </section>
        </div>

        {error && <div className="modal-error">{error}</div>}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={save} disabled={!description.trim() || saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
