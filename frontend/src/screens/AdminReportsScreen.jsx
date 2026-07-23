import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Check, X, ShieldBan } from 'lucide-react'
import BackButton from '../components/BackButton.jsx'
import { Avatar } from '../components/EventCard.jsx'
import { apiFetch } from '../lib/api.js'

const STATUS_TABS = [
  { value: 'pending', label: 'Нові' },
  { value: 'reviewed', label: 'Розглянуті' },
  { value: 'dismissed', label: 'Відхилені' },
]

const STATUS_META = {
  pending: { label: 'Нова', bg: 'var(--orange-light)', color: 'var(--orange)' },
  reviewed: { label: 'Розглянута', bg: 'var(--green-light)', color: 'var(--green)' },
  dismissed: { label: 'Відхилена', bg: 'var(--border)', color: 'var(--text-2)' },
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function ReportRow({ report, onSetStatus, onBan }) {
  const navigate = useNavigate()
  const [banning, setBanning] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const statusMeta = STATUS_META[report.status] ?? STATUS_META.pending

  async function submitBan() {
    if (!reason.trim() || saving) return
    setSaving(true)
    await onBan(report.target_user.id, reason.trim())
    setSaving(false)
    setBanning(false)
  }

  return (
    <div className="card" style={{ padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="badge" style={{ background: statusMeta.bg, color: statusMeta.color }}>{statusMeta.label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatDate(report.created_at)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          onClick={() => navigate(`/users/${report.from_user?.id}`)}
        >
          <Avatar name={report.from_user?.first_name ?? '?'} url={report.from_user?.avatar_url} size={22} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{report.from_user?.first_name ?? 'Хтось'}</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>→</span>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          onClick={() => navigate(`/users/${report.target_user?.id}`)}
        >
          <Avatar name={report.target_user?.first_name ?? '?'} url={report.target_user?.avatar_url} size={22} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>{report.target_user?.first_name ?? 'Користувач'}</span>
          {report.target_user?.is_banned && (
            <span className="badge" style={{ background: 'var(--red-light)', color: 'var(--red)' }}>Забанений</span>
          )}
        </div>
      </div>

      {report.event?.title && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>Захід: {report.event.title}</div>
      )}

      <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 10 }}>{report.reason}</p>

      {report.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost" style={{ flex: 1, fontSize: 12, padding: '8px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            onClick={() => onSetStatus(report.id, 'reviewed')}
          >
            <Check size={13} /> Розглянуто
          </button>
          <button
            className="btn btn-ghost" style={{ flex: 1, fontSize: 12, padding: '8px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            onClick={() => onSetStatus(report.id, 'dismissed')}
          >
            <X size={13} /> Відхилити
          </button>
          {!report.target_user?.is_banned && (
            <button
              onClick={() => setBanning(b => !b)}
              style={{ background: 'var(--red-light)', color: 'var(--red)', border: 'none', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
            >
              <ShieldBan size={13} /> Забанити
            </button>
          )}
        </div>
      )}

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

export default function AdminReportsScreen() {
  const [tab, setTab] = useState('pending')
  const [reports, setReports] = useState(null)

  function load(status) {
    setReports(null)
    apiFetch(`/admin/reports?status=${status}`)
      .then(({ reports }) => setReports(reports))
      .catch(err => console.error('[AdminReports] failed to load:', err.message))
  }

  useEffect(() => load(tab), [tab])

  async function handleSetStatus(id, status) {
    try {
      await apiFetch(`/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      load(tab)
    } catch (err) {
      console.error('[AdminReports] status update failed:', err.message)
    }
  }

  async function handleBan(userId, reason) {
    try {
      await apiFetch(`/admin/users/${userId}/ban`, { method: 'POST', body: JSON.stringify({ reason }) })
      load(tab)
    } catch (err) {
      console.error('[AdminReports] ban failed:', err.message)
    }
  }

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Скарги</h1>
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
        {reports === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 size={24} className="spin" color="var(--text-3)" />
          </div>
        ) : reports.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>Немає скарг</div>
        ) : (
          reports.map(r => (
            <ReportRow key={r.id} report={r} onSetStatus={handleSetStatus} onBan={handleBan} />
          ))
        )}
      </div>
    </div>
  )
}
