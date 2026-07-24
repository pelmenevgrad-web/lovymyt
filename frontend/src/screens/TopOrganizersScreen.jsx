import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Loader2, AlertTriangle, BadgeCheck } from 'lucide-react'
import { Avatar } from '../components/EventCard.jsx'
import BackButton from '../components/BackButton.jsx'
import { apiFetch } from '../lib/api.js'

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

export default function TopOrganizersScreen() {
  const navigate = useNavigate()
  const [organizers, setOrganizers] = useState(null)
  const [status, setStatus] = useState('pending') // pending | ok | error

  useEffect(() => {
    apiFetch('/organizers/top')
      .then(({ organizers }) => { setOrganizers(organizers); setStatus('ok') })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Топ організаторів</h1>
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

        {status === 'ok' && organizers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 13 }}>
            Поки що немає оцінених організаторів.
          </div>
        )}

        {status === 'ok' && organizers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {organizers.map((o, i) => (
              <div
                key={o.id} className="card"
                onClick={() => navigate(`/users/${o.id}`)}
                style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              >
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-3)', width: 20, flexShrink: 0, textAlign: 'center' }}>
                  {i + 1}
                </span>
                <Avatar name={o.first_name} url={o.avatar_url} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.first_name}
                    </span>
                    {o.is_verified && <BadgeCheck size={13} color="var(--accent)" />}
                    {o.is_pro && <Star size={12} fill="#F59E0B" color="#F59E0B" />}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                    {o.events_organized} {o.events_organized === 1 ? 'захід' : 'заходів'} проведено
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <Stars rating={o.rating_avg} />
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{o.rating_avg} ({o.rating_count})</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
