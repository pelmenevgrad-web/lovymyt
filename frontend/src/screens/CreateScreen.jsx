import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import { Gift, CreditCard, Handshake, PawPrint, Baby, BadgeCheck, Rocket, Save, Zap, Plus, X, Loader2 } from 'lucide-react'
import { useCategories } from '../context/CategoriesContext.jsx'
import { apiFetch } from '../lib/api.js'
import BackButton from '../components/BackButton.jsx'
import LocationSearchPicker from '../components/LocationSearchPicker.jsx'

// Kyiv center — initial position for the location picker below
const INITIAL_LAT = 50.4501
const INITIAL_LNG = 30.5234

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

const GENDER_OPTIONS = [
  { value: 'any',    label: 'Всі' },
  { value: 'male',   label: 'Чоловіки' },
  { value: 'female', label: 'Жінки' },
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
  const { categories } = useCategories()
  const { id: eventId } = useParams()
  const isEdit = !!eventId
  const [loadingEvent, setLoadingEvent] = useState(isEdit)
  const [loadError, setLoadError] = useState(null)
  const [form, setForm] = useState({
    category_id: null,
    title: '',
    description: '',
    address_text: '',
    start_time: '',
    duration_min_hours: 4,
    duration_max_hours: 10,
    max_participants: 6,
    min_participants: 2,
    budget_type: 'free',
    budget_amount: '',
    age_min: '',
    age_max: '',
    allowed_gender: 'any',
    max_male: '',
    max_female: '',
    lat: INITIAL_LAT,
    lng: INITIAL_LNG,
    late_join_allowed: false,
    conditions: { with_pets: false, with_kids: false, verified_only: false },
    supplies: [],
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const [isDark, setIsDark] = useState(
    document.documentElement.getAttribute('data-theme') === 'dark'
  )

  useEffect(() => {
    const onTheme = () =>
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    WebApp.onEvent('themeChanged', onTheme)
    return () => WebApp.offEvent('themeChanged', onTheme)
  }, [])

  useEffect(() => {
    if (!isEdit) return
    apiFetch(`/events/${eventId}`)
      .then(({ event }) => {
        if (!event.is_creator) {
          setLoadError('Редагувати може тільки організатор')
          return
        }
        setForm(f => ({
          ...f,
          category_id: event.category_id,
          title: event.title,
          description: event.description ?? '',
          address_text: event.address_text,
          start_time: event.start_time.slice(0, 16),
          duration_min_hours: event.duration_min_hours ?? 4,
          duration_max_hours: event.end_time
            ? Math.round((new Date(event.end_time) - new Date(event.start_time)) / 3_600_000)
            : 10,
          max_participants: event.max_participants,
          min_participants: event.min_participants,
          budget_type: event.budget_type,
          budget_amount: event.budget_amount ?? '',
          age_min: event.age_min ?? '',
          age_max: event.age_max ?? '',
          allowed_gender: event.allowed_gender ?? 'any',
          max_male: event.max_male ?? '',
          max_female: event.max_female ?? '',
          lat: event.lat,
          lng: event.lng,
          late_join_allowed: event.late_join_allowed,
          conditions: {
            with_pets: !!event.conditions?.with_pets,
            with_kids: !!event.conditions?.with_kids,
            verified_only: !!event.conditions?.verified_only,
          },
        }))
      })
      .catch(err => setLoadError(err.message))
      .finally(() => setLoadingEvent(false))
  }, [isEdit, eventId])

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))
  const toggleCond = (key) => setForm(f => ({
    ...f, conditions: { ...f.conditions, [key]: !f.conditions[key] }
  }))

  const addSupply = () => setForm(f => ({
    ...f, supplies: [...f.supplies, { name: '', needed_amount: '', unit: '' }],
  }))
  const updateSupply = (i, key, value) => setForm(f => ({
    ...f, supplies: f.supplies.map((s, idx) => idx === i ? { ...s, [key]: value } : s),
  }))
  const removeSupply = (i) => setForm(f => ({
    ...f, supplies: f.supplies.filter((_, idx) => idx !== i),
  }))

  const canSubmit = form.category_id !== null && form.title.trim() && form.address_text.trim() && form.start_time

  async function handleCreate() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { event } = await apiFetch(isEdit ? `/events/${eventId}` : '/events', {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify({
          category_id: form.category_id,
          title: form.title,
          address_text: form.address_text,
          start_time: new Date(form.start_time).toISOString(),
          duration_min_hours: form.duration_min_hours,
          duration_max_hours: form.duration_max_hours,
          lat: form.lat,
          lng: form.lng,
          description: form.description.trim() || null,
          max_participants: form.max_participants,
          min_participants: form.min_participants,
          budget_type: form.budget_type,
          budget_amount: form.budget_amount ? Number(form.budget_amount) : null,
          age_min: form.age_min ? Number(form.age_min) : null,
          age_max: form.age_max ? Number(form.age_max) : null,
          allowed_gender: form.allowed_gender,
          max_male: form.max_male ? Number(form.max_male) : null,
          max_female: form.max_female ? Number(form.max_female) : null,
          late_join_allowed: form.late_join_allowed,
          conditions: form.conditions,
        }),
      })

      const validSupplies = form.supplies.filter(s => s.name.trim() && Number(s.needed_amount) > 0)
      await Promise.all(validSupplies.map(s => apiFetch(`/events/${event.id}/supplies`, {
        method: 'POST',
        body: JSON.stringify({ name: s.name.trim(), needed_amount: Number(s.needed_amount), unit: s.unit.trim() || null }),
      }).catch(err => console.error('[Create] failed to add supply:', s.name, err.message))))

      navigate(isEdit ? `/events/${eventId}` : '/')
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingEvent) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={28} className="spin" color="var(--text-3)" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="page" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, minHeight: '60vh', padding: '0 32px', textAlign: 'center',
      }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{loadError}</div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>{isEdit ? 'Редагувати захід' : 'Нова зустріч'}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{isEdit ? 'Зміни деталі заходу' : 'Заповни деталі та запроси компанію'}</p>
        </div>
      </div>

      {/* Category */}
      <Section title="Категорія">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {categories.filter(c => c.id !== 0).map(cat => {
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

      {/* Description */}
      <Section title="Про захід (необов'язково)">
        <textarea
          placeholder="Що будете робити, що взяти з собою тощо"
          maxLength={500}
          rows={3}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          style={{ resize: 'none' }}
        />
      </Section>

      {/* Location */}
      <Section title="Місце">
        <LocationSearchPicker
          addressText={form.address_text}
          lat={form.lat}
          lng={form.lng}
          isDark={isDark}
          onChange={({ address_text, lat, lng }) => setForm(f => ({ ...f, address_text, lat, lng }))}
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

      {/* Duration */}
      <Section title={`Тривалість: ${form.duration_min_hours}–${form.duration_max_hours} год`}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Орієнтовно (мінімум)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => set('duration_min_hours', Math.max(1, form.duration_min_hours - 1))} style={counterBtn}>−</button>
              <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{form.duration_min_hours}</span>
              <button onClick={() => set('duration_min_hours', Math.min(form.duration_max_hours, form.duration_min_hours + 1))} style={counterBtn}>+</button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Максимум (авто-завершення)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => set('duration_max_hours', Math.max(form.duration_min_hours, form.duration_max_hours - 1))} style={counterBtn}>−</button>
              <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{form.duration_max_hours}</span>
              <button onClick={() => set('duration_max_hours', Math.min(48, form.duration_max_hours + 1))} style={counterBtn}>+</button>
            </div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
          Захід автоматично завершиться через {form.duration_max_hours} год після початку, якщо ти не завершиш його раніше
        </p>
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
        {form.budget_type !== 'free' && (
          <input
            type="number"
            min={0}
            placeholder={form.budget_type === 'shared' ? 'Загальна сума, грн' : 'Сума з кожного, грн'}
            value={form.budget_amount}
            onChange={e => set('budget_amount', e.target.value)}
            style={{ marginTop: 8 }}
          />
        )}
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

      {/* Gender */}
      <Section title="Кого можна запрошувати">
        <div style={{ display: 'flex', gap: 8 }}>
          {GENDER_OPTIONS.map(opt => {
            const active = form.allowed_gender === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => set('allowed_gender', opt.value)}
                className="chip"
                style={{
                  flex: 1, justifyContent: 'center',
                  background: active ? 'var(--accent)' : 'var(--card)',
                  color: active ? '#fff' : 'var(--text)',
                  border: active ? 'none' : '1.5px solid var(--border)',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', margin: '10px 0 6px' }}>
          Квоти (необов'язково) — скільки максимум кожної статі
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="number" min={0} placeholder="Макс. жінок"
            value={form.max_female} onChange={e => set('max_female', e.target.value)}
            style={{ textAlign: 'center' }}
          />
          <input
            type="number" min={0} placeholder="Макс. чоловіків"
            value={form.max_male} onChange={e => set('max_male', e.target.value)}
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

      {/* Supplies */}
      <Section title="Що потрібно для заходу (необов'язково)">
        {form.supplies.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Назва (вугілля)"
              value={s.name}
              onChange={e => updateSupply(i, 'name', e.target.value)}
              style={{ flex: 2 }}
            />
            <input
              type="number"
              min={0}
              placeholder="К-сть"
              value={s.needed_amount}
              onChange={e => updateSupply(i, 'needed_amount', e.target.value)}
              style={{ flex: 1, textAlign: 'center' }}
            />
            <input
              type="text"
              placeholder="Од. (мішки)"
              value={s.unit}
              onChange={e => updateSupply(i, 'unit', e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              onClick={() => removeSupply(i)}
              style={{
                background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8,
                width: 32, height: 32, flexShrink: 0, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
        <button
          className="chip"
          onClick={addSupply}
          style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: 'none' }}
        >
          <Plus size={15} /> Додати поле
        </button>
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
            {isEdit
              ? (submitting ? 'Зберігаємо…' : <>Зберегти зміни <Save size={18} /></>)
              : (submitting ? 'Створюємо…' : <>Створити і відкрити чат <Rocket size={18} /></>)}
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
