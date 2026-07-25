import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Check, X, MapPin } from 'lucide-react'
import BackButton from '../components/BackButton.jsx'
import { Avatar } from '../components/EventCard.jsx'
import { apiFetch } from '../lib/api.js'

const STATUS_TABS = [
  { value: 'pending', label: 'Нові' },
  { value: 'approved', label: 'Підтверджені' },
  { value: 'rejected', label: 'Відхилені' },
]

const STATUS_META = {
  pending: { label: 'Нова', bg: 'var(--orange-light)', color: 'var(--orange)' },
  approved: { label: 'Підтверджена', bg: 'var(--green-light)', color: 'var(--green)' },
  rejected: { label: 'Відхилена', bg: 'var(--border)', color: 'var(--text-2)' },
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function VenueRow({ venue, onApprove, onReject }) {
  const navigate = useNavigate()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const statusMeta = STATUS_META[venue.status] ?? STATUS_META.pending

  async function submitReject() {
    if (!reason.trim() || saving) return
    setSaving(true)
    await onReject(venue.id, reason.trim())
    setSaving(false)
    setRejecting(false)
  }

  async function handleApprove() {
    setSaving(true)
    await onApprove(venue.id)
    setSaving(false)
  }

  return (
    <div className="card" style={{ padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="badge" style={{ background: statusMeta.bg, color: statusMeta.color }}>{statusMeta.label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatDate(venue.created_at)}</span>
      </div>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}
        onClick={() => navigate(`/users/${venue.owner?.id}`)}
      >
        <Avatar name={venue.owner?.first_name ?? '?'} url={venue.owner?.avatar_url} size={28} />
        <span style={{ fontWeight: 700, fontSize: 14 }}>{venue.owner?.first_name ?? 'Користувач'}</span>
      </div>

      <img
        src={venue.photo_url} alt=""
        style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 'var(--radius-sm)', display: 'block', marginBottom: 8 }}
      />
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{venue.title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
        <MapPin size={12} /> {venue.address_text}
      </div>
      {venue.description && <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>{venue.description}</p>}
      {venue.price_info && <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10, whiteSpace: 'pre-wrap' }}>{venue.price_info}</p>}
      {venue.status === 'rejected' && venue.reject_reason && (
        <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>Причина: {venue.reject_reason}</div>
      )}

      {venue.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn" style={{ flex: 1, background: 'var(--green)', color: '#fff', fontSize: 12, padding: '8px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: saving ? .6 : 1 }}
            disabled={saving} onClick={handleApprove}
          >
            <Check size={13} /> Підтвердити
          </button>
          <button
            className="btn btn-ghost" style={{ flex: 1, fontSize: 12, padding: '8px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            disabled={saving} onClick={() => setRejecting(r => !r)}
          >
            <X size={13} /> Відхилити
          </button>
        </div>
      )}

      {rejecting && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <input
            autoFocus placeholder="Причина відхилення" value={reason}
            onChange={e => setReason(e.target.value)} style={{ flex: 1 }}
          />
          <button
            className="btn" style={{ background: 'var(--red)', color: '#fff', padding: '8px 14px', fontSize: 13, opacity: saving ? .6 : 1 }}
            disabled={saving || !reason.trim()} onClick={submitReject}
          >
            OK
          </button>
        </div>
      )}
    </div>
  )
}

export default function AdminVenuesScreen() {
  const [tab, setTab] = useState('pending')
  const [venues, setVenues] = useState(null)

  function load(status) {
    setVenues(null)
    apiFetch(`/admin/venues?status=${status}`)
      .then(({ venues }) => setVenues(venues))
      .catch(err => console.error('[AdminVenues] failed to load:', err.message))
  }

  useEffect(() => load(tab), [tab])

  async function handleApprove(id) {
    try {
      await apiFetch(`/admin/venues/${id}/approve`, { method: 'POST' })
      load(tab)
    } catch (err) {
      console.error('[AdminVenues] approve failed:', err.message)
    }
  }

  async function handleReject(id, reason) {
    try {
      await apiFetch(`/admin/venues/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) })
      load(tab)
    } catch (err) {
      console.error('[AdminVenues] reject failed:', err.message)
    }
  }

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Локації</h1>
      </div>

      <div style={{ padding: '8px 16px 0', display: 'flex', gap: 8 }}>
        {STATUS_TABS.map(t => (
          <button
            key={t.value}
            className="chip"
            onClick={() => setTab(t.value)}
            style={{
              background: tab === t.value ? 'var(--accent)' : 'var(--card)',
              color: tab === t.value ? '#fff' : 'var(--text)',
              border: tab === t.value ? 'none' : '1.5px solid var(--border)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 16px 24px' }}>
        {venues === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 size={24} className="spin" color="var(--text-3)" />
          </div>
        ) : venues.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>Немає локацій</div>
        ) : (
          venues.map(v => (
            <VenueRow key={v.id} venue={v} onApprove={handleApprove} onReject={handleReject} />
          ))
        )}
      </div>
    </div>
  )
}
