import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { Send, Loader2, AlertTriangle } from 'lucide-react'
import { Avatar } from '../components/EventCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiFetch, API_URL } from '../lib/api.js'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
}

export default function EventChatScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [messages, setMessages] = useState(null)
  const [status, setStatus] = useState('pending') // pending | ok | error
  const [errorMsg, setErrorMsg] = useState(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const socketRef = useRef(null)

  useEffect(() => {
    apiFetch(`/events/${id}/chat/messages`)
      .then(({ messages }) => { setMessages(messages); setStatus('ok') })
      .catch(err => { setErrorMsg(err.message); setStatus('error') })
  }, [id])

  useEffect(() => {
    if (status !== 'ok') return

    const socket = io(API_URL, { auth: { token: localStorage.getItem('lovymyt_token') } })
    socketRef.current = socket
    socket.emit('join_event', id)
    socket.on('new_message', (message) => {
      setMessages(prev => (prev ?? []).concat(message))
    })

    return () => {
      socket.emit('leave_event', id)
      socket.disconnect()
    }
  }, [status, id])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    try {
      await apiFetch(`/events/${id}/chat/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: trimmed }),
      })
    } catch (err) {
      setErrorMsg(err.message)
      setText(trimmed)
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
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, lineHeight: 1, color: 'var(--text)' }}
        >‹</button>
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
                  padding: '8px 12px',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  {!mine && (
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, color: 'var(--accent)' }}>
                      {m.sender?.first_name ?? 'Користувач'}
                    </div>
                  )}
                  <div style={{ fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word' }}>{m.text}</div>
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

      <div style={{
        display: 'flex', gap: 8, padding: '10px 16px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
        borderTop: '1px solid var(--border)', flexShrink: 0,
      }}>
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
          style={{ padding: '0 16px', opacity: text.trim() && !sending ? 1 : .5 }}
          disabled={!text.trim() || sending}
          onClick={handleSend}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
