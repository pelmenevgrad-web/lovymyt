import { useState, useEffect } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import WebApp from '@twa-dev/sdk'
import BottomNav from './components/BottomNav.jsx'
import MapScreen from './screens/MapScreen.jsx'
import CategoriesScreen from './screens/CategoriesScreen.jsx'
import ChatsScreen from './screens/ChatsScreen.jsx'
import ProfileScreen from './screens/ProfileScreen.jsx'
import EditProfileScreen from './screens/EditProfileScreen.jsx'
import CreateScreen from './screens/CreateScreen.jsx'
import EventDetailScreen from './screens/EventDetailScreen.jsx'
import EventReviewScreen from './screens/EventReviewScreen.jsx'
import EventChatScreen from './screens/EventChatScreen.jsx'
import EventReportScreen from './screens/EventReportScreen.jsx'
import PublicProfileScreen from './screens/PublicProfileScreen.jsx'
import EventHistoryScreen from './screens/EventHistoryScreen.jsx'
import TopOrganizersScreen from './screens/TopOrganizersScreen.jsx'
import UserArchiveScreen from './screens/UserArchiveScreen.jsx'
import AdminScreen from './screens/AdminScreen.jsx'
import AdminCategoriesScreen from './screens/AdminCategoriesScreen.jsx'
import AdminFunnyStatusesScreen from './screens/AdminFunnyStatusesScreen.jsx'
import AdminGiftsScreen from './screens/AdminGiftsScreen.jsx'
import AdminReportsScreen from './screens/AdminReportsScreen.jsx'
import AdminVerificationScreen from './screens/AdminVerificationScreen.jsx'
import AdminStarsScreen from './screens/AdminStarsScreen.jsx'
import AdminUsersScreen from './screens/AdminUsersScreen.jsx'
import AdminVenuesScreen from './screens/AdminVenuesScreen.jsx'
import AdminVenueCategoriesScreen from './screens/AdminVenueCategoriesScreen.jsx'
import MyVenuesScreen from './screens/MyVenuesScreen.jsx'
import CreateVenueScreen from './screens/CreateVenueScreen.jsx'
import VenueDetailScreen from './screens/VenueDetailScreen.jsx'
import VenueChatScreen from './screens/VenueChatScreen.jsx'
import VenueInquiriesScreen from './screens/VenueInquiriesScreen.jsx'
import ClubsScreen from './screens/ClubsScreen.jsx'
import MyClubsScreen from './screens/MyClubsScreen.jsx'
import CreateClubScreen from './screens/CreateClubScreen.jsx'
import ClubDetailScreen from './screens/ClubDetailScreen.jsx'
import BattleScreen from './screens/BattleScreen.jsx'
import WelcomeScreen from './screens/WelcomeScreen.jsx'
import { useAuth } from './context/AuthContext.jsx'

// ── Visible init-debug overlay ───────────────────────────────────────────────
// Rendered instead of the real app while initialization is in progress.
// If the app is stuck at any step, this screen stays visible — no blank page.

const STEP_LABELS = {
  mounting:   'Монтування React…',
  tg_check:   'Перевірка Telegram WebApp…',
  tg_ready:   'Виклик WebApp.ready()…',
  done:       'Готово — рендер застосунку',
  failed:     'Ініціалізація провалилась',
}

function Row({ ok, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>
      <span style={{ flexShrink: 0, display: 'flex', color: ok ? '#22c55e' : '#ef4444' }}>
        {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      </span>
      <span style={{ color: '#475569', minWidth: 180 }}>{label}</span>
      <span style={{ color: '#0f172a', fontWeight: 600, wordBreak: 'break-all' }}>{String(value)}</span>
    </div>
  )
}

// Shown instead of the whole app the moment any API call comes back with
// code:'BANNED' — requireAuth re-checks is_banned on every request, so this
// can fire mid-session (not just at login) if an admin bans someone who's
// already inside the app with a still-valid token.
function BannedScreen({ message }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, minHeight: 'var(--full-h)', padding: '0 32px', textAlign: 'center',
    }}>
      <XCircle size={40} color="#ef4444" />
      <div style={{ fontWeight: 800, fontSize: 17 }}>Доступ обмежено</div>
      <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{message}</div>
    </div>
  )
}

function InitDebug({ step, info, error }) {
  const failed = step === 'failed'
  return (
    <div style={{
      padding: 20, fontFamily: '-apple-system, sans-serif',
      background: failed ? '#fff1f2' : '#f8fafc',
      minHeight: 'var(--full-h)', color: '#0f172a',
    }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        {failed
          ? <><AlertTriangle size={18} color="#dc2626" /> Помилка ініціалізації</>
          : <><Loader2 size={18} className="spin" /> Ініціалізація…</>}
      </div>
      <div style={{
        display: 'inline-block', padding: '3px 10px', borderRadius: 999,
        background: failed ? '#fee2e2' : '#e0e7ff',
        color: failed ? '#dc2626' : '#4f46e5',
        fontSize: 12, fontWeight: 700, marginBottom: 16,
      }}>
        {STEP_LABELS[step] ?? step}
      </div>

      {error && (
        <div style={{
          background: '#fff', border: '1.5px solid #fca5a5',
          borderRadius: 10, padding: 12, marginBottom: 16,
          fontSize: 13, color: '#b91c1c', wordBreak: 'break-word',
        }}>
          <strong>Помилка:</strong> {error}
        </div>
      )}

      {info && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '4px 14px', boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
          <Row ok={info.windowTelegram}   label="window.Telegram"        value={info.windowTelegram ? 'є' : 'відсутній'} />
          <Row ok={info.webApp}           label="window.Telegram.WebApp" value={info.webApp ? 'є' : 'відсутній'} />
          <Row ok={info.platform !== 'unknown'} label="Platform"         value={info.platform} />
          <Row ok={info.initDataLength > 0}    label="initData довжина"  value={info.initDataLength} />
          <Row ok={info.hasUser}          label="initDataUnsafe.user"    value={info.hasUser ? `є (id: ${info.userId})` : 'відсутній'} />
          <Row ok={info.hasUser}          label="Ім'я користувача"       value={info.userName ?? '—'} />
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
        Цей екран показується замість порожньої сторінки під час ініціалізації.<br />
        Якщо він не зникає — значить застосунок завис на кроці вище.
      </div>
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep]           = useState('mounting')
  const [tgInfo, setTgInfo]       = useState(null)
  const [initError, setInitError] = useState(null)
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('lovymyt_terms_accepted'))
  const [bannedMessage, setBannedMessage] = useState(null)

  function handleJoin() {
    localStorage.setItem('lovymyt_terms_accepted', Date.now().toString())
    setShowWelcome(false)
  }

  useEffect(() => {
    const onBanned = (e) => setBannedMessage(e.detail?.message || 'Тебе заблоковано.')
    window.addEventListener('app:banned', onBanned)
    return () => window.removeEventListener('app:banned', onBanned)
  }, [])

  useEffect(() => {
    setStep('tg_check')

    try {
      const info = {
        windowTelegram:  !!window?.Telegram,
        webApp:          !!window?.Telegram?.WebApp,
        platform:        WebApp.platform || 'unknown',
        initDataLength:  WebApp.initData?.length ?? 0,
        hasUser:         !!WebApp.initDataUnsafe?.user,
        userId:          WebApp.initDataUnsafe?.user?.id ?? null,
        userName:        WebApp.initDataUnsafe?.user?.first_name ?? null,
      }
      setTgInfo(info)
      setStep('tg_ready')
    } catch (err) {
      setInitError('Крок збору info: ' + err.message)
      setStep('failed')
      return
    }

    try {
      WebApp.ready()
      WebApp.expand()
    } catch (err) {
      setInitError('Крок WebApp.ready/expand: ' + err.message)
      setStep('failed')
      return
    }

    const applyTheme = () => {
      document.documentElement.setAttribute('data-theme', WebApp.colorScheme || 'light')
    }
    applyTheme()
    WebApp.onEvent('themeChanged', applyTheme)

    setStep('done')

    return () => WebApp.offEvent('themeChanged', applyTheme)
  }, [])

  if (step !== 'done') {
    return <InitDebug step={step} info={tgInfo} error={initError} />
  }

  if (showWelcome) {
    return <WelcomeScreen onJoin={handleJoin} />
  }

  if (bannedMessage) {
    return <BannedScreen message={bannedMessage} />
  }

  // Invite/notification links open as https://t.me/lovymyt_bot?startapp=event_<uuid>,
  // chat_<uuid>, review_<uuid>, user_<uuid>, venue_<uuid> or venue_chat_<uuid> —
  // land straight on that event/chat/review/profile/venue instead of the map.
  // venue_chat_ must be checked before venue_ since "venue_chat_X" also
  // startsWith('venue_').
  const startParam = WebApp.initDataUnsafe?.start_param
  const initialPath = startParam?.startsWith('chat_') ? `/events/${startParam.slice('chat_'.length)}/chat`
    : startParam?.startsWith('review_') ? `/events/${startParam.slice('review_'.length)}/review`
    : startParam?.startsWith('battle_') ? `/battles/${startParam.slice('battle_'.length)}`
    : startParam?.startsWith('event_') ? `/events/${startParam.slice('event_'.length)}`
    : startParam?.startsWith('venue_chat_') ? `/venues/inquiries/${startParam.slice('venue_chat_'.length)}`
    : startParam?.startsWith('venue_') ? `/venues/${startParam.slice('venue_'.length)}`
    : startParam?.startsWith('user_') ? `/users/${startParam.slice('user_'.length)}`
    : startParam === 'profile' ? '/profile'
    : '/'

  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/"           element={<MapScreen />} />
        <Route path="/categories" element={<CategoriesScreen />} />
        <Route path="/chats"      element={<ChatsScreen />} />
        <Route path="/profile"    element={<ProfileScreen />} />
        <Route path="/profile/edit" element={<EditProfileScreen />} />
        <Route path="/create"     element={<CreateScreen />} />
        <Route path="/events/:id" element={<EventDetailScreen />} />
        <Route path="/events/:id/edit" element={<CreateScreen />} />
        <Route path="/events/:id/review" element={<EventReviewScreen />} />
        <Route path="/events/:id/chat" element={<EventChatScreen />} />
        <Route path="/events/:id/report" element={<EventReportScreen />} />
        <Route path="/events/history" element={<EventHistoryScreen />} />
        <Route path="/organizers/top" element={<TopOrganizersScreen />} />
        <Route path="/users/:id" element={<PublicProfileScreen />} />
        <Route path="/users/:id/archive" element={<UserArchiveScreen />} />
        <Route path="/admin" element={<AdminOnly><AdminScreen /></AdminOnly>} />
        <Route path="/admin/categories" element={<AdminOnly><AdminCategoriesScreen /></AdminOnly>} />
        <Route path="/admin/funny-statuses" element={<AdminOnly><AdminFunnyStatusesScreen /></AdminOnly>} />
        <Route path="/admin/gifts" element={<AdminOnly><AdminGiftsScreen /></AdminOnly>} />
        <Route path="/admin/reports" element={<AdminOnly><AdminReportsScreen /></AdminOnly>} />
        <Route path="/admin/verification" element={<AdminOnly><AdminVerificationScreen /></AdminOnly>} />
        <Route path="/admin/stars" element={<AdminOnly><AdminStarsScreen /></AdminOnly>} />
        <Route path="/admin/users" element={<AdminOnly><AdminUsersScreen /></AdminOnly>} />
        <Route path="/admin/venues" element={<AdminOnly><AdminVenuesScreen /></AdminOnly>} />
        <Route path="/admin/venue-categories" element={<AdminOnly><AdminVenueCategoriesScreen /></AdminOnly>} />
        <Route path="/venues/mine" element={<MyVenuesScreen />} />
        <Route path="/venues/new" element={<CreateVenueScreen />} />
        <Route path="/venues/:id/edit" element={<CreateVenueScreen />} />
        <Route path="/venues/:id/inquiries" element={<VenueInquiriesScreen />} />
        <Route path="/venues/inquiries/:inquiryId" element={<VenueChatScreen />} />
        <Route path="/venues/:id" element={<VenueDetailScreen />} />
        <Route path="/clubs" element={<ClubsScreen />} />
        <Route path="/clubs/mine" element={<MyClubsScreen />} />
        <Route path="/clubs/new" element={<CreateClubScreen />} />
        <Route path="/clubs/:id/edit" element={<CreateClubScreen />} />
        <Route path="/clubs/:id" element={<ClubDetailScreen />} />
        <Route path="/battles/:id" element={<BattleScreen />} />
      </Routes>
      <BottomNav />
    </MemoryRouter>
  )
}

// Blocks direct navigation to /admin/* for non-admin accounts (the nav link
// to get here is itself hidden unless user.is_admin, but the route must
// still refuse a manually-typed URL).
function AdminOnly({ children }) {
  const { user, status } = useAuth()

  if (status === 'pending') {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={28} className="spin" color="var(--text-3)" />
      </div>
    )
  }

  if (!user?.is_admin) {
    return (
      <div className="page" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, minHeight: '60vh', padding: '0 32px', textAlign: 'center',
      }}>
        <AlertTriangle size={28} color="var(--text-3)" />
        <div style={{ fontWeight: 700, fontSize: 15 }}>Немає доступу</div>
      </div>
    )
  }

  return children
}
