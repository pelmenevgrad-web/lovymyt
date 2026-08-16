import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import { Bell, Camera, Move } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiFetch } from '../lib/api.js'
import { compressImage } from '../lib/image.js'
import BackButton from '../components/BackButton.jsx'
import LocationSearchPicker from '../components/LocationSearchPicker.jsx'
import ImagePositionPicker from '../components/ImagePositionPicker.jsx'

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
  // *Src holds the picked-but-uncropped photo fed into the position picker;
  // avatar/banner holds the baked crop that's actually sent to the server.
  const [avatarSrc, setAvatarSrc] = useState(user?.avatar_url ?? null)
  const [bannerSrc, setBannerSrc] = useState(user?.banner_url ?? null)
  const [avatar, setAvatar] = useState(user?.avatar_url ?? null)
  const [banner, setBanner] = useState(user?.banner_url ?? null)
  const [avatarChanged, setAvatarChanged] = useState(false)
  const [bannerChanged, setBannerChanged] = useState(false)
  const avatarInputRef = useRef(null)
  const bannerInputRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [isDark, setIsDark] = useState(
    document.documentElement.getAttribute('data-theme') === 'dark'
  )

  async function handlePickAvatar(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setAvatarSrc(await compressImage(file, 1000))
      setAvatarChanged(true)
    } catch {
      setError('Не вдалося обробити фото')
    }
  }

  async function handlePickBanner(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setBannerSrc(await compressImage(file, 1600))
      setBannerChanged(true)
    } catch {
      setError('Не вдалося обробити фото')
    }
  }

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
          ...(avatarChanged ? { avatar } : {}),
          ...(bannerChanged ? { banner } : {}),
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
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Ім'я береться з Telegram</p>
        </div>
      </div>

      {/* Banner + avatar */}
      <div style={{ margin: '8px 16px 0', position: 'relative', paddingBottom: 46 }}>
        <input ref={bannerInputRef} type="file" accept="image/*" hidden onChange={handlePickBanner} />
        <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handlePickAvatar} />

        <ImagePositionPicker
          src={bannerSrc}
          height={170}
          shape="rect"
          onCropped={setBanner}
          onEmptyClick={() => bannerInputRef.current?.click()}
        >
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4, color: '#fff',
            background: 'linear-gradient(135deg, var(--accent-dark) 0%, #7C3AED 100%)',
            border: '1.5px dashed rgba(255,255,255,.4)', borderRadius: 'var(--radius-lg)',
          }}>
            <Camera size={18} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Додати банер</span>
          </div>
        </ImagePositionPicker>

        {bannerSrc && (
          <>
            <div style={{
              position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,.4)',
              borderRadius: 999, padding: '4px 9px', pointerEvents: 'none',
            }}>
              <Move size={11} /> Перетягни, щоб перемістити
            </div>
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className="btn btn-ghost"
              style={{
                position: 'absolute', bottom: 56, right: 10, padding: '6px 12px', fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,.45)', color: '#fff', border: 'none',
              }}
            >
              <Camera size={13} /> Змінити
            </button>
          </>
        )}

        <div style={{ position: 'absolute', left: 14, bottom: 0 }}>
          <ImagePositionPicker
            src={avatarSrc}
            width={88}
            height={88}
            shape="circle"
            onCropped={setAvatar}
            onEmptyClick={() => avatarInputRef.current?.click()}
          >
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Camera size={20} />
            </div>
          </ImagePositionPicker>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid var(--bg)', pointerEvents: 'none' }} />
          {avatarSrc && (
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              style={{
                position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: '50%',
                background: 'var(--accent)', color: '#fff', border: '2px solid var(--bg)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}
            >
              <Camera size={12} />
            </button>
          )}
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
