import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Map, LayoutGrid, Plus, MessageCircle, User } from 'lucide-react'

const TABS = [
  { path: '/',           Icon: Map,           label: 'Карта' },
  { path: '/categories', Icon: LayoutGrid,    label: 'Категорії' },
  { path: '/create',     Icon: Plus,          label: 'Створити', accent: true },
  { path: '/chats',      Icon: MessageCircle, label: 'Чати', badge: true },
  { path: '/profile',    Icon: User,          label: 'Профіль' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // TODO: замінити на реальні дані непрочитаних чатів із Supabase
  const [hasUnreadChats] = useState(true)

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 'calc(var(--nav-h) + env(safe-area-inset-bottom, 0px))',
      background: 'var(--card)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'flex-start',
      paddingTop: 6,
      zIndex: 500,
      boxShadow: '0 -4px 20px rgba(0,0,0,.07)',
    }}>
      {TABS.map(({ path, Icon, label, accent, badge }) => {
        const active = pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            {accent ? (
              <span style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(99,102,241,.45)',
                marginTop: -18,
                color: '#fff',
              }}>
                <Icon size={22} />
              </span>
            ) : (
              <span style={{ position: 'relative', display: 'flex' }}>
                <Icon size={22} color={active ? 'var(--accent)' : 'var(--text-3)'} />
                {badge && hasUnreadChats && (
                  <span style={{
                    position: 'absolute', top: -2, right: -2,
                    width: 9, height: 9, borderRadius: '50%',
                    background: '#EF4444', border: '1.5px solid var(--card)',
                  }} />
                )}
              </span>
            )}
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: accent ? 'var(--accent)' : active ? 'var(--accent)' : 'var(--text-3)',
            }}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
