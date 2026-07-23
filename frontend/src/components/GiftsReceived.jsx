import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Avatar } from './EventCard.jsx'
import GiftBadge from './GiftBadge.jsx'
import { apiFetch } from '../lib/api.js'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
}

// Shared between own profile and public profiles — shows gift icon counts
// plus a short recent-senders feed, fetched via GET /users/:id/gifts.
export default function GiftsReceived({ userId }) {
  const [gifts, setGifts] = useState(null)

  useEffect(() => {
    if (!userId) return
    apiFetch(`/users/${userId}/gifts`)
      .then(({ gifts }) => setGifts(gifts))
      .catch(() => setGifts([]))
  }, [userId])

  if (gifts === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
        <Loader2 size={18} className="spin" color="var(--text-3)" />
      </div>
    )
  }

  if (gifts.length === 0) return null

  const counts = new Map()
  for (const g of gifts) {
    if (!g.gift) continue
    const entry = counts.get(g.gift.id) ?? { ...g.gift, count: 0 }
    entry.count += 1
    counts.set(g.gift.id, entry)
  }

  return (
    <div style={{ margin: '16px 16px 0' }} className="card">
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .06 }}>
          Подарунки ({gifts.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          {[...counts.values()].map((g, i) => (
            <div key={g.id} title={g.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <GiftBadge iconName={g.icon_name} color={g.color} size={38} delay={i * 0.3} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>×{g.count}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {gifts.slice(0, 5).map(g => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-2)' }}>
              <Avatar name={g.from_user?.first_name ?? '?'} url={g.from_user?.avatar_url} size={20} />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <strong style={{ color: 'var(--text)' }}>{g.from_user?.first_name ?? 'Хтось'}</strong> подарував(-ла) {g.gift?.name ?? 'подарунок'}
              </span>
              <GiftBadge iconName={g.gift?.icon_name} color={g.gift?.color} size={22} iconSize={12} glow={false} />
              <span style={{ flexShrink: 0, color: 'var(--text-3)' }}>{formatDate(g.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
