import { CATEGORIES } from '../data/mockData.js'

export default function CategoryChips({ selected, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px',
      scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
    }}>
      {CATEGORIES.map((cat) => {
        const active = selected === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onChange(active ? 0 : cat.id)}
            className="chip"
            style={{
              background: active ? cat.color : 'var(--card)',
              color:      active ? '#fff'     : 'var(--text)',
              border:     active ? 'none'     : '1.5px solid var(--border)',
              boxShadow:  active ? `0 2px 10px ${cat.color}55` : 'none',
              flexShrink: 0,
            }}
          >
            <cat.Icon size={18} />
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}
