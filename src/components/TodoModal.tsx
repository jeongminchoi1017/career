import { useState, useEffect } from 'react'
import api from '../api'
import type { WorkType } from '../types'
import './Modal.css'

interface Props {
  date: string
  onClose: () => void
  onSaved: () => void
}

export default function TodoModal({ date, onClose, onSaved }: Props) {
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [items, setItems] = useState<{ content: string; work_type: string }[]>([
    { content: '', work_type: '' }
  ])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getWorkTypes().then(setWorkTypes)
  }, [])

  const addItem = () => setItems(prev => [...prev, { content: '', work_type: '' }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: 'content' | 'work_type', val: string) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  }

  const save = async () => {
    const valid = items.filter(it => it.content.trim())
    if (!valid.length) return
    setSaving(true)
    for (const it of valid) {
      await api.insertTodo(date, it.content.trim(), it.work_type || undefined)
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>오늘 할 일</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {items.map((item, i) => (
            <div key={i} className="todo-row">
              <input
                className="text-input"
                placeholder={`할 일 ${i + 1}`}
                value={item.content}
                onChange={e => updateItem(i, 'content', e.target.value)}
                autoFocus={i === 0}
              />
              <select
                className="select-input"
                value={item.work_type}
                onChange={e => updateItem(i, 'work_type', e.target.value)}
              >
                <option value="">유형</option>
                {workTypes.map(wt => (
                  <option key={wt.id} value={wt.label}>{wt.label}</option>
                ))}
              </select>
              {items.length > 1 && (
                <button className="remove-btn" onClick={() => removeItem(i)}>✕</button>
              )}
            </div>
          ))}
          <button className="add-btn" onClick={addItem}>+ 항목 추가</button>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={save} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
