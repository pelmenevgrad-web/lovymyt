import { useState } from 'react'
import { Star, Loader2, X, MapPin, Clock } from 'lucide-react'
import { apiFetch } from '../lib/api.js'
import { VENUE_TIERS, payInvoice } from '../lib/payments.js'

// Bottom sheet for picking a tier and paying to activate/extend a venue ad.
export default function VenueActivateSheet({ venueId, onClose, onPaid }) {
  const [payingTier, setPayingTier] = useState(null)
  const [error, setError] = useState(null)
  const [autoRenew, setAutoRenew] = useState(false)

  async function handlePick(tier) {
    if (payingTier) return
    setPayingTier(tier)
    setError(null)
    try {
      const { invoice_link } = await apiFetch(`/venues/${venueId}/activate`, {
        method: 'POST',
        body: JSON.stringify({ tier, auto_renew: autoRenew }),
      })
      const status = await payInvoice(invoice_link)
      if (status === 'paid') {
        await onPaid()
        onClose()
      } else if (status === 'failed') {
        setError('Оплата не пройшла')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setPayingTier(null)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', borderRadius: '20px 20px 0 0', padding: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Активувати рекламу</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>{error}</div>}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 12px',
          background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        }}>
          <input type="checkbox" checked={autoRenew} onChange={e => setAutoRenew(e.target.checked)} style={{ width: 18, height: 18 }} />
          <span style={{ fontSize: 13 }}>
            Автопродовження — списувати з балансу Stars автоматично, коли строк вийде
          </span>
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.entries(VENUE_TIERS).map(([key, tier]) => (
            <button
              key={key}
              className="btn btn-primary"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
                opacity: payingTier && payingTier !== key ? .5 : 1, padding: '12px 16px',
              }}
              disabled={!!payingTier}
              onClick={() => handlePick(key)}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontWeight: 800 }}>{tier.label}</span>
                <span style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: .85 }}>
                  <MapPin size={12} /> {tier.radius_km} км
                  <Clock size={12} /> {tier.days} днів
                </span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                {payingTier === key ? <Loader2 size={16} className="spin" /> : <Star size={16} fill="currentColor" />}
                {tier.price}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
