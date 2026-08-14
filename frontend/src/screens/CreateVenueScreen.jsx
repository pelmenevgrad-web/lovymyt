import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import { Camera, Loader2, Save, Rocket } from 'lucide-react'
import { apiFetch } from '../lib/api.js'
import { compressImage } from '../lib/image.js'
import { resolveIcon } from '../lib/icons.js'
import BackButton from '../components/BackButton.jsx'
import LocationSearchPicker from '../components/LocationSearchPicker.jsx'

const INITIAL_LAT = 50.4501
const INITIAL_LNG = 30.5234

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

export default function CreateVenueScreen() {
  const navigate = useNavigate()
  const { id: venueId } = useParams()
  const isEdit = !!venueId
  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState(null)
  const [form, setForm] = useState({
    title: '', description: '', address_text: '', lat: INITIAL_LAT, lng: INITIAL_LNG,
    photo: null, price_info: '', category_id: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [categories, setCategories] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    apiFetch('/venue-categories')
      .then(({ venue_categories }) => setCategories(venue_categories))
      .catch(err => console.error('[CreateVenue] failed to load categories:', err.message))
  }, [])

  const [isDark, setIsDark] = useState(document.documentElement.getAttribute('data-theme') === 'dark')
  useEffect(() => {
    const onTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    WebApp.onEvent('themeChanged', onTheme)
    return () => WebApp.offEvent('themeChanged', onTheme)
  }, [])

  useEffect(() => {
    if (!isEdit) return
    apiFetch(`/venues/${venueId}`)
      .then(({ venue }) => {
        if (!venue.is_owner) {
          setLoadError('Редагувати може тільки власник')
          return
        }
        if (venue.status === 'approved') {
          setLoadError('Локацію вже підтверджено — редагування недоступне')
          return
        }
        setForm({
          title: venue.title, description: venue.description ?? '',
          address_text: venue.address_text, lat: venue.lat, lng: venue.lng,
          photo: venue.photo_url, price_info: venue.price_info ?? '', category_id: venue.category_id ?? null,
        })
      })
      .catch(err => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [isEdit, venueId])

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  async function handlePickPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      set('photo', await compressImage(file))
    } catch {
      setSubmitError('Не вдалося обробити фото')
    }
  }

  const canSubmit = form.title.trim() && form.address_text.trim() && form.photo

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const body = {
        title: form.title.trim(), description: form.description.trim() || null,
        address_text: form.address_text, lat: form.lat, lng: form.lng,
        price_info: form.price_info.trim() || null, category_id: form.category_id,
        // Unchanged photo (already a hosted URL, not edited) is skipped —
        // backend only re-uploads when it looks like a fresh data: URL.
        photo: form.photo?.startsWith('data:') ? form.photo : undefined,
      }
      const { venue } = await apiFetch(isEdit ? `/venues/${venueId}` : '/venues', {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      })
      navigate(`/venues/${venue.id}`)
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
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{isEdit ? 'Редагувати локацію' : 'Нова локація'}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Оголошення пройде безкоштовну модерацію перед показом</p>
        </div>
      </div>

      <Section title="Фото">
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePickPhoto} />
        <div
          onClick={() => fileInputRef.current?.click()}
          className="card"
          style={{
            padding: form.photo ? 0 : 24, cursor: 'pointer',
            border: '1.5px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {form.photo ? (
            <img src={form.photo} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-3)' }}>
              <Camera size={22} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Додати фото локації</span>
            </div>
          )}
        </div>
      </Section>

      <Section title="Назва">
        <input
          type="text" placeholder="Наприклад: Альтанки на озері"
          maxLength={80} value={form.title} onChange={e => set('title', e.target.value)}
        />
      </Section>

      <Section title="Тип закладу (необов'язково)">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {categories.map(cat => {
            const active = form.category_id === cat.id
            const Icon = resolveIcon(cat.icon_name)
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
                <Icon size={16} /> {cat.name}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Опис (необов'язково)">
        <textarea
          placeholder="Що є на місці, зручності тощо"
          maxLength={500} rows={3} value={form.description}
          onChange={e => set('description', e.target.value)}
          style={{ resize: 'none' }}
        />
      </Section>

      <Section title="Ціни та умови (необов'язково)">
        <textarea
          placeholder="Наприклад: 500 грн/год будній день, 800 грн/год вихідні, мангал включено"
          maxLength={500} rows={3} value={form.price_info}
          onChange={e => set('price_info', e.target.value)}
          style={{ resize: 'none' }}
        />
      </Section>

      <Section title="Місце">
        <LocationSearchPicker
          addressText={form.address_text} lat={form.lat} lng={form.lng} isDark={isDark}
          onChange={({ address_text, lat, lng }) => setForm(f => ({ ...f, address_text, lat, lng }))}
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
              : (submitting ? 'Надсилаємо…' : <>Надіслати на модерацію <Rocket size={18} /></>)}
          </span>
        </button>
      </div>
    </div>
  )
}
