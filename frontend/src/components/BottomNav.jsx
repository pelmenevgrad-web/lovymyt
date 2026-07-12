import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  { path: '/',        icon: MapIcon,    label: 'Карта' },
  { path: '/create',  icon: PlusIcon,   label: 'Створити', accent: true },
  { path: '/profile', icon: UserIcon,   label: 'Профіль' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      height: 'calc(var(--nav-h) + env(safe-area-inset-bottom, 0px))',
      background: '#fff',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'flex-start',
      paddingTop: 6,
      zIndex: 500,
      boxShadow: '0 -4px 20px rgba(0,0,0,.07)',
    }}>
      {TABS.map(({ path, icon: Icon, label, accent }) => {
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
              }}>
                <Icon size={22} color="#fff" />
              </span>
            ) : (
              <Icon size={22} color={active ? 'var(--accent)' : 'var(--text-3)'} />
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

function MapIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  )
}

function PlusIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function UserIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
