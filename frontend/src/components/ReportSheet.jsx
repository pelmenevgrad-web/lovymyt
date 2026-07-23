import { useState } from 'react'
import { X, Check, Flag } from 'lucide-react'
import { apiFetch } from '../lib/api.js'

const PRESET_REASONS = [
  'Грубість / образи',
  'Не з’явився без попередження',
  'Шахрайство',
  'Недоречний контент',
  'Переслідування',
]

// Bottom sheet for filing a complaint against another user (POST
// /users/:id/reports) — reachable from their public profile.
export default function ReportSheet({ userId, eventId, onClose }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (!reason.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch(`/users/${userId}/reports`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim(), event_id: eventId || undefined }),
      })
      setDone(true)
      setTimeout(onClose, 1200)
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
            <Flag size={17} color="var(--red)" /> Поскаржитись
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 0' }}>
            <Check size={32} color="var(--green)" />
            <div style={{ fontWeight: 700 }}>Скаргу надіслано</div>
          </div>
        ) : (
          <>
            {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>{error}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {PRESET_REASONS.map(preset => (
                <button
                  key={preset}
                  className="chip"
                  onClick={() => setReason(preset)}
                  style={{
                    background: reason === preset ? 'var(--red)' : 'var(--card)',
                    color: reason === preset ? '#fff' : 'var(--text-2)',
                    border: '1.5px solid ' + (reason === preset ? 'var(--red)' : 'var(--border)'),
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Опиши, що сталося"
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ resize: 'none', width: '100%', marginBottom: 12 }}
            />
            <button
              className="btn"
              style={{ width: '100%', background: 'var(--red)', color: '#fff', opacity: submitting || !reason.trim() ? .6 : 1 }}
              disabled={submitting || !reason.trim()}
              onClick={handleSubmit}
            >
              {submitting ? 'Надсилаємо…' : 'Надіслати скаргу'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
