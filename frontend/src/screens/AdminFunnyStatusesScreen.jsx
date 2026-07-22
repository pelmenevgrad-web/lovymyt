import { useState, useEffect } from 'react'
import { Plus, Pencil, Check, X, Loader2 } from 'lucide-react'
import BackButton from '../components/BackButton.jsx'
import IconPicker from '../components/IconPicker.jsx'
import { apiFetch } from '../lib/api.js'
import { resolveIcon } from '../lib/icons.js'

function StatusForm({ initial, onSave, onCancel, saving }) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [iconName, setIconName] = useState(initial?.icon_name ?? 'Sparkles')
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0)

  return (
    <div className="card" style={{ padding: 14, marginBottom: 10 }}>
      <input
        placeholder="Назва статусу" value={label}
        onChange={e => setLabel(e.target.value)} style={{ marginBottom: 10, width: '100%' }}
      />
      <input
        type="number" placeholder="Порядок" value={sortOrder}
        onChange={e => setSortOrder(Number(e.target.value))} style={{ width: 90, marginBottom: 10 }}
      />
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Іконка</div>
      <IconPicker value={iconName} onChange={setIconName} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          className="btn btn-primary" style={{ flex: 1, opacity: saving || !label.trim() ? .6 : 1 }}
          disabled={saving || !label.trim()}
          onClick={() => onSave({ label: label.trim(), icon_name: iconName, sort_order: sortOrder })}
        >
          {saving ? 'Зберігаємо…' : 'Зберегти'}
        </button>
        <button className="btn btn-ghost" style={{ flex: 1 }} disabled={saving} onClick={onCancel}>Скасувати</button>
      </div>
    </div>
  )
}

export default function AdminFunnyStatusesScreen() {
  const [statuses, setStatuses] = useState(null)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  function load() {
    apiFetch('/admin/funny-statuses')
      .then(({ funny_statuses }) => setStatuses(funny_statuses))
      .catch(err => console.error('[AdminFunnyStatuses] failed to load:', err.message))
  }

  useEffect(load, [])

  async function handleCreate(payload) {
    setSaving(true)
    try {
      await apiFetch('/admin/funny-statuses', { method: 'POST', body: JSON.stringify(payload) })
      setCreating(false)
      load()
    } catch (err) {
      console.error('[AdminFunnyStatuses] create failed:', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id, payload) {
    setSaving(true)
    try {
      await apiFetch(`/admin/funny-statuses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      setEditingId(null)
      load()
    } catch (err) {
      console.error('[AdminFunnyStatuses] update failed:', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(s) {
    try {
      await apiFetch(`/admin/funny-statuses/${s.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !s.is_active }) })
      load()
    } catch (err) {
      console.error('[AdminFunnyStatuses] toggle failed:', err.message)
    }
  }

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Смішні статуси</h1>
      </div>

      <div style={{ padding: '8px 16px 24px' }}>
        {!creating && (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => setCreating(true)}
          >
            <Plus size={16} /> Додати статус
          </button>
        )}
        {creating && (
          <StatusForm saving={saving} onCancel={() => setCreating(false)} onSave={handleCreate} />
        )}

        {statuses === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 size={24} className="spin" color="var(--text-3)" />
          </div>
        ) : (
          statuses.map(s => {
            if (editingId === s.id) {
              return (
                <StatusForm
                  key={s.id} initial={s} saving={saving}
                  onCancel={() => setEditingId(null)}
                  onSave={(payload) => handleUpdate(s.id, payload)}
                />
              )
            }
            const Icon = resolveIcon(s.icon_name)
            return (
              <div
                key={s.id} className="card"
                style={{ padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, opacity: s.is_active ? 1 : .5 }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'var(--accent-light)', color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.is_active ? 'Активний' : 'Прихований'}</div>
                </div>
                <button
                  onClick={() => setEditingId(s.id)}
                  style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text)' }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => toggleActive(s)}
                  style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: 8, cursor: 'pointer', color: s.is_active ? 'var(--red)' : 'var(--green)' }}
                >
                  {s.is_active ? <X size={14} /> : <Check size={14} />}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
