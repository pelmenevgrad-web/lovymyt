import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import BackButton from '../components/BackButton.jsx'
import { Avatar } from '../components/EventCard.jsx'
import { apiFetch } from '../lib/api.js'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function VenueInquiriesScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [inquiries, setInquiries] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch(`/venues/${id}/inquiries`)
      .then(({ inquiries }) => setInquiries(inquiries))
      .catch(err => setError(err.message))
  }, [id])

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Звернення</h1>
      </div>

      <div style={{ padding: '8px 16px 24px' }}>
        {error ? (
          <div style={{ fontSize: 13, color: 'var(--red)', textAlign: 'center', padding: '20px 0' }}>{error}</div>
        ) : inquiries === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 size={24} className="spin" color="var(--text-3)" />
          </div>
        ) : inquiries.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>
            Поки немає звернень від організаторів
          </div>
        ) : (
          inquiries.map(inq => (
            <div
              key={inq.id}
              className="card"
              style={{ padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
              onClick={() => navigate(`/venues/inquiries/${inq.id}`)}
            >
              <Avatar name={inq.organizer?.first_name ?? '?'} url={inq.organizer?.avatar_url} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{inq.organizer?.first_name ?? 'Організатор'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatDate(inq.created_at)}</div>
              </div>
              <span style={{ fontSize: 18, color: 'var(--text-3)' }}>›</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
