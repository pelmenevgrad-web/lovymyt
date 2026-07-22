import { useState, useEffect } from 'react'
import { Plus, Pencil, Check, X, Loader2 } from 'lucide-react'
import BackButton from '../components/BackButton.jsx'
import IconPicker from '../components/IconPicker.jsx'
import { apiFetch } from '../lib/api.js'
import { resolveIcon } from '../lib/icons.js'
import { useCategories } from '../context/CategoriesContext.jsx'

function CategoryForm({ initial, onSave, onCancel, saving }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? '#6366F1')
  const [iconName, setIconName] = useState(initial?.icon_name ?? 'Sparkles')
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0)

  return (
    <div className="card" style={{ padding: 14, marginBottom: 10 }}>
      <input
        placeholder="Назва категорії" value={name}
        onChange={e => setName(e.target.value)} style={{ marginBottom: 10, width: '100%' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <label style={{ fontSize: 12, color: 'var(--text-2)' }}>Колір</label>
        <input
          type="color" value={color} onChange={e => setColor(e.target.value)}
          style={{ width: 40, height: 32, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
        />
        <input
          type="number" placeholder="Порядок" value={sortOrder}
          onChange={e => setSortOrder(Number(e.target.value))} style={{ width: 90 }}
        />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Іконка</div>
      <IconPicker value={iconName} onChange={setIconName} color={color} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          className="btn btn-primary" style={{ flex: 1, opacity: saving || !name.trim() ? .6 : 1 }}
          disabled={saving || !name.trim()}
          onClick={() => onSave({ name: name.trim(), color, icon_name: iconName, sort_order: sortOrder })}
        >
          {saving ? 'Зберігаємо…' : 'Зберегти'}
        </button>
        <button className="btn btn-ghost" style={{ flex: 1 }} disabled={saving} onClick={onCancel}>Скасувати</button>
      </div>
    </div>
  )
}

export default function AdminCategoriesScreen() {
  const { reload } = useCategories()
  const [categories, setCategories] = useState(null)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  function load() {
    apiFetch('/admin/categories')
      .then(({ categories }) => setCategories(categories))
      .catch(err => console.error('[AdminCategories] failed to load:', err.message))
  }

  useEffect(load, [])

  async function handleCreate(payload) {
    setSaving(true)
    try {
      await apiFetch('/admin/categories', { method: 'POST', body: JSON.stringify(payload) })
      setCreating(false)
      load()
      reload()
    } catch (err) {
      console.error('[AdminCategories] create failed:', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id, payload) {
    setSaving(true)
    try {
      await apiFetch(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      setEditingId(null)
      load()
      reload()
    } catch (err) {
      console.error('[AdminCategories] update failed:', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(cat) {
    try {
      await apiFetch(`/admin/categories/${cat.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !cat.is_active }) })
      load()
      reload()
    } catch (err) {
      console.error('[AdminCategories] toggle failed:', err.message)
    }
  }

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Категорії</h1>
      </div>

      <div style={{ padding: '8px 16px 24px' }}>
        {!creating && (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => setCreating(true)}
          >
            <Plus size={16} /> Додати категорію
          </button>
        )}
        {creating && (
          <CategoryForm saving={saving} onCancel={() => setCreating(false)} onSave={handleCreate} />
        )}

        {categories === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 size={24} className="spin" color="var(--text-3)" />
          </div>
        ) : (
          categories.map(cat => {
            if (editingId === cat.id) {
              return (
                <CategoryForm
                  key={cat.id} initial={cat} saving={saving}
                  onCancel={() => setEditingId(null)}
                  onSave={(payload) => handleUpdate(cat.id, payload)}
                />
              )
            }
            const Icon = resolveIcon(cat.icon_name)
            return (
              <div
                key={cat.id} className="card"
                style={{ padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, opacity: cat.is_active ? 1 : .5 }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: (cat.color ?? '#6366F1') + '22', color: cat.color ?? '#6366F1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cat.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{cat.is_active ? 'Активна' : 'Прихована'}</div>
                </div>
                <button
                  onClick={() => setEditingId(cat.id)}
                  style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text)' }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => toggleActive(cat)}
                  style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: 8, cursor: 'pointer', color: cat.is_active ? 'var(--red)' : 'var(--green)' }}
                >
                  {cat.is_active ? <X size={14} /> : <Check size={14} />}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
