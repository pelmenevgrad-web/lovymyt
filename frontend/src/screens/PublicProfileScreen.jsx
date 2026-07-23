import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Star, BadgeCheck, Loader2, AlertTriangle, Gift } from 'lucide-react'
import { Avatar } from '../components/EventCard.jsx'
import BackButton from '../components/BackButton.jsx'
import ReviewsList from '../components/ReviewsList.jsx'
import GiftsReceived from '../components/GiftsReceived.jsx'
import GiftSheet from '../components/GiftSheet.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiFetch } from '../lib/api.js'

function Stars({ rating }) {
  const rounded = Math.round(rating)
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          size={14}
          fill={i <= rounded ? 'var(--orange)' : 'none'}
          color={i <= rounded ? 'var(--orange)' : 'var(--border)'}
        />
      ))}
    </span>
  )
}

function StatBlock({ value, label, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, textAlign: 'center', padding: '14px 8px',
        background: 'var(--card)', borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)', cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500, marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function PublicProfileScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: me, updateUser: updateMe } = useAuth()
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('pending') // pending | ok | error
  const [showGift, setShowGift] = useState(false)

  useEffect(() => {
    apiFetch(`/users/${id}`)
      .then(({ user }) => { setUser(user); setStatus('ok') })
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
        gap: 10, minHeight: '60vh', padding: '0 32px', textAlign: 'center',
      }}>
        <AlertTriangle size={28} color="var(--text-3)" />
        <div style={{ fontWeight: 700, fontSize: 15 }}>Профіль не знайдено</div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--accent-dark) 0%, #7C3AED 100%)',
        padding: '16px 20px 18px',
        borderRadius: '0 0 28px 28px',
        position: 'relative',
      }}>
        <div style={{ marginBottom: 14 }}>
          <BackButton />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <Avatar name={user.first_name} url={user.avatar_url} size={72} />

          <div style={{ flex: 1, color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22, fontWeight: 800 }}>
                {user.first_name || 'Користувач'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              {user.is_verified && (
                <span className="badge" style={{ background: 'rgba(255,255,255,.25)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <BadgeCheck size={13} /> Верифікований
                </span>
              )}
              {user.is_pro && (
                <span className="badge" style={{ background: '#F59E0B', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Star size={11} fill="currentColor" /> PRO
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Stars rating={user.rating_avg} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{user.rating_avg}</span>
              <span style={{ fontSize: 12, opacity: .75 }}>({user.rating_count} відгуків)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatBlock value={user.events_created_count} label="Організував" />
          <StatBlock value={user.events_joined_count} label="Взяв участь" />
          <StatBlock
            value={user.events_joined_count > 0 ? `${Math.round((1 - user.no_show_count / user.events_joined_count) * 100)}%` : '—'}
            label="Надійність"
            onClick={() => navigate(`/users/${user.id}/archive`)}
          />
        </div>
      </div>

      {/* Gift */}
      {me && me.id !== user.id && (
        <div style={{ margin: '16px 16px 0' }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => setShowGift(true)}
          >
            <Gift size={16} /> Подарувати
          </button>
        </div>
      )}

      {/* Bio */}
      {user.bio && (
        <div style={{ margin: '16px 16px 0' }} className="card">
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .06 }}>Про себе</div>
            <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{user.bio}</p>
          </div>
        </div>
      )}

      <GiftsReceived userId={user.id} />

      {/* Reviews */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>
          Відгуки <span style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: 14 }}>({user.rating_count})</span>
        </div>
        <ReviewsList userId={user.id} />
      </div>

      <div style={{ height: 20 }} />

      {showGift && (
        <GiftSheet
          userId={user.id}
          myBalance={me?.stars_balance ?? 0}
          onClose={() => setShowGift(false)}
          onBalanceChange={(stars_balance) => updateMe({ stars_balance })}
        />
      )}
    </div>
  )
}
