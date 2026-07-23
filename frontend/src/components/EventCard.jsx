import { BadgeCheck, Zap, Clock, MapPin, Star } from 'lucide-react'
import { STATUS_META } from '../data/mockData.js'
import { useCategories } from '../context/CategoriesContext.jsx'
import { formatCountdown } from '../lib/format.js'

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

// Small colored pill per category (icon on a lighter inset circle, like the
// map pin's icon-on-color treatment) — used wherever an event's full
// category set needs to be shown, not just its primary one.
export function CategoryBadges({ ids, categories }) {
  if (!ids || ids.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {ids.map(id => {
        const cat = categories.find(c => c.id === id)
        if (!cat) return null
        return (
          <span
            key={id}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: cat.color, color: '#fff',
              padding: '2px 8px 2px 2px', borderRadius: 999,
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}
          >
            <span style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <cat.Icon size={10} />
            </span>
            {cat.name}
          </span>
        )
      })}
    </div>
  )
}

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
  const { categories } = useCategories()
  const cat    = categories.find(c => c.id === event.category_id) ?? categories[0]
  const status = STATUS_META[event.status] ?? STATUS_META.planned
  const pct    = Math.round((event.current_participants / event.max_participants) * 100)
  const categoryIds = event.category_ids ?? [event.category_id]

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
          <div style={{ marginTop: 4 }}>
            <CategoryBadges ids={categoryIds} categories={categories} />
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> {formatCountdown(event.start_time)}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={13} /> {event.address_text}</span>
      </div>

      {/* Footer row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Avatar name={event.creator_name} url={event.creator_avatar_url} size={24} />
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{event.creator_name}</span>
          {event.creator_is_pro && <Star size={12} fill="#F59E0B" color="#F59E0B" />}
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
