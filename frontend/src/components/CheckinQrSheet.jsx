import { useState, useEffect, useRef } from 'react'
import { X, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { apiFetch } from '../lib/api.js'

// Token expires after 3 minutes server-side — refetch a bit before that so
// the QR shown never goes stale while the sheet is open.
const REFRESH_MS = 2.5 * 60 * 1000

export default function CheckinQrSheet({ eventId, onClose }) {
  const [token, setToken] = useState(null)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  async function fetchToken() {
    setError(null)
    try {
      const { token } = await apiFetch(`/events/${eventId}/checkin-token`, { method: 'GET' })
      setToken(token)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    fetchToken()
    intervalRef.current = setInterval(fetchToken, REFRESH_MS)
    return () => clearInterval(intervalRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

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
          <div style={{ fontWeight: 800, fontSize: 17 }}>Мій QR для входу</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '8px 0 4px' }}>
          {error && <div style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>{error}</div>}
          {!error && !token && <Loader2 size={28} className="spin" color="var(--text-3)" />}
          {token && (
            <div style={{ background: '#fff', padding: 14, borderRadius: 'var(--radius-md)' }}>
              <QRCodeSVG value={token} size={200} />
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
            Покажи цей QR організатору при вході
          </div>
          <button className="chip" onClick={fetchToken} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Оновити
          </button>
        </div>
      </div>
    </div>
  )
}

export function CheckedInBadge() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>
      <CheckCircle2 size={16} /> Ти відмічений на заході
    </div>
  )
}
