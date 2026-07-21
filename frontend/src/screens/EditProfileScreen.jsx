import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { apiFetch } from '../lib/api.js'
import BackButton from '../components/BackButton.jsx'

const BIO_MAX = 300

const GENDER_OPTIONS = [
  { value: 'male', label: 'Чоловіча' },
  { value: 'female', label: 'Жіноча' },
]

export default function EditProfileScreen() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const [bio, setBio] = useState(user?.bio ?? '')
  const [gender, setGender] = useState(user?.gender ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const { user: updated } = await apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ bio, gender }),
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
