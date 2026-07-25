import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, Loader2, Save, Rocket } from 'lucide-react'
import { useCategories } from '../context/CategoriesContext.jsx'
import { apiFetch } from '../lib/api.js'
import { compressImage } from '../lib/image.js'
import BackButton from '../components/BackButton.jsx'

const WEEKDAYS = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

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

export default function CreateClubScreen() {
  const navigate = useNavigate()
  const { categories } = useCategories()
  const { id: clubId } = useParams()
  const isEdit = !!clubId
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState(null)
  const [form, setForm] = useState({
    title: '', description: '', category_id: null, cover_image: null, weekday: null, time_of_day: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!isEdit) return
    apiFetch(`/clubs/${clubId}`)
      .then(({ club }) => {
        if (!club.is_creator) {
          setLoadError('Редагувати може тільки організатор')
          return
        }
        setForm({
          title: club.title, description: club.description ?? '', category_id: club.category_id ?? null,
          cover_image: club.cover_image_url ?? null, weekday: club.weekday ?? null, time_of_day: club.time_of_day ?? '',
        })
      })
      .catch(err => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [isEdit, clubId])

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  async function handlePickPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      set('cover_image', await compressImage(file))
    } catch {
      setSubmitError('Не вдалося обробити фото')
    }
  }

  const canSubmit = form.title.trim()

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const body = {
        title: form.title.trim(), description: form.description.trim() || null,
        category_id: form.category_id, weekday: form.weekday, time_of_day: form.time_of_day || null,
        cover_image: form.cover_image?.startsWith('data:') ? form.cover_image : undefined,
      }
      const { club } = await apiFetch(isEdit ? `/clubs/${clubId}` : '/clubs', {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      })
      navigate(`/clubs/${club.id}`)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
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
        gap: 10, minHeight: '60vh', paddingLeft: 32, paddingRight: 32, textAlign: 'center',
      }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{loadError}</div>
      </div>
    )
  }

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{isEdit ? 'Редагувати клуб' : 'Новий клуб'}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Регулярний захід — люди підпишуться раз і отримають кожен новий випуск</p>
        </div>
      </div>

      <Section title="Обкладинка (необов'язково)">
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePickPhoto} />
        <div
          onClick={() => fileInputRef.current?.click()}
          className="card"
          style={{
            padding: form.cover_image ? 0 : 24, cursor: 'pointer',
            border: '1.5px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {form.cover_image ? (
            <img src={form.cover_image} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-3)' }}>
              <Camera size={22} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Додати обкладинку</span>
            </div>
          )}
        </div>
      </Section>

      <Section title="Назва">
        <input
          type="text" placeholder="Наприклад: Волейбол щочетверга"
          maxLength={80} value={form.title} onChange={e => set('title', e.target.value)}
        />
      </Section>

      <Section title="Опис (необов'язково)">
        <textarea
          placeholder="Про що клуб, для кого"
          maxLength={500} rows={3} value={form.description}
          onChange={e => set('description', e.target.value)}
          style={{ resize: 'none' }}
        />
      </Section>

      <Section title="Категорія (необов'язково)">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {categories.filter(c => c.id !== 0).map(cat => {
            const active = form.category_id === cat.id
            return (
              <button
                key={cat.id}
                className="chip"
                onClick={() => set('category_id', active ? null : cat.id)}
                style={{
                  background: active ? cat.color : 'var(--card)',
                  color: active ? '#fff' : 'var(--text)',
                  border: active ? 'none' : '1.5px solid var(--border)',
                }}
              >
                <cat.Icon size={16} /> {cat.name}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Регулярність (необов'язково)">
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {WEEKDAYS.map((label, i) => {
            const active = form.weekday === i
            return (
              <button
                key={i}
                className="chip"
                onClick={() => set('weekday', active ? null : i)}
                style={{
                  flex: 1, justifyContent: 'center', padding: '8px 0', fontSize: 12,
                  background: active ? 'var(--accent)' : 'var(--card)',
                  color: active ? '#fff' : 'var(--text)',
                  border: active ? 'none' : '1.5px solid var(--border)',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
        <input
          type="time" value={form.time_of_day}
          onChange={e => set('time_of_day', e.target.value)}
        />
      </Section>

      <div style={{ padding: '8px 16px 24px' }}>
        {submitError && (
          <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>{submitError}</div>
        )}
        <button
          className="btn btn-primary"
          style={{ width: '100%', fontSize: 16, padding: '16px', opacity: canSubmit && !submitting ? 1 : .45 }}
          disabled={!canSubmit || submitting}
          onClick={handleSubmit}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            {isEdit
              ? (submitting ? 'Зберігаємо…' : <>Зберегти зміни <Save size={18} /></>)
              : (submitting ? 'Створюємо…' : <>Створити клуб <Rocket size={18} /></>)}
          </span>
        </button>
      </div>
    </div>
  )
}
