import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import { Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiFetch } from '../lib/api.js'
import BackButton from '../components/BackButton.jsx'
import LocationSearchPicker from '../components/LocationSearchPicker.jsx'

const BIO_MAX = 300
const KYIV = { lat: 50.4501, lng: 30.5234 }

const GENDER_OPTIONS = [
  { value: 'male', label: 'Чоловіча' },
  { value: 'female', label: 'Жіноча' },
]

const RADIUS_OPTIONS = [5, 10, 25, 50]

export default function EditProfileScreen() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const [bio, setBio] = useState(user?.bio ?? '')
  const [gender, setGender] = useState(user?.gender ?? null)
  const [birthDate, setBirthDate] = useState(user?.birth_date ?? '')
  const [notifyAll, setNotifyAll] = useState(!!user?.notify_all_events)
  const [homeAddress, setHomeAddress] = useState('')
  const [homeLat, setHomeLat] = useState(user?.notify_lat ?? KYIV.lat)
  const [homeLng, setHomeLng] = useState(user?.notify_lng ?? KYIV.lng)
  const [radiusKm, setRadiusKm] = useState(user?.notify_radius_km ?? 10)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isDark, setIsDark] = useState(
    document.documentElement.getAttribute('data-theme') === 'dark'
  )

  useEffect(() => {
    const onTheme = () =>
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    WebApp.onEvent('themeChanged', onTheme)
    return () => WebApp.offEvent('themeChanged', onTheme)
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const { user: updated } = await apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          bio, gender, birth_date: birthDate || null,
          notify_all_events: notifyAll,
          notify_lat: notifyAll ? null : homeLat,
          notify_lng: notifyAll ? null : homeLng,
          notify_radius_km: notifyAll ? null : radiusKm,
        }),
      })
      updateUser(updated)
      navigate(-1)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Редагувати профіль</h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Ім'я та аватар беруться з Telegram</p>
        </div>
      </div>

      <div style={{ margin: '8px 16px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: .06, marginBottom: 8 }}>
          Про себе
        </div>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value.slice(0, BIO_MAX))}
          placeholder="Розкажи трохи про себе — інтереси, чим любиш займатися"
          rows={5}
          style={{ resize: 'none' }}
        />
        <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
          {bio.length}/{BIO_MAX}
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: .06, margin: '16px 0 8px' }}>
          Стать
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
          Потрібно тільки для заходів, обмежених за статтю чи квотами
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {GENDER_OPTIONS.map(opt => {
            const active = gender === opt.value
            return (
              <button
                key={opt.value}
                className="chip"
                onClick={() => setGender(active ? null : opt.value)}
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

        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: .06, margin: '16px 0 8px' }}>
          Дата народження
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
          Потрібна для заходів з віковими обмеженнями — без неї приєднатися до таких не вийде
        </p>
        <input
          type="date"
          value={birthDate ?? ''}
          onChange={e => setBirthDate(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
        />

        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: .06, margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bell size={14} /> Сповіщення про нові заходи
        </div>

        <button
          className="chip"
          onClick={() => setNotifyAll(a => !a)}
          style={{
            width: '100%', justifyContent: 'center', marginBottom: 10,
            background: notifyAll ? 'var(--accent)' : 'var(--card)',
            color: notifyAll ? '#fff' : 'var(--text)',
            border: notifyAll ? 'none' : '1.5px solid var(--border)',
          }}
        >
          Про всі заходи, будь-де в Україні
        </button>

        {!notifyAll && (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
              Або обери свою точку на карті та радіус — сповіщатимемо лише про заходи поруч
            </p>
            <LocationSearchPicker
              addressText={homeAddress}
              lat={homeLat}
              lng={homeLng}
              isDark={isDark}
              placeholder="Де ти живеш?"
              hint="Обери підказку або торкнись карти"
              onChange={({ address_text, lat, lng }) => {
                setHomeAddress(address_text)
                setHomeLat(lat)
                setHomeLng(lng)
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {RADIUS_OPTIONS.map(km => (
                <button
                  key={km}
                  className="chip"
                  onClick={() => setRadiusKm(km)}
                  style={{
                    flex: 1, justifyContent: 'center',
                    background: radiusKm === km ? 'var(--accent)' : 'var(--card)',
                    color: radiusKm === km ? '#fff' : 'var(--text)',
                    border: radiusKm === km ? 'none' : '1.5px solid var(--border)',
                  }}
                >
                  {km} км
                </button>
              ))}
            </div>
          </>
        )}

        {error && (
          <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{error}</div>
        )}

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 12, opacity: saving ? .6 : 1 }}
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? 'Зберігаємо…' : 'Зберегти'}
        </button>
      </div>
    </div>
  )
}
