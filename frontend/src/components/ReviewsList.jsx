import { useState, useEffect } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { Avatar } from './EventCard.jsx'
import { apiFetch } from '../lib/api.js'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Stars({ rating }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={12} fill={i <= rating ? 'var(--orange)' : 'none'} color={i <= rating ? 'var(--orange)' : 'var(--border)'} />
      ))}
    </span>
  )
}

// Shared between own profile and public profiles — fetches and renders
// everything someone has received: star reviews, comments, funny-status badges.
export default function ReviewsList({ userId }) {
  const [reviews, setReviews] = useState(null)

  useEffect(() => {
    if (!userId) return
    apiFetch(`/users/${userId}/reviews`)
      .then(({ reviews }) => setReviews(reviews))
      .catch(() => setReviews([]))
  }, [userId])

  if (reviews === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
        <Loader2 size={18} className="spin" color="var(--text-3)" />
      </div>
    )
  }

  const badgeCounts = {}
  for (const r of reviews) {
    if (r.funny_status) badgeCounts[r.funny_status] = (badgeCounts[r.funny_status] ?? 0) + 1
  }

  return (
    <>
      {Object.keys(badgeCounts).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {Object.entries(badgeCounts).map(([label, count]) => (
            <span key={label} className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
              {label} ×{count}
            </span>
          ))}
        </div>
      )}

      {reviews.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Поки що немає відгуків.</div>
      ) : (
        reviews.map(r => (
          <div key={r.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Avatar name={r.from_user?.first_name ?? '?'} url={r.from_user?.avatar_url} size={24} />
              <span style={{ fontWeight: 700, fontSize: 13 }}>{r.from_user?.first_name ?? 'Користувач'}</span>
              <Stars rating={r.rating} />
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto', flexShrink: 0 }}>{formatDate(r.created_at)}</span>
            </div>
            {r.event?.title && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: r.comment ? 4 : 0 }}>{r.event.title}</div>
            )}
            {r.comment && <p style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--text)' }}>{r.comment}</p>}
          </div>
        ))
      )}
    </>
  )
}
