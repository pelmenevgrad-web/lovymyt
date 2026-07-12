import { MOCK_USER, MOCK_REVIEWS, MOCK_EVENTS } from '../data/mockData.js'
import { Avatar } from '../components/EventCard.jsx'

function Stars({ rating }) {
  return (
    <span style={{ fontSize: 14, letterSpacing: 1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? '#F59E0B' : '#E2E8F0' }}>★</span>
      ))}
    </span>
  )
}

function StatBlock({ value, label }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '14px 8px',
      background: 'var(--card)', borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function ReviewItem({ review }) {
  const date = new Date(review.created_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
  return (
    <div style={{ display: 'flex', gap: 10, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <Avatar name={review.from_name} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{review.from_name}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{date}</span>
        </div>
        <Stars rating={review.rating} />
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.45 }}>{review.comment}</p>
        <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, display: 'block' }}>
          📍 {review.event_title}
        </span>
      </div>
    </div>
  )
}

export default function ProfileScreen() {
  const user = MOCK_USER
  const myEvents = MOCK_EVENTS.slice(0, 3)

  return (
    <div className="page">
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--accent) 0%, #8B5CF6 100%)',
        padding: '32px 20px 80px',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button style={{
            background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 10,
            color: '#fff', padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            ✏️ Редагувати
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Avatar name={`${user.first_name} ${user.last_name}`} size={80} />
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 24, height: 24, borderRadius: '50%',
              background: '#fff', border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11,
            }}>📷</div>
          </div>

          <div style={{ flex: 1, color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22, fontWeight: 800 }}>
                {user.first_name} {user.last_name}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, opacity: .85 }}>@{user.username}</span>
              {user.is_verified && (
                <span className="badge" style={{ background: 'rgba(255,255,255,.25)', color: '#fff' }}>
                  ✓ Верифікований
                </span>
              )}
              {user.is_pro && (
                <span className="badge" style={{ background: '#F59E0B', color: '#fff' }}>
                  ⭐ PRO
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

      {/* Stats row — overlaps hero */}
      <div style={{ padding: '0 16px', marginTop: -44 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatBlock value={user.events_created_count} label="Організував" />
          <StatBlock value={user.events_joined_count} label="Взяв участь" />
          <StatBlock value={`${Math.round((1 - user.no_show_count / user.events_joined_count) * 100)}%`} label="Надійність" />
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <div style={{ margin: '16px 16px 0' }} className="card">
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .06 }}>Про себе</div>
            <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{user.bio}</p>
          </div>
        </div>
      )}

      {/* Stars balance */}
      <div style={{ margin: '12px 16px 0' }} className="card">
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>⭐</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{user.stars_balance} Stars</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Ваш баланс</div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{ padding: '10px 18px', fontSize: 13 }}>Поповнити</button>
        </div>
      </div>

      {/* PRO upsell if not pro */}
      {!user.is_pro && (
        <div style={{
          margin: '12px 16px 0',
          background: 'linear-gradient(135deg, #F59E0B, #EC4899)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          color: '#fff',
        }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>✨ Спробуй PRO</div>
          <div style={{ fontSize: 13, opacity: .9, marginBottom: 12 }}>
            Бачиш, хто переглянув профіль, пріоритет на карті, необмежені мероприятия
          </div>
          <button className="btn" style={{ background: 'rgba(255,255,255,.25)', color: '#fff', padding: '10px 20px', fontSize: 13 }}>
            Активувати за Stars ⭐
          </button>
        </div>
      )}

      {/* My events */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>Мої мероприятия</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {myEvents.map(e => (
            <div key={e.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 24 }}>
                {['⚽','🚶','🎲','🍖','🎵','✈️'][e.category_id - 1] ?? '🔥'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                  {new Date(e.start_time).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span style={{ fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>
          Відгуки <span style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: 14 }}>({user.rating_count})</span>
        </div>
        <div className="card" style={{ padding: '0 14px' }}>
          {MOCK_REVIEWS.map(r => <ReviewItem key={r.id} review={r} />)}
        </div>
      </div>

      <div style={{ height: 20 }} />
    </div>
  )
}
