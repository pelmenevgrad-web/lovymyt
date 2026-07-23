import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import { useCategories } from '../context/CategoriesContext.jsx'
import ReviewsList from '../components/ReviewsList.jsx'
import BackButton from '../components/BackButton.jsx'
import { apiFetch } from '../lib/api.js'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function UserArchiveScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { categories } = useCategories()
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState(null)
  const [status, setStatus] = useState('pending') // pending | ok | error

  useEffect(() => {
    Promise.all([
      apiFetch(`/users/${id}`),
      apiFetch(`/users/${id}/events`),
    ])
      .then(([{ user }, { events }]) => { setUser(user); setEvents(events); setStatus('ok') })
      .catch(() => setStatus('error'))
  }, [id])

  if (status === 'pending') {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={28} className="spin" color="var(--text-3)" />
      </div>
    )
  }

  if (status === 'error' || !user) {
    return (
      <div className="page" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, minHeight: '60vh', paddingLeft: 32, paddingRight: 32, textAlign: 'center',
      }}>
        <AlertTriangle size={28} color="var(--text-3)" />
        <div style={{ fontWeight: 700, fontSize: 15 }}>Не вдалося завантажити архів</div>
      </div>
    )
  }

  const reliability = user.events_joined_count > 0
    ? `${Math.round((1 - user.no_show_count / user.events_joined_count) * 100)}%`
    : '—'

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800 }}>Архів — {user.first_name}</h1>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
            Надійність {reliability}{user.events_joined_count > 0 ? ` (${user.no_show_count} неявок з ${user.events_joined_count} заходів)` : ''}
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 16px 0' }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Заходи, де був</div>
        {events.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>Поки що немає завершених заходів.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {events.map(e => {
              const cat = categories.find(c => c.id === e.category_id) ?? categories[0]
              return (
                <div
                  key={e.id} className="card"
                  onClick={() => navigate(`/events/${e.id}`)}
                  style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: cat.color + '22', color: cat.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <cat.Icon size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                      {e.is_creator && (
                        <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)', flexShrink: 0 }}>Організатор</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{formatDate(e.start_time)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>
          Відгуки <span style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: 14 }}>({user.rating_count})</span>
        </div>
        <ReviewsList userId={user.id} />
      </div>

      <div style={{ height: 20 }} />
    </div>
  )
}
