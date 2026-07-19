import { useNavigate } from 'react-router-dom'
import { CATEGORIES, MOCK_EVENTS } from '../data/mockData.js'

function activeCountFor(categoryId) {
  return MOCK_EVENTS.filter(e =>
    (categoryId === 0 || e.category_id === categoryId) &&
    ['active', 'gathering'].includes(e.status)
  ).length
}

export default function CategoriesScreen() {
  const navigate = useNavigate()

  return (
    <div className="page" style={{ padding: '20px 16px 0' }}>
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Категорії</div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12,
      }}>
        {CATEGORIES.map(cat => {
          const count = activeCountFor(cat.id)
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
                  {count > 0 ? `${count} зараз` : 'Немає активних'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
