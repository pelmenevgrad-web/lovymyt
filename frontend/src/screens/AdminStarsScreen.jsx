import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Star, Undo2 } from 'lucide-react'
import BackButton from '../components/BackButton.jsx'
import { Avatar } from '../components/EventCard.jsx'
import { apiFetch } from '../lib/api.js'

const TYPE_LABEL = {
  topup: 'Поповнення',
  pro_purchase: 'PRO підписка',
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function TxRow({ tx, onRefund }) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [error, setError] = useState(null)

  async function handleRefund() {
    setRefunding(true)
    setError(null)
    try {
      await onRefund(tx.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setRefunding(false)
      setConfirming(false)
    }
  }

  return (
    <div className="card" style={{ padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{TYPE_LABEL[tx.type] ?? tx.type}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatDate(tx.created_at)}</span>
      </div>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}
        onClick={() => navigate(`/users/${tx.user?.id}`)}
      >
        <Avatar name={tx.user?.first_name ?? '?'} url={tx.user?.avatar_url} size={26} />
        <span style={{ fontWeight: 700, fontSize: 13 }}>{tx.user?.first_name ?? 'Користувач'}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 'auto', fontWeight: 700, fontSize: 13, color: 'var(--orange)' }}>
          <Star size={13} fill="currentColor" /> {tx.amount}
        </span>
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{error}</div>}

      {tx.refunded_at ? (
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Повернуто {formatDate(tx.refunded_at)}</div>
      ) : confirming ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn" style={{ flex: 1, background: 'var(--red)', color: '#fff', fontSize: 12, padding: '8px 10px', opacity: refunding ? .6 : 1 }}
            disabled={refunding} onClick={handleRefund}
          >
            {refunding ? 'Повертаємо…' : 'Підтвердити рефанд'}
          </button>
          <button className="btn btn-ghost" style={{ flex: 1, fontSize: 12, padding: '8px 10px' }} disabled={refunding} onClick={() => setConfirming(false)}>
            Скасувати
          </button>
        </div>
      ) : (
        <button
          className="btn btn-ghost" style={{ width: '100%', fontSize: 12, padding: '8px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
          onClick={() => setConfirming(true)}
        >
          <Undo2 size={13} /> Рефанд
        </button>
      )}
    </div>
  )
}

export default function AdminStarsScreen() {
  const [transactions, setTransactions] = useState(null)

  function load() {
    apiFetch('/admin/stars-transactions')
      .then(({ transactions }) => setTransactions(transactions))
      .catch(err => console.error('[AdminStars] failed to load:', err.message))
  }

  useEffect(load, [])

  async function handleRefund(id) {
    await apiFetch(`/admin/stars-transactions/${id}/refund`, { method: 'POST' })
    load()
  }

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Stars-платежі</h1>
      </div>

      <div style={{ padding: '8px 16px 24px' }}>
        {transactions === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 size={24} className="spin" color="var(--text-3)" />
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>Поки що немає платежів</div>
        ) : (
          transactions.map(tx => (
            <TxRow key={tx.id} tx={tx} onRefund={handleRefund} />
          ))
        )}
      </div>
    </div>
  )
}
