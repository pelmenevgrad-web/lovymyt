import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { CATEGORIES } from '../data/mockData.js'
import { apiFetch } from '../lib/api.js'

function formatChatTime(iso) {
  const d = new Date(iso)
  const now = new Date()
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
}

function ChatItem({ chat, onClick }) {
  const cat = CATEGORIES.find(c => c.id === chat.category_id)
  const CatIcon = cat?.Icon

  return (
    <div
      onClick={onClick}
      className="card"
      style={{
        padding: '12px 14px', cursor: 'pointer', userSelect: 'none',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'transform .12s',
      }}
      onPointerDown={e => e.currentTarget.style.transform = 'scale(.98)'}
      onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
      onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: (cat?.color ?? '#94A3B8') + '22', color: cat?.color ?? '#94A3B8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {CatIcon && <CatIcon size={20} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {chat.title}
          </span>
          {chat.lastMessage && (
            <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{formatChatTime(chat.lastMessage.created_at)}</span>
          )}
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-2)', marginTop: 3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {chat.lastMessage
            ? `${chat.lastMessage.sender?.first_name ?? 'Хтось'}: ${chat.lastMessage.text}`
            : 'Немає повідомлень — напиши перше!'}
        </div>
      </div>
    </div>
  )
}

export default function ChatsScreen() {
  const navigate = useNavigate()
  const [chats, setChats] = useState(null)

  useEffect(() => {
    apiFetch('/users/me/events')
      .then(async ({ events }) => {
        const withLastMessage = await Promise.all(events.map(async (e) => {
          try {
            const { messages } = await apiFetch(`/events/${e.id}/chat/messages`)
            return { ...e, lastMessage: messages[messages.length - 1] ?? null }
          } catch {
            return { ...e, lastMessage: null }
          }
        }))
        setChats(withLastMessage)
      })
      .catch(err => console.error('[Chats] failed to load:', err.message))
  }, [])

  if (chats === null) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={28} className="spin" color="var(--text-3)" />
      </div>
    )
  }

  return (
    <div className="page" style={{ padding: '20px 16px 0' }}>
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Чати</div>

      {chats.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 14, marginTop: 40 }}>
          Поки немає чатів — приєднайся або створи захід
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {chats.map(chat => (
            <ChatItem key={chat.id} chat={chat} onClick={() => navigate(`/events/${chat.id}/chat`)} />
          ))}
        </div>
      )}
    </div>
  )
}
