import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gift, CreditCard, Handshake, PawPrint, Baby, BadgeCheck, Rocket, MapPin, Zap } from 'lucide-react'
import { CATEGORIES } from '../data/mockData.js'

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
    late_join_allowed: false,
    conditions: { with_pets: false, with_kids: false, verified_only: false },
  })

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))
  const toggleCond = (key) => setForm(f => ({
    ...f, conditions: { ...f.conditions, [key]: !f.conditions[key] }
  }))

  const canSubmit = form.category_id !== null && form.title.trim() && form.address_text.trim() && form.start_time

  function handleCreate() {
    if (!canSubmit) return
    alert(`Мероприятие "${form.title}" створено! (mock)`)
    navigate('/')
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
        <div
          style={{
            marginTop: 8, height: 120, borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #E0E7FF, #DDD6FE)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 6, cursor: 'pointer',
            border: '1.5px dashed var(--accent)',
          }}
          onClick={() => alert('Picker карти буде тут')}
        >
          <MapPin size={28} color="var(--accent)" />
          <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>Вибрати точку на карті</span>
        </div>
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
        <button
          className="btn btn-primary"
          style={{ width: '100%', fontSize: 16, padding: '16px', opacity: canSubmit ? 1 : .45 }}
          disabled={!canSubmit}
          onClick={handleCreate}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            Створити і відкрити чат <Rocket size={18} />
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
