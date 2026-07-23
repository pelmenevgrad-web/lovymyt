import { useState } from 'react'
import { Star, Loader2, X } from 'lucide-react'
import { apiFetch } from '../lib/api.js'
import { STARS_TOPUP_PACKAGES, payInvoice } from '../lib/payments.js'

// Bottom sheet for buying Stars packages — used both from the own profile's
// "Поповнити" button and from the gift picker when the balance is too low.
export default function TopupSheet({ onClose, onPaid }) {
  const [payingPackage, setPayingPackage] = useState(null)
  const [error, setError] = useState(null)

  async function handlePick(amount) {
    if (payingPackage) return
    setPayingPackage(amount)
    setError(null)
    try {
      const { invoice_link } = await apiFetch('/stars/topup', {
        method: 'POST',
        body: JSON.stringify({ package: amount }),
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
      setPayingPackage(null)
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
          <div style={{ fontWeight: 800, fontSize: 17 }}>Поповнити баланс</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STARS_TOPUP_PACKAGES.map(amount => (
            <button
              key={amount}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: payingPackage && payingPackage !== amount ? .5 : 1 }}
              disabled={!!payingPackage}
              onClick={() => handlePick(amount)}
            >
              {payingPackage === amount ? <Loader2 size={16} className="spin" /> : <Star size={16} fill="currentColor" />}
              {amount} Stars
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
