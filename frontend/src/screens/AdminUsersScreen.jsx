import { useState, useEffect } from 'react'
import { Loader2, ShieldBan, ShieldCheck } from 'lucide-react'
import BackButton from '../components/BackButton.jsx'
import { Avatar } from '../components/EventCard.jsx'
import { apiFetch } from '../lib/api.js'

function UserRow({ user, onBan, onUnban }) {
  const [banning, setBanning] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function submitBan() {
    if (!reason.trim() || saving) return
    setSaving(true)
    await onBan(user.id, reason.trim())
    setSaving(false)
    setBanning(false)
  }

  return (
    <div className="card" style={{ padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name={user.first_name ?? '?'} url={user.avatar_url} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.first_name ?? 'Користувач'}
            </span>
            {user.is_admin && <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>Адмін</span>}
            {user.is_banned && <span className="badge" style={{ background: 'var(--red-light)', color: 'var(--red)' }}>Забанений</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {user.username ? `@${user.username}` : `id ${user.telegram_id}`}
          </div>
          {user.is_banned && user.ban_reason && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 2 }}>Причина: {user.ban_reason}</div>
          )}
        </div>
        {!user.is_admin && (
          user.is_banned ? (
            <button
              onClick={() => onUnban(user.id)}
              style={{ background: 'var(--green-light)', color: 'var(--green)', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
            >
              <ShieldCheck size={13} /> Розбанити
            </button>
          ) : (
            <button
              onClick={() => setBanning(b => !b)}
              style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
            >
              <ShieldBan size={13} /> Забанити
            </button>
          )
        )}
      </div>
      {banning && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <input
            autoFocus placeholder="Причина бану" value={reason}
            onChange={e => setReason(e.target.value)} style={{ flex: 1 }}
          />
          <button
            className="btn" style={{ background: 'var(--red)', color: '#fff', padding: '8px 14px', fontSize: 13, opacity: saving ? .6 : 1 }}
            disabled={saving || !reason.trim()} onClick={submitBan}
          >
            OK
          </button>
        </div>
      )}
    </div>
  )
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState(null)

  function load() {
    apiFetch('/admin/users')
      .then(({ users }) => setUsers(users))
      .catch(err => console.error('[AdminUsers] failed to load:', err.message))
  }

  useEffect(load, [])

  async function handleBan(id, reason) {
    try {
      await apiFetch(`/admin/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ reason }) })
      load()
    } catch (err) {
      console.error('[AdminUsers] ban failed:', err.message)
    }
  }

  async function handleUnban(id) {
    try {
      await apiFetch(`/admin/users/${id}/unban`, { method: 'POST' })
      load()
    } catch (err) {
      console.error('[AdminUsers] unban failed:', err.message)
    }
  }

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Користувачі</h1>
      </div>

      <div style={{ padding: '8px 16px 24px' }}>
        {users === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 size={24} className="spin" color="var(--text-3)" />
          </div>
        ) : (
          users.map(u => (
            <UserRow key={u.id} user={u} onBan={handleBan} onUnban={handleUnban} />
          ))
        )}
      </div>
    </div>
  )
}
