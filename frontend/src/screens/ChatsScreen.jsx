import { Avatar } from '../components/EventCard.jsx'

const MOCK_CHATS = [
  {
    id: 'c1',
    event_title: 'Футбол у парку Шевченка',
    last_message: 'Олексій: Збираємось біля воріт о 19:00',
    last_message_from: 'Олексій К.',
    time: '18:42',
    unread: 3,
  },
  {
    id: 'c2',
    event_title: 'Вечір настільних ігор',
    last_message: 'Марія: Хтось ще хоче Codenames?',
    last_message_from: 'Марія Д.',
    time: '17:05',
    unread: 0,
  },
  {
    id: 'c3',
    event_title: 'Джазовий концерт просто неба',
    last_message: 'Артем: Місце на Поштовій площі, шукайте банер',
    last_message_from: 'Артем М.',
    time: 'Вчора',
    unread: 1,
  },
]

function ChatItem({ chat }) {
  return (
    <div
      onClick={() => console.log('open chat', chat.id)}
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
      <Avatar name={chat.last_message_from} size={44} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {chat.event_title}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{chat.time}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span style={{
            fontSize: 13, color: 'var(--text-2)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {chat.last_message}
          </span>
          {chat.unread > 0 && (
            <span style={{
              flexShrink: 0, minWidth: 18, height: 18, borderRadius: 999,
              background: 'var(--accent)', color: '#fff',
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 5px',
            }}>
              {chat.unread}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ChatsScreen() {
  return (
    <div className="page" style={{ padding: '20px 16px 0' }}>
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Чати</div>

      {MOCK_CHATS.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 14, marginTop: 40 }}>
          Поки немає чатів
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MOCK_CHATS.map(chat => <ChatItem key={chat.id} chat={chat} />)}
        </div>
      )}
    </div>
  )
}
