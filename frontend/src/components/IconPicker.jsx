import { ICON_CHOICES, resolveIcon } from '../lib/icons.js'

export default function IconPicker({ value, onChange, color = 'var(--accent)' }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8,
      maxHeight: 220, overflowY: 'auto', padding: 2,
    }}>
      {ICON_CHOICES.map(name => {
        const Icon = resolveIcon(name)
        const selected = value === name
        return (
          <button
            key={name}
            onClick={() => onChange(name)}
            style={{
              aspectRatio: '1', borderRadius: 10, cursor: 'pointer',
              background: selected ? color : 'var(--card)',
              color: selected ? '#fff' : 'var(--text)',
              border: '1.5px solid ' + (selected ? color : 'var(--border)'),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon size={18} />
          </button>
        )
      })}
    </div>
  )
}
