import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Crown } from 'lucide-react'
import { useCategories } from '../context/CategoriesContext.jsx'
import { apiFetch } from '../lib/api.js'

export default function CategoriesScreen() {
  const navigate = useNavigate()
  const { categories } = useCategories()
  const [events, setEvents] = useState([])

  useEffect(() => {
    apiFetch('/events')
      .then(({ events }) => setEvents(events))
      .catch(err => console.error('[Categories] failed to load events:', err.message))
  }, [])

  function countFor(categoryId) {
    return events.filter(e => categoryId === 0 || (e.category_ids ?? [e.category_id]).includes(categoryId)).length
  }

  return (
    <div className="page" style={{ paddingTop: 20, paddingLeft: 16, paddingRight: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Категорії</div>

      <div
        className="card"
        onClick={() => navigate('/events/history')}
        style={{
          padding: 16, marginBottom: 10, cursor: 'pointer', userSelect: 'none',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(135deg, #F59E0B, #EC4899)', color: '#fff',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'rgba(255,255,255,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Trophy size={22} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Рейтинг заходів</div>
          <div style={{ fontSize: 12, opacity: .9, marginTop: 2 }}>Минулі заходи за оцінками учасників</div>
        </div>
      </div>

      <div
        className="card"
        onClick={() => navigate('/organizers/top')}
        style={{
          padding: 16, marginBottom: 16, cursor: 'pointer', userSelect: 'none',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)', color: '#fff',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'rgba(255,255,255,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Crown size={22} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Топ організаторів</div>
          <div style={{ fontSize: 12, opacity: .9, marginTop: 2 }}>Найкращі за оцінками учасників</div>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12,
      }}>
        {categories.map(cat => {
          const count = countFor(cat.id)
          return (
            <div
              key={cat.id}
              className="card"
              onClick={() => navigate('/', { state: { categoryId: cat.id } })}
              style={{
                padding: 16, cursor: 'pointer', userSelect: 'none',
                display: 'flex', flexDirection: 'column', gap: 10,
                transition: 'transform .12s',
              }}
              onPointerDown={e => e.currentTarget.style.transform = 'scale(.97)'}
              onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: cat.color + '22', color: cat.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <cat.Icon size={22} />
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{cat.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                  {count > 0 ? `${count} заходів` : 'Немає заходів'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
