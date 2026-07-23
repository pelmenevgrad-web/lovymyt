import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { Send, Loader2, AlertTriangle, Camera, X } from 'lucide-react'
import { Avatar } from '../components/EventCard.jsx'
import BackButton from '../components/BackButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiFetch, API_URL } from '../lib/api.js'
import { compressImage } from '../lib/image.js'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
}

export default function EventChatScreen() {
  const { id } = useParams()
  const { user } = useAuth()
  const [messages, setMessages] = useState(null)
  const [status, setStatus] = useState('pending') // pending | ok | error
  const [errorMsg, setErrorMsg] = useState(null)
  const [text, setText] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const socketRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    apiFetch(`/events/${id}/chat/messages`)
      .then(({ messages }) => { setMessages(messages); setStatus('ok') })
      .catch(err => { setErrorMsg(err.message); setStatus('error') })
    apiFetch(`/events/${id}/chat/read`, { method: 'POST' })
      .catch(err => console.error('[Chat] failed to mark read:', err.message))
  }, [id])

  useEffect(() => {
    if (status !== 'ok') return

    const socket = io(API_URL, { auth: { token: localStorage.getItem('lovymyt_token') } })
    socketRef.current = socket
    socket.emit('join_event', id)
    socket.on('new_message', (message) => {
      setMessages(prev => (prev ?? []).concat(message))
      // Chat stays open, so any message arriving while we're here counts as read.
      apiFetch(`/events/${id}/chat/read`, { method: 'POST' }).catch(() => {})
    })

    return () => {
      socket.emit('leave_event', id)
      socket.disconnect()
    }
  }, [status, id])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

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
    const payloadText = trimmed
    const payloadImage = imagePreview
    setText('')
    setImagePreview(null)
    try {
      await apiFetch(`/events/${id}/chat/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: payloadText || null, image: payloadImage || undefined }),
      })
    } catch (err) {
      setErrorMsg(err.message)
      setText(payloadText)
      setImagePreview(payloadImage)
    } finally {
      setSending(false)
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
        gap: 10, minHeight: '60vh', padding: '0 32px', textAlign: 'center',
      }}>
        <AlertTriangle size={28} color="var(--text-3)" />
        <div style={{ fontWeight: 700, fontSize: 15 }}>{errorMsg || 'Не вдалося відкрити чат'}</div>
      </div>
    )
  }

  return (
    <div className="page-full" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <BackButton />
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Чат заходу</h1>
      </div>

      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, marginTop: 40 }}>
            Поки що немає повідомлень — напиши перше!
          </div>
        )}
        {messages.map(m => {
          const mine = m.sender?.id === user?.id
          return (
            <div key={m.id} style={{ display: 'flex', gap: 8, marginBottom: 12, flexDirection: mine ? 'row-reverse' : 'row' }}>
              <Avatar name={m.sender?.first_name ?? '?'} url={m.sender?.avatar_url} size={30} />
              <div style={{ maxWidth: '72%' }}>
                <div style={{
                  background: mine ? 'var(--accent)' : 'var(--card)',
                  color: mine ? '#fff' : 'var(--text)',
                  borderRadius: 'var(--radius-md)',
                  padding: m.image_url ? 6 : '8px 12px',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  {!mine && (
                    <div style={{ fontSize: 11, fontWeight: 700, margin: m.image_url ? '2px 4px 4px' : '0 0 2px', color: mine ? '#fff' : 'var(--accent)' }}>
                      {m.sender?.first_name ?? 'Користувач'}
                    </div>
                  )}
                  {m.image_url && (
                    <img
                      src={m.image_url}
                      alt=""
                      style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 'var(--radius-sm)', display: 'block' }}
                    />
                  )}
                  {m.text && (
                    <div style={{ fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word', padding: m.image_url ? '6px 4px 2px' : 0 }}>
                      {m.text}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 10, color: 'var(--text-3)', marginTop: 2,
                  textAlign: mine ? 'right' : 'left',
                }}>
                  {formatTime(m.created_at)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ padding: '0 16px', flexShrink: 0 }}>
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

      <div style={{
        display: 'flex', gap: 8, padding: '10px 16px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
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
          placeholder="Написати повідомлення…"
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
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
