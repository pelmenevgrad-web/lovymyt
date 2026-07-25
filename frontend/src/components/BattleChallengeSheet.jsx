import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Loader2, Swords } from 'lucide-react'
import { apiFetch } from '../lib/api.js'

const ACTIVE_STATUSES = ['planned', 'gathering', 'active']

export default function BattleChallengeSheet({ opponentEventId, onClose }) {
  const navigate = useNavigate()
  const [myEvents, setMyEvents] = useState(null)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    apiFetch('/users/me/events')
      .then(({ events }) => setMyEvents(
        events.filter(e => e.is_creator && ACTIVE_STATUSES.includes(e.status) && e.id !== opponentEventId),
      ))
      .catch(err => setError(err.message))
  }, [opponentEventId])

  async function handleChallenge() {
    if (!selectedId || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const { battle_id } = await apiFetch('/battles', {
        method: 'POST',
        body: JSON.stringify({ challenger_event_id: selectedId, opponent_event_id: opponentEventId }),
      })
      navigate(`/battles/${battle_id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', borderRadius: '20px 20px 0 0', padding: 20, maxHeight: '70vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Swords size={18} /> Виклик на баттл
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
          Обери свій захід — переможе той, за кого проголосує більше людей. Глядачі можуть донатити Stars у призовий фонд переможцю.
        </div>

        {!myEvents && !error && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <Loader2 size={24} className="spin" color="var(--text-3)" />
          </div>
        )}
        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {myEvents && myEvents.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: 20 }}>
            У тебе немає активних заходів, якими можна викликати на баттл
          </div>
        )}
        {myEvents && myEvents.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {myEvents.map(e => (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className="card"
                style={{
                  textAlign: 'left', padding: '10px 14px', cursor: 'pointer',
                  border: selectedId === e.id ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>{e.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{e.address_text}</div>
              </button>
            ))}
          </div>
        )}

        {myEvents && myEvents.length > 0 && (
          <button
            className="btn btn-primary"
            style={{ width: '100%', opacity: selectedId && !submitting ? 1 : .5 }}
            disabled={!selectedId || submitting}
            onClick={handleChallenge}
          >
            {submitting ? 'Викликаємо…' : 'Викликати на баттл'}
          </button>
        )}
      </div>
    </div>
  )
}
