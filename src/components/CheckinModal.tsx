import { useState, useEffect } from 'react'
import api from '../api'
import type { WorkType, TechTag } from '../types'
import './Modal.css'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function CheckinModal({ onClose, onSaved }: Props) {
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [techTags, setTechTags] = useState<TechTag[]>([])
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedTechs, setSelectedTechs] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [impact, setImpact] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newTech, setNewTech] = useState('')
  const [addingTech, setAddingTech] = useState(false)

  useEffect(() => {
    api.getWorkTypes().then(setWorkTypes)
    api.getTechTags().then(setTechTags)
  }, [])

  const addTech = async () => {
    const label = newTech.trim()
    if (!label) return
    await api.insertTechTag(label)
    const updated = await api.getTechTags()
    setTechTags(updated)
    setSelectedTechs(prev => [...prev, label])
    setNewTech('')
    setAddingTech(false)
  }

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
      await api.insertLog({
        timestamp: new Date().toISOString(),
        source: 'checkin',
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
          <h2>체크인</h2>
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
                  style={selectedType === wt.label ? { backgroundColor: wt.color, borderColor: wt.color } : { borderColor: wt.color, color: wt.color }}
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
              {addingTech ? (
                <input
                  className="tech-add-input"
                  placeholder="기술 이름"
                  value={newTech}
                  onChange={e => setNewTech(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addTech()
                    if (e.key === 'Escape') { setAddingTech(false); setNewTech('') }
                  }}
                  autoFocus
                />
              ) : (
                <button className="tag-btn tech-add-btn" onClick={() => setAddingTech(true)}>
                  + 추가
                </button>
              )}
            </div>
          </section>

          <section>
            <label className="section-label">작업 내용 *</label>
            <input
              className="text-input"
              placeholder="지금 한 작업을 한 줄로 입력해 주세요"
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
              autoFocus
            />
          </section>

          <section>
            <label className="section-label">임팩트 <span className="optional">(선택, 수치 포함 권장)</span></label>
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
