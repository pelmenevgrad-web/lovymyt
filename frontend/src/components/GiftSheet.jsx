import { useState, useEffect } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { apiFetch } from '../lib/api.js'
import { resolveIcon } from '../lib/icons.js'
import TopupSheet from './TopupSheet.jsx'

// Bottom sheet for picking a gift to send another user, paid from the
// sender's own Stars balance (POST /users/:id/gifts). If the balance is too
// low, offers the same TopupSheet used on the profile screen before retrying.
export default function GiftSheet({ userId, myBalance, onClose, onSent, onBalanceChange }) {
  const [gifts, setGifts] = useState(null)
  const [sendingId, setSendingId] = useState(null)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const [showTopup, setShowTopup] = useState(false)

  useEffect(() => {
    apiFetch('/gifts')
      .then(({ gifts }) => setGifts(gifts))
      .catch(err => setError(err.message))
  }, [])

  async function handleSend(gift) {
    if (sendingId) return
    if (myBalance < gift.price_stars) {
      setShowTopup(true)
      return
    }
    setSendingId(gift.id)
    setError(null)
    try {
      const { stars_balance } = await apiFetch(`/users/${userId}/gifts`, {
        method: 'POST',
        body: JSON.stringify({ gift_id: gift.id }),
      })
      onBalanceChange(stars_balance)
      setSent(true)
      onSent?.()
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setSendingId(null)
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
        style={{ width: '100%', borderRadius: '20px 20px 0 0', padding: 20, maxHeight: '70vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Подарувати</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {sent ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 0' }}>
            <Check size={32} color="var(--green)" />
            <div style={{ fontWeight: 700 }}>Подарунок надіслано!</div>
          </div>
        ) : (
          <>
            {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>{error}</div>}
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>Твій баланс: {myBalance} Stars</div>
            {gifts === null ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                <Loader2 size={24} className="spin" color="var(--text-3)" />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {gifts.map(gift => {
                  const Icon = resolveIcon(gift.icon_name)
                  const canAfford = myBalance >= gift.price_stars
                  return (
                    <button
                      key={gift.id}
                      className="card"
                      style={{
                        padding: 12, border: '1.5px solid var(--border)', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        opacity: sendingId && sendingId !== gift.id ? .5 : 1,
                      }}
                      disabled={!!sendingId}
                      onClick={() => handleSend(gift)}
                    >
                      {sendingId === gift.id ? (
                        <Loader2 size={22} className="spin" color="var(--accent)" />
                      ) : (
                        <Icon size={22} color={canAfford ? 'var(--accent)' : 'var(--text-3)'} />
                      )}
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{gift.name}</span>
                      <span style={{ fontSize: 11, color: canAfford ? 'var(--text-2)' : 'var(--red)' }}>{gift.price_stars} Stars</span>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {showTopup && (
        <TopupSheet
          onClose={() => setShowTopup(false)}
          onPaid={async () => {
            const { user } = await apiFetch('/users/me')
            onBalanceChange(user.stars_balance)
          }}
        />
      )}
    </div>
  )
}
