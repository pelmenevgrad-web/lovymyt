import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Plus, Users } from 'lucide-react'
import BackButton from '../components/BackButton.jsx'
import { apiFetch } from '../lib/api.js'

function ClubRow({ club, onClick }) {
  return (
    <div className="card" style={{ padding: 12, marginBottom: 8, display: 'flex', gap: 10, cursor: 'pointer' }} onClick={onClick}>
      {club.cover_image_url ? (
        <img src={club.cover_image_url} alt="" style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--radius-sm)', flexShrink: 0,
          background: 'var(--accent-light)', color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={20} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Users size={11} /> {club.subscriber_count} підписників
        </div>
      </div>
    </div>
  )
}

export default function MyClubsScreen() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)

  useEffect(() => {
    apiFetch('/clubs/mine')
      .then(setData)
      .catch(err => console.error('[MyClubs] failed to load:', err.message))
  }, [])

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Мої клуби</h1>
      </div>

      <div style={{ padding: '8px 16px 24px' }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={() => navigate('/clubs/new')}
        >
          <Plus size={16} /> Створити клуб
        </button>

        {data === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 size={24} className="spin" color="var(--text-3)" />
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Створені мною</div>
            {data.created.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>Поки немає</div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                {data.created.map(c => <ClubRow key={c.id} club={c} onClick={() => navigate(`/clubs/${c.id}`)} />)}
              </div>
            )}

            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Підписки</div>
            {data.subscribed.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Поки немає — знайди клуб і підпишись</div>
            ) : (
              data.subscribed.map(c => <ClubRow key={c.id} club={c} onClick={() => navigate(`/clubs/${c.id}`)} />)
            )}
          </>
        )}
      </div>
    </div>
  )
}
