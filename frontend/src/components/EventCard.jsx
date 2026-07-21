import { BadgeCheck, Zap, Clock, MapPin } from 'lucide-react'
import { CATEGORIES, STATUS_META } from '../data/mockData.js'

function formatTime(iso) {
  const d = new Date(iso)
  const now = Date.now()
  const diff = d - now
  if (Math.abs(diff) < 60_000) return 'Зараз'
  if (diff > 0 && diff < 60 * 60_000) return `через ${Math.round(diff / 60_000)} хв`
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
}

function Avatar({ name, url, size = 36 }) {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('') ?? '?'
  const hue = name ? (name.charCodeAt(0) * 37) % 360 : 200
  return url ? (
    <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},60%,55%)`, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38,
      flexShrink: 0,
    }}>{initials}</div>
  )
}

export { Avatar }

export function AvatarStack({ people, size = 18 }) {
  if (!people || people.length === 0) return null
  return (
    <span style={{ display: 'inline-flex' }}>
      {people.map((p, i) => (
        <span
          key={p.id}
          style={{
            marginLeft: i === 0 ? 0 : -6, display: 'flex',
            border: '1.5px solid var(--card)', borderRadius: '50%',
          }}
        >
          <Avatar name={p.first_name} url={p.avatar_url} size={size} />
        </span>
      ))}
    </span>
  )
}

export default function EventCard({ event, onClick, compact = false }) {
  const cat    = CATEGORIES.find(c => c.id === event.category_id) ?? CATEGORIES[0]
  const status = STATUS_META[event.status] ?? STATUS_META.planned
  const pct    = Math.round((event.current_participants / event.max_participants) * 100)

  return (
    <div
      onClick={onClick}
      className="card"
      style={{
        padding: compact ? '12px 14px' : '16px',
        cursor: 'pointer',
        transition: 'transform .12s',
        userSelect: 'none',
      }}
      onPointerDown={e => e.currentTarget.style.transform = 'scale(.98)'}
      onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: cat.color + '22', color: cat.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <cat.Icon size={22} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span className="badge" style={{ background: status.bg, color: status.color }}>
              {event.status === 'active' && '● '}{status.label}
            </span>
            {event.status === 'active' && event.late_join_allowed && (
              <span className="badge" style={{ background: 'var(--green-light)', color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Zap size={11} /> Можна приєднатися
              </span>
            )}
            {event.conditions?.verified_only && (
              <span className="badge" style={{ background: 'var(--blue-light)', color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <BadgeCheck size={11} /> Верифік.
              </span>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.title}
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> {formatTime(event.start_time)}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={13} /> {event.address_text}</span>
      </div>

      {/* Footer row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Avatar name={event.creator_name} url={event.creator_avatar_url} size={24} />
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{event.creator_name}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AvatarStack people={event.participant_avatars} />

          {/* Participant bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 52, height: 5, borderRadius: 99, background: 'var(--border)' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: cat.color }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
              {event.current_participants}/{event.max_participants}
            </span>
          </div>

          {event.budget_type === 'free' && (
            <span className="badge" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>Безкошт.</span>
          )}
          {event.budget_type === 'shared' && (
            <span className="badge" style={{ background: 'var(--orange-light)', color: 'var(--orange)' }}>Складчина</span>
          )}
        </div>
      </div>
    </div>
  )
}
