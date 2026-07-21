import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Sparkles, BadgeCheck, Pencil, Loader2, AlertTriangle, Smartphone, Share2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { Avatar } from '../components/EventCard.jsx'
import { appLink, shareViaTelegram } from '../lib/telegram.js'
import { apiFetch } from '../lib/api.js'
import { CATEGORIES } from '../data/mockData.js'

function shareApp() {
  shareViaTelegram(
    appLink(),
    'Приєднуйся до ЛовиМить — знаходь компанію для спільного дозвілля поруч! 🎉',
  )
}

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

function CenteredMessage({ icon: Icon, title, text }) {
  return (
    <div className="page" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 10, minHeight: '60vh', padding: '0 32px', textAlign: 'center',
    }}>
      <Icon size={28} color="var(--text-3)" />
      <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
      {text && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{text}</div>}
    </div>
  )
}

export default function ProfileScreen() {
  const navigate = useNavigate()
  const { user, status, error } = useAuth()
  const [myEvents, setMyEvents] = useState(null)

  useEffect(() => {
    if (status !== 'ok') return
    apiFetch('/users/me/events')
      .then(({ events }) => setMyEvents(events))
      .catch(err => console.error('[Profile] failed to load my events:', err.message))
  }, [status])

  if (status === 'pending') {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={28} className="spin" color="var(--text-3)" />
      </div>
    )
  }

  if (status === 'guest') {
    return (
      <CenteredMessage
        icon={Smartphone}
        title="Відкрий у Telegram"
        text="Профіль показує дані твого Telegram-акаунту — доступно тільки всередині застосунку."
      />
    )
  }

  if (status === 'error' || !user) {
    return (
      <CenteredMessage
        icon={AlertTriangle}
        title="Не вдалося завантажити профіль"
        text={error ? `Помилка: ${error}` : 'Спробуй закрити і знову відкрити застосунок.'}
      />
    )
  }

  const reliability = user.events_joined_count > 0
    ? `${Math.round((1 - user.no_show_count / user.events_joined_count) * 100)}%`
    : '—'

  return (
    <div className="page">
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--accent-dark) 0%, #7C3AED 100%)',
        padding: '20px 20px 18px',
        borderRadius: '0 0 28px 28px',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <button
            onClick={() => navigate('/profile/edit')}
            style={{
              background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 10,
              color: '#fff', padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}
          >
            <Pencil size={13} /> Редагувати
          </button>
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
              {user.username && <span style={{ fontSize: 12, opacity: .85 }}>@{user.username}</span>}
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
          <StatBlock value={reliability} label="Надійність" />
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

      {/* Share app */}
      <div style={{ margin: '12px 16px 0' }}>
        <button
          className="btn btn-ghost"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={shareApp}
        >
          <Share2 size={16} /> Поділитися застосунком
        </button>
      </div>

      {/* Stars balance */}
      <div style={{ margin: '12px 16px 0' }} className="card">
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Star size={28} fill="var(--orange)" color="var(--orange)" />
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
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={18} /> Спробуй PRO
          </div>
          <div style={{ fontSize: 13, opacity: .9, marginBottom: 12 }}>
            Бачиш, хто переглянув профіль, пріоритет на карті, необмежені заходи
          </div>
          <button className="btn" style={{ background: 'rgba(255,255,255,.25)', color: '#fff', padding: '10px 20px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Активувати за Stars <Star size={14} fill="currentColor" />
          </button>
        </div>
      )}

      {/* My events */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>Мої заходи</div>
        {myEvents === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <Loader2 size={20} className="spin" color="var(--text-3)" />
          </div>
        ) : myEvents.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Поки що немає — створи перший захід через кнопку «Створити».
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myEvents.map(e => {
              const cat = CATEGORIES.find(c => c.id === e.category_id)
              const CatIcon = cat?.Icon
              return (
                <div
                  key={e.id}
                  className="card"
                  onClick={() => navigate(`/events/${e.id}`)}
                  style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <div style={{ color: cat?.color, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {CatIcon && <CatIcon size={22} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                      {e.is_creator && (
                        <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)', flexShrink: 0 }}>Організатор</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                      {new Date(e.start_time).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: 'var(--text-3)' }}>›</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>
          Відгуки <span style={{ color: 'var(--text-3)', fontWeight: 500, fontSize: 14 }}>({user.rating_count})</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
          Поки що немає відгуків.
        </div>
      </div>

      <div style={{ height: 20 }} />
    </div>
  )
}
