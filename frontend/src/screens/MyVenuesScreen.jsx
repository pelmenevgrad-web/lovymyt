import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Plus, MapPin } from 'lucide-react'
import BackButton from '../components/BackButton.jsx'
import { apiFetch } from '../lib/api.js'

const STATUS_META = {
  pending: { label: 'На модерації', bg: 'var(--orange-light)', color: 'var(--orange)' },
  approved: { label: 'Підтверджена', bg: 'var(--green-light)', color: 'var(--green)' },
  rejected: { label: 'Відхилена', bg: 'var(--border)', color: 'var(--text-2)' },
}

function isActive(venue) {
  return venue.status === 'approved' && venue.active_until && new Date(venue.active_until) > new Date()
}

export default function MyVenuesScreen() {
  const navigate = useNavigate()
  const [venues, setVenues] = useState(null)

  useEffect(() => {
    apiFetch('/venues/mine')
      .then(({ venues }) => setVenues(venues))
      .catch(err => console.error('[MyVenues] failed to load:', err.message))
  }, [])

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Мої локації</h1>
      </div>

      <div style={{ padding: '8px 16px 24px' }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={() => navigate('/venues/new')}
        >
          <Plus size={16} /> Додати локацію
        </button>

        {venues === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 size={24} className="spin" color="var(--text-3)" />
          </div>
        ) : venues.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>
            Поки немає локацій — додай свою першу, щоб рекламувати її організаторам заходів поруч.
          </div>
        ) : (
          venues.map(v => {
            const meta = STATUS_META[v.status] ?? STATUS_META.pending
            return (
              <div
                key={v.id}
                className="card"
                style={{ padding: 12, marginBottom: 8, display: 'flex', gap: 10, cursor: 'pointer' }}
                onClick={() => navigate(`/venues/${v.id}`)}
              >
                <img src={v.photo_url} alt="" style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} /> {v.address_text}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="badge" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                    {isActive(v) && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        до {new Date(v.active_until).toLocaleDateString('uk-UA')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
