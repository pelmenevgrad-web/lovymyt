import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Plus, Users } from 'lucide-react'
import BackButton from '../components/BackButton.jsx'
import { apiFetch } from '../lib/api.js'

export default function ClubsScreen() {
  const navigate = useNavigate()
  const [clubs, setClubs] = useState(null)

  useEffect(() => {
    apiFetch('/clubs')
      .then(({ clubs }) => setClubs(clubs))
      .catch(err => console.error('[Clubs] failed to load:', err.message))
  }, [])

  return (
    <div className="page">
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton />
        <h1 style={{ fontSize: 18, fontWeight: 800 }}>Клуби</h1>
      </div>

      <div style={{ padding: '8px 16px 24px' }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={() => navigate('/clubs/new')}
        >
          <Plus size={16} /> Створити клуб
        </button>

        {clubs === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 size={24} className="spin" color="var(--text-3)" />
          </div>
        ) : clubs.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>
            Поки немає клубів — створи свій перший регулярний захід.
          </div>
        ) : (
          clubs.map(c => (
            <div
              key={c.id}
              className="card"
              style={{ padding: 12, marginBottom: 8, display: 'flex', gap: 10, cursor: 'pointer' }}
              onClick={() => navigate(`/clubs/${c.id}`)}
            >
              {c.cover_image_url ? (
                <img src={c.cover_image_url} alt="" style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 56, height: 56, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                  background: 'var(--accent-light)', color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Users size={22} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                {c.description && (
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.description}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={11} /> {c.subscriber_count} підписників
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
