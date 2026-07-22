import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Loader2, AlertTriangle } from 'lucide-react'
import { CATEGORIES } from '../data/mockData.js'
import { Avatar } from '../components/EventCard.jsx'
import BackButton from '../components/BackButton.jsx'
import { apiFetch } from '../lib/api.js'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Stars({ rating }) {
  const rounded = Math.round(rating ?? 0)
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={13} fill={i <= rounded ? 'var(--orange)' : 'none'} color={i <= rounded ? 'var(--orange)' : 'var(--border)'} />
      ))}
    </span>
  )
}

export default function EventHistoryScreen() {
  const navigate = useNavigate()
  const [events, setEvents] = useState(null)
  const [status, setStatus] = useState('pending') // pending | ok | error

  useEffect(() => {
    apiFetch('/events/history')
      .then(({ events }) => { setEvents(events); setStatus('ok') })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Минулі заходи</h1>
      </div>

      <div style={{ padding: '8px 16px 24px' }}>
        {status === 'pending' && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Loader2 size={28} className="spin" color="var(--text-3)" />
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
            <AlertTriangle size={28} style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 700, fontSize: 15 }}>Не вдалося завантажити</div>
          </div>
        )}

        {status === 'ok' && events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 13 }}>
            Поки що немає завершених заходів.
          </div>
        )}

        {status === 'ok' && events.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {events.map((e, i) => {
              const cat = CATEGORIES.find(c => c.id === e.category_id) ?? CATEGORIES[0]
              return (
                <div key={e.id} className="card" style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => navigate(`/events/${e.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-3)', width: 18, flexShrink: 0 }}>{i + 1}</span>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: cat.color + '22', color: cat.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <cat.Icon size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1 }}>{formatDate(e.start_time)}</div>
                    </div>
                    {e.rating_avg != null ? (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <Stars rating={e.rating_avg} />
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{e.rating_avg} ({e.rating_count})</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>Без оцінок</div>
                    )}
                  </div>

                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 28 }}
                    onClick={e2 => { e2.stopPropagation(); navigate(`/users/${e.creator_id}`) }}
                  >
                    <Avatar name={e.creator_name} url={e.creator_avatar_url} size={20} />
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Організатор: <strong style={{ color: 'var(--text)' }}>{e.creator_name}</strong></span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
