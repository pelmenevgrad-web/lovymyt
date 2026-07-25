import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, MapPin, MessageCircle, Rocket, Pencil, Inbox, Star, Clock } from 'lucide-react'
import BackButton from '../components/BackButton.jsx'
import VenueActivateSheet from '../components/VenueActivateSheet.jsx'
import { apiFetch } from '../lib/api.js'

const STATUS_META = {
  pending: { label: 'На модерації', bg: 'var(--orange-light)', color: 'var(--orange)' },
  approved: { label: 'Підтверджена', bg: 'var(--green-light)', color: 'var(--green)' },
  rejected: { label: 'Відхилена', bg: 'var(--border)', color: 'var(--text-2)' },
}

export default function VenueDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [venue, setVenue] = useState(null)
  const [status, setStatus] = useState('pending')
  const [errorMsg, setErrorMsg] = useState(null)
  const [showActivate, setShowActivate] = useState(false)
  const [connecting, setConnecting] = useState(false)

  function load() {
    apiFetch(`/venues/${id}`)
      .then(({ venue }) => { setVenue(venue); setStatus('ok') })
      .catch(err => { setErrorMsg(err.message); setStatus('error') })
  }

  useEffect(load, [id])

  async function handleConnect() {
    if (connecting) return
    setConnecting(true)
    try {
      const { inquiry_id } = await apiFetch(`/venues/${id}/inquiries`, { method: 'POST' })
      navigate(`/venues/inquiries/${inquiry_id}`)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setConnecting(false)
    }
  }

  if (status === 'pending') {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={28} className="spin" color="var(--text-3)" />
      </div>
    )
  }

  if (status === 'error' || !venue) {
    return (
      <div className="page" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, minHeight: '60vh', paddingLeft: 32, paddingRight: 32, textAlign: 'center',
      }}>
        <AlertTriangle size={28} color="var(--text-3)" />
        <div style={{ fontWeight: 700, fontSize: 15 }}>{errorMsg || 'Локацію не знайдено'}</div>
      </div>
    )
  }

  const isActive = venue.status === 'approved' && venue.active_until && new Date(venue.active_until) > new Date()
  const meta = STATUS_META[venue.status] ?? STATUS_META.pending

  return (
    <div className="page">
      <img src={venue.photo_url} alt="" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />

      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>{venue.title}</h1>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
            <MapPin size={13} /> {venue.address_text}
          </div>
        </div>
      </div>

      {venue.is_owner && (
        <div style={{ margin: '8px 16px 0' }} className="card">
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="badge" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
              {isActive && (
                <span style={{ fontSize: 12, color: 'var(--text-2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> до {new Date(venue.active_until).toLocaleDateString('uk-UA')}
                </span>
              )}
            </div>
            {venue.status === 'rejected' && venue.reject_reason && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>Причина: {venue.reject_reason}</div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {venue.status !== 'approved' && (
                <button
                  className="btn btn-ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}
                  onClick={() => navigate(`/venues/${id}/edit`)}
                >
                  <Pencil size={14} /> Редагувати
                </button>
              )}
              {venue.status === 'approved' && (
                <button
                  className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}
                  onClick={() => setShowActivate(true)}
                >
                  <Star size={14} /> {isActive ? 'Продовжити' : 'Активувати'}
                </button>
              )}
              <button
                className="btn btn-ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}
                onClick={() => navigate(`/venues/${id}/inquiries`)}
              >
                <Inbox size={14} /> Звернення
              </button>
            </div>
          </div>
        </div>
      )}

      {venue.description && (
        <div style={{ margin: '16px 16px 0' }}>
          <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{venue.description}</p>
        </div>
      )}

      {venue.price_info && (
        <div style={{ margin: '16px 16px 0' }} className="card">
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .06 }}>
              Ціни та умови
            </div>
            <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{venue.price_info}</p>
          </div>
        </div>
      )}

      {!venue.is_owner && (
        <div style={{ padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {errorMsg && <div style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>{errorMsg}</div>}
          <button
            className="btn btn-ghost" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: connecting ? .6 : 1 }}
            disabled={connecting} onClick={handleConnect}
          >
            <MessageCircle size={16} /> {connecting ? 'Зв\'язуємось…' : 'Зв\'язатися'}
          </button>
          <button
            className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => navigate(`/create?venue_id=${id}`)}
          >
            <Rocket size={16} /> Створити захід тут
          </button>
        </div>
      )}

      {showActivate && (
        <VenueActivateSheet
          venueId={id}
          onClose={() => setShowActivate(false)}
          onPaid={async () => load()}
        />
      )}
    </div>
  )
}
