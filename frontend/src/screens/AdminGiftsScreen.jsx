import { useState, useEffect } from 'react'
import { Plus, Pencil, Check, X, Loader2, Star } from 'lucide-react'
import BackButton from '../components/BackButton.jsx'
import IconPicker from '../components/IconPicker.jsx'
import { apiFetch } from '../lib/api.js'
import { resolveIcon } from '../lib/icons.js'

function GiftForm({ initial, onSave, onCancel, saving }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [iconName, setIconName] = useState(initial?.icon_name ?? 'Gift')
  const [priceStars, setPriceStars] = useState(initial?.price_stars ?? 10)
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0)

  const valid = name.trim() && Number(priceStars) > 0

  return (
    <div className="card" style={{ padding: 14, marginBottom: 10 }}>
      <input
        placeholder="Назва подарунка" value={name}
        onChange={e => setName(e.target.value)} style={{ marginBottom: 10, width: '100%' }}
      />
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <input
          type="number" min={1} placeholder="Ціна, Stars" value={priceStars}
          onChange={e => setPriceStars(e.target.value)} style={{ flex: 1 }}
        />
        <input
          type="number" placeholder="Порядок" value={sortOrder}
          onChange={e => setSortOrder(Number(e.target.value))} style={{ width: 90 }}
        />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Іконка</div>
      <IconPicker value={iconName} onChange={setIconName} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          className="btn btn-primary" style={{ flex: 1, opacity: saving || !valid ? .6 : 1 }}
          disabled={saving || !valid}
          onClick={() => onSave({ name: name.trim(), icon_name: iconName, price_stars: Number(priceStars), sort_order: sortOrder })}
        >
          {saving ? 'Зберігаємо…' : 'Зберегти'}
        </button>
        <button className="btn btn-ghost" style={{ flex: 1 }} disabled={saving} onClick={onCancel}>Скасувати</button>
      </div>
    </div>
  )
}

export default function AdminGiftsScreen() {
  const [gifts, setGifts] = useState(null)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  function load() {
    apiFetch('/admin/gifts')
      .then(({ gifts }) => setGifts(gifts))
      .catch(err => console.error('[AdminGifts] failed to load:', err.message))
  }

  useEffect(load, [])

  async function handleCreate(payload) {
    setSaving(true)
    try {
      await apiFetch('/admin/gifts', { method: 'POST', body: JSON.stringify(payload) })
      setCreating(false)
      load()
    } catch (err) {
      console.error('[AdminGifts] create failed:', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id, payload) {
    setSaving(true)
    try {
      await apiFetch(`/admin/gifts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
      setEditingId(null)
      load()
    } catch (err) {
      console.error('[AdminGifts] update failed:', err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(g) {
    try {
      await apiFetch(`/admin/gifts/${g.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !g.is_active }) })
      load()
    } catch (err) {
      console.error('[AdminGifts] toggle failed:', err.message)
    }
  }

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Подарунки</h1>
      </div>

      <div style={{ padding: '8px 16px 24px' }}>
        {!creating && (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => setCreating(true)}
          >
            <Plus size={16} /> Додати подарунок
          </button>
        )}
        {creating && (
          <GiftForm saving={saving} onCancel={() => setCreating(false)} onSave={handleCreate} />
        )}

        {gifts === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 size={24} className="spin" color="var(--text-3)" />
          </div>
        ) : (
          gifts.map(g => {
            if (editingId === g.id) {
              return (
                <GiftForm
                  key={g.id} initial={g} saving={saving}
                  onCancel={() => setEditingId(null)}
                  onSave={(payload) => handleUpdate(g.id, payload)}
                />
              )
            }
            const Icon = resolveIcon(g.icon_name)
            return (
              <div
                key={g.id} className="card"
                style={{ padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, opacity: g.is_active ? 1 : .5 }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'var(--accent-light)', color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={10} fill="currentColor" /> {g.price_stars} · {g.is_active ? 'Активний' : 'Прихований'}
                  </div>
                </div>
                <button
                  onClick={() => setEditingId(g.id)}
                  style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text)' }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => toggleActive(g)}
                  style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 8, padding: 8, cursor: 'pointer', color: g.is_active ? 'var(--red)' : 'var(--green)' }}
                >
                  {g.is_active ? <X size={14} /> : <Check size={14} />}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
