import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Camera, X, Loader2, AlertTriangle, EyeOff } from 'lucide-react'
import { Avatar } from '../components/EventCard.jsx'
import BackButton from '../components/BackButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiFetch } from '../lib/api.js'
import { compressImage } from '../lib/image.js'

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('uk-UA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

export default function EventReportScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [reports, setReports] = useState(null)
  const [status, setStatus] = useState('pending') // pending | ok | error
  const [errorMsg, setErrorMsg] = useState(null)
  const [text, setText] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    Promise.all([
      apiFetch(`/events/${id}`),
      apiFetch(`/events/${id}/reports`),
    ])
      .then(([{ event }, { reports }]) => { setEvent(event); setReports(reports); setStatus('ok') })
      .catch(err => { setErrorMsg(err.message); setStatus('error') })
  }, [id])

  async function handlePickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setImagePreview(await compressImage(file))
    } catch {
      setErrorMsg('Не вдалося обробити фото')
    }
  }

  async function handleSend() {
    const trimmed = text.trim()
    if ((!trimmed && !imagePreview) || sending) return
    setSending(true)
    setErrorMsg(null)
    try {
      const { report } = await apiFetch(`/events/${id}/reports`, {
        method: 'POST',
        body: JSON.stringify({ text: trimmed || null, image: imagePreview || undefined }),
      })
      setReports(prev => (prev ?? []).concat(report))
      setText('')
      setImagePreview(null)
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setSending(false)
    }
  }

  async function handleHide(reportId) {
    try {
      await apiFetch(`/events/${id}/reports/${reportId}/hide`, { method: 'POST' })
      setReports(prev => prev.filter(r => r.id !== reportId))
    } catch (err) {
      setErrorMsg(err.message)
    }
  }

  if (status === 'pending') {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={28} className="spin" color="var(--text-3)" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="page" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, minHeight: '60vh', paddingLeft: 32, paddingRight: 32, textAlign: 'center',
      }}>
        <AlertTriangle size={28} color="var(--text-3)" />
        <div style={{ fontWeight: 700, fontSize: 15 }}>{errorMsg || 'Не вдалося відкрити звіт'}</div>
      </div>
    )
  }

  const canPost = event.is_creator || event.my_status === 'accepted'

  return (
    <div className="page-full" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <BackButton />
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800 }}>Звіт заходу</h1>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{event.title}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        {reports.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, marginTop: 40 }}>
            Поки що немає записів — поділись враженнями першим!
          </div>
        )}
        {reports.map(r => (
          <div key={r.id} className="card" style={{ padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Avatar name={r.author?.first_name ?? '?'} url={r.author?.avatar_url} size={26} />
              <div
                style={{ flex: 1, fontSize: 13, fontWeight: 700, cursor: r.author?.id ? 'pointer' : 'default' }}
                onClick={() => r.author?.id && navigate(`/users/${r.author.id}`)}
              >
                {r.author?.first_name ?? 'Користувач'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatDateTime(r.created_at)}</div>
              {event.is_creator && (
                <button
                  onClick={() => handleHide(r.id)}
                  title="Приховати"
                  style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 4 }}
                >
                  <EyeOff size={14} />
                </button>
              )}
            </div>
            {r.image_url && (
              <img
                src={r.image_url} alt=""
                style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 'var(--radius-sm)', display: 'block', marginBottom: r.text ? 8 : 0 }}
              />
            )}
            {r.text && <p style={{ fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word' }}>{r.text}</p>}
          </div>
        ))}
      </div>

      {canPost && (
        <div style={{ padding: '0 16px', flexShrink: 0 }}>
          {errorMsg && (
            <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 6, textAlign: 'center' }}>{errorMsg}</div>
          )}
          {imagePreview && (
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
              <img src={imagePreview} alt="" style={{ height: 64, borderRadius: 'var(--radius-sm)', display: 'block' }} />
              <button
                onClick={() => setImagePreview(null)}
                style={{
                  position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--red)', color: '#fff', border: '2px solid var(--card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {canPost && (
        <div style={{
          display: 'flex', gap: 8, padding: '10px 16px',
          paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 10px)',
          borderTop: '1px solid var(--border)', flexShrink: 0,
        }}>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePickFile} />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <Camera size={18} />
          </button>
          <input
            type="text"
            placeholder="Поділись враженнями…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            style={{ padding: '0 16px', opacity: (text.trim() || imagePreview) && !sending ? 1 : .5 }}
            disabled={(!text.trim() && !imagePreview) || sending}
            onClick={handleSend}
          >
            {sending ? <Loader2 size={18} className="spin" /> : 'OK'}
          </button>
        </div>
      )}
    </div>
  )
}
