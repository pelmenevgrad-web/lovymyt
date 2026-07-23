import { useState, useRef } from 'react'
import { X, Camera, BadgeCheck, Loader2 } from 'lucide-react'
import { apiFetch } from '../lib/api.js'
import { compressImage } from '../lib/image.js'

// Bottom sheet for applying for the verified badge — a photo (proof of a
// real person) plus an optional note, queued for admin review.
export default function VerificationSheet({ onClose, onSubmitted }) {
  const [photo, setPhoto] = useState(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  async function handlePickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setPhoto(await compressImage(file))
    } catch {
      setError('Не вдалося обробити фото')
    }
  }

  async function handleSubmit() {
    if (!photo || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const { request } = await apiFetch('/users/me/verification', {
        method: 'POST',
        body: JSON.stringify({ photo, note: note.trim() || undefined }),
      })
      onSubmitted(request)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', borderRadius: '20px 20px 0 0', padding: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BadgeCheck size={17} color="var(--accent)" /> Заявка на верифікацію
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
          Додай своє фото (селфі) — адмін порівняє з аватаркою і підтвердить, що це реальна людина.
        </p>

        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>{error}</div>}

        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePickFile} />
        <div
          onClick={() => fileInputRef.current?.click()}
          className="card"
          style={{
            marginBottom: 12, padding: photo ? 0 : 24, cursor: 'pointer',
            border: '1.5px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {photo ? (
            <img src={photo} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-3)' }}>
              <Camera size={22} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Додати фото</span>
            </div>
          )}
        </div>

        <textarea
          placeholder="Коментар для адміна (необов'язково)"
          rows={2}
          value={note}
          onChange={e => setNote(e.target.value)}
          style={{ resize: 'none', width: '100%', marginBottom: 12 }}
        />

        <button
          className="btn btn-primary"
          style={{ width: '100%', opacity: submitting || !photo ? .6 : 1 }}
          disabled={submitting || !photo}
          onClick={handleSubmit}
        >
          {submitting ? 'Надсилаємо…' : 'Надіслати заявку'}
        </button>
      </div>
    </div>
  )
}
