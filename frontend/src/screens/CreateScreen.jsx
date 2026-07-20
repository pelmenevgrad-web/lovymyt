import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Gift, CreditCard, Handshake, PawPrint, Baby, BadgeCheck, Rocket, Zap } from 'lucide-react'
import { CATEGORIES } from '../data/mockData.js'
import { apiFetch } from '../lib/api.js'

// Kyiv center — initial position for the location picker below
const INITIAL_LAT = 50.4501
const INITIAL_LNG = 30.5234

const pickerIcon = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:50%;background:var(--accent);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

function LocationPicker({ lat, lng, onChange }) {
  function ClickCapture() {
    useMapEvents({ click: (e) => onChange(e.latlng.lat, e.latlng.lng) })
    return null
  }

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={13}
      style={{ height: 180, width: '100%', borderRadius: 'var(--radius-md)', marginTop: 8 }}
      zoomControl={false}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="" />
      <ClickCapture />
      <Marker
        position={[lat, lng]}
        icon={pickerIcon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const p = e.target.getLatLng()
            onChange(p.lat, p.lng)
          },
        }}
      />
    </MapContainer>
  )
}

const BUDGET_OPTIONS = [
  { value: 'free',      Icon: Gift,       label: 'Безкоштовно' },
  { value: 'each_pays', Icon: CreditCard, label: 'Кожен платить' },
  { value: 'shared',    Icon: Handshake,  label: 'Складчина' },
]

const CONDITIONS = [
  { key: 'with_pets',      Icon: PawPrint,   label: 'З тваринами' },
  { key: 'with_kids',      Icon: Baby,       label: 'З дітьми' },
  { key: 'verified_only',  Icon: BadgeCheck, label: 'Тільки верифіковані' },
]

function Section({ title, children }) {
  return (
    <div style={{ margin: '0 16px 16px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: .06, marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export default function CreateScreen() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    category_id: null,
    title: '',
    address_text: '',
    start_time: '',
    max_participants: 6,
    min_participants: 2,
    budget_type: 'free',
    age_min: '',
    age_max: '',
    lat: INITIAL_LAT,
    lng: INITIAL_LNG,
    late_join_allowed: false,
    conditions: { with_pets: false, with_kids: false, verified_only: false },
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))
  const toggleCond = (key) => setForm(f => ({
    ...f, conditions: { ...f.conditions, [key]: !f.conditions[key] }
  }))

  const canSubmit = form.category_id !== null && form.title.trim() && form.address_text.trim() && form.start_time

  async function handleCreate() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify({
          category_id: form.category_id,
          title: form.title,
          address_text: form.address_text,
          start_time: new Date(form.start_time).toISOString(),
          lat: form.lat,
          lng: form.lng,
          max_participants: form.max_participants,
          min_participants: form.min_participants,
          budget_type: form.budget_type,
          age_min: form.age_min ? Number(form.age_min) : null,
          age_max: form.age_max ? Number(form.age_max) : null,
          late_join_allowed: form.late_join_allowed,
          conditions: form.conditions,
        }),
      })
      navigate('/')
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1, color: 'var(--text)' }}
        >‹</button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Нова зустріч</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Заповни деталі та запроси компанію</p>
        </div>
      </div>

      {/* Category */}
      <Section title="Категорія">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.filter(c => c.id !== 0).map(cat => {
            const active = form.category_id === cat.id
            return (
              <button
                key={cat.id}
                className="chip"
                onClick={() => set('category_id', cat.id)}
                style={{
                  background: active ? cat.color : 'var(--card)',
                  color: active ? '#fff' : 'var(--text)',
                  border: active ? 'none' : '1.5px solid var(--border)',
                  boxShadow: active ? `0 2px 10px ${cat.color}55` : 'none',
                }}
              >
                <cat.Icon size={18} /> {cat.name}
              </button>
            )
          })}
        </div>
      </Section>

      {/* Title */}
      <Section title="Назва">
        <input
          type="text"
          placeholder="Наприклад: Футбол у парку Шевченка"
          maxLength={80}
          value={form.title}
          onChange={e => set('title', e.target.value)}
        />
      </Section>

      {/* Location */}
      <Section title="Місце">
        <input
          type="text"
          placeholder="Адреса або назва місця"
          value={form.address_text}
          onChange={e => set('address_text', e.target.value)}
        />
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
          Торкнись карти або перетягни мітку, щоб вибрати точку
        </div>
        <LocationPicker
          lat={form.lat}
          lng={form.lng}
          onChange={(lat, lng) => setForm(f => ({ ...f, lat, lng }))}
        />
      </Section>

      {/* Date/time */}
      <Section title="Час початку">
        <input
          type="datetime-local"
          value={form.start_time}
          onChange={e => set('start_time', e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
        />
        <button
          className="chip"
          style={{ marginTop: 8, background: 'var(--orange-light)', color: 'var(--orange)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          onClick={() => {
            const now = new Date(Date.now() + 5 * 60_000)
            set('start_time', now.toISOString().slice(0, 16))
          }}
        >
          <Zap size={15} /> Прямо зараз
        </button>
      </Section>

      {/* Late join */}
      <Section title="Приєднання">
        <button
          className="chip"
          onClick={() => set('late_join_allowed', !form.late_join_allowed)}
          style={{
            background: form.late_join_allowed ? 'var(--green-light)' : 'var(--card)',
            color: form.late_join_allowed ? 'var(--green)' : 'var(--text)',
            border: form.late_join_allowed ? '1.5px solid var(--green)' : '1.5px solid var(--border)',
            fontWeight: form.late_join_allowed ? 700 : 500,
          }}
        >
          <Zap size={15} /> Можна приєднатися, коли вже почалось
        </button>
      </Section>

      {/* Participants */}
      <Section title={`Учасники: ${form.min_participants}–${form.max_participants}`}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Мінімум</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => set('min_participants', Math.max(2, form.min_participants - 1))} style={counterBtn}>−</button>
              <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{form.min_participants}</span>
              <button onClick={() => set('min_participants', Math.min(form.max_participants, form.min_participants + 1))} style={counterBtn}>+</button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Максимум</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => set('max_participants', Math.max(form.min_participants, form.max_participants - 1))} style={counterBtn}>−</button>
              <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{form.max_participants}</span>
              <button onClick={() => set('max_participants', Math.min(50, form.max_participants + 1))} style={counterBtn}>+</button>
            </div>
          </div>
        </div>
      </Section>

      {/* Budget */}
      <Section title="Бюджет">
        <div style={{ display: 'flex', gap: 8 }}>
          {BUDGET_OPTIONS.map(opt => {
            const active = form.budget_type === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => set('budget_type', opt.value)}
                className="chip"
                style={{
                  flex: 1, justifyContent: 'center',
                  background: active ? 'var(--accent)' : 'var(--card)',
                  color: active ? '#fff' : 'var(--text)',
                  border: active ? 'none' : '1.5px solid var(--border)',
                  fontSize: 12, padding: '10px 8px',
                }}
              >
                <opt.Icon size={15} /> {opt.label}
              </button>
            )
          })}
        </div>
      </Section>

      {/* Age range */}
      <Section title="Вік учасників (необов'язково)">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="number" placeholder="від" min={14} max={99}
            value={form.age_min} onChange={e => set('age_min', e.target.value)}
            style={{ textAlign: 'center' }}
          />
          <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>–</span>
          <input type="number" placeholder="до" min={14} max={99}
            value={form.age_max} onChange={e => set('age_max', e.target.value)}
            style={{ textAlign: 'center' }}
          />
        </div>
      </Section>

      {/* Conditions */}
      <Section title="Умови">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CONDITIONS.map(cond => {
            const active = form.conditions[cond.key]
            return (
              <button
                key={cond.key}
                className="chip"
                onClick={() => toggleCond(cond.key)}
                style={{
                  background: active ? 'var(--accent-light)' : 'var(--card)',
                  color: active ? 'var(--accent)' : 'var(--text)',
                  border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                  fontWeight: active ? 700 : 500,
                }}
              >
                <cond.Icon size={15} /> {cond.label}
              </button>
            )
          })}
        </div>
      </Section>

      {/* Submit */}
      <div style={{ padding: '8px 16px 24px' }}>
        {submitError && (
          <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>{submitError}</div>
        )}
        <button
          className="btn btn-primary"
          style={{ width: '100%', fontSize: 16, padding: '16px', opacity: canSubmit && !submitting ? 1 : .45 }}
          disabled={!canSubmit || submitting}
          onClick={handleCreate}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            {submitting ? 'Створюємо…' : <>Створити і відкрити чат <Rocket size={18} /></>}
          </span>
        </button>
      </div>
    </div>
  )
}

const counterBtn = {
  width: 32, height: 32, borderRadius: '50%',
  background: 'var(--accent-light)', color: 'var(--accent)',
  border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
