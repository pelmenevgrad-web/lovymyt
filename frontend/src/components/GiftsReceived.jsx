import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Avatar } from './EventCard.jsx'
import { apiFetch } from '../lib/api.js'
import { resolveIcon } from '../lib/icons.js'

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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {[...counts.values()].map(g => {
            const Icon = resolveIcon(g.icon_name)
            return (
              <span
                key={g.id}
                title={g.name}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'var(--accent-light)', color: 'var(--accent)',
                  padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                }}
              >
                <Icon size={14} /> ×{g.count}
              </span>
            )
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {gifts.slice(0, 5).map(g => {
            const Icon = resolveIcon(g.gift?.icon_name)
            return (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-2)' }}>
                <Avatar name={g.from_user?.first_name ?? '?'} url={g.from_user?.avatar_url} size={20} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong style={{ color: 'var(--text)' }}>{g.from_user?.first_name ?? 'Хтось'}</strong> подарував(-ла) {g.gift?.name ?? 'подарунок'}
                </span>
                <Icon size={14} color="var(--accent)" />
                <span style={{ flexShrink: 0, color: 'var(--text-3)' }}>{formatDate(g.created_at)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
