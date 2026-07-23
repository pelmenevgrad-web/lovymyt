import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, Smile, Users, Loader2, Gift } from 'lucide-react'
import BackButton from '../components/BackButton.jsx'
import { apiFetch } from '../lib/api.js'

function StatBox({ value, label }) {
  return (
    <div className="card" style={{ padding: '14px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function NavRow({ Icon, label, onClick }) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
    >
      <Icon size={20} color="var(--accent)" />
      <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{label}</span>
      <span style={{ fontSize: 18, color: 'var(--text-3)' }}>›</span>
    </div>
  )
}

export default function AdminScreen() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    apiFetch('/admin/stats')
      .then(setStats)
      .catch(err => console.error('[Admin] failed to load stats:', err.message))
  }, [])

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Адмін-панель</h1>
      </div>

      <div style={{ padding: '8px 16px 24px' }}>
        {!stats ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 size={24} className="spin" color="var(--text-3)" />
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
              <StatBox value={stats.total_users} label="Користувачів" />
              <StatBox value={stats.banned_users} label="Забанено" />
              <StatBox value={stats.total_events} label="Заходів усього" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
              <StatBox value={stats.events_by_status.active} label="Активні" />
              <StatBox value={stats.events_by_status.completed} label="Завершені" />
              <StatBox value={stats.events_by_status.cancelled} label="Скасовані" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
              <StatBox value={stats.total_reports} label="Звітів" />
              <StatBox value={stats.total_reviews} label="Відгуків" />
            </div>
          </>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <NavRow Icon={LayoutGrid} label="Категорії" onClick={() => navigate('/admin/categories')} />
          <NavRow Icon={Smile} label="Смішні статуси" onClick={() => navigate('/admin/funny-statuses')} />
          <NavRow Icon={Gift} label="Подарунки" onClick={() => navigate('/admin/gifts')} />
          <NavRow Icon={Users} label="Користувачі / бан" onClick={() => navigate('/admin/users')} />
        </div>
      </div>
    </div>
  )
}
