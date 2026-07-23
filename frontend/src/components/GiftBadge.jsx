import { resolveIcon } from '../lib/icons.js'
import { hexToRgba } from '../lib/color.js'

// Colorful glowing/shining circle for a gift's icon — used everywhere a gift
// is shown (picker, received list, admin) so a real-money purchase looks and
// feels premium instead of a flat gray lucide icon.
export default function GiftBadge({ iconName, color, size = 44, iconSize, delay = 0, glow = true }) {
  const Icon = resolveIcon(iconName)
  const base = color || '#6366F1'

  return (
    <div
      className={`gift-badge${glow ? ' gift-badge-glow' : ''}`}
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: `linear-gradient(135deg, color-mix(in srgb, ${base} 55%, white), ${base})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        '--gift-color': hexToRgba(base, .55),
        '--gift-shine-delay': `${delay}s`,
      }}
    >
      <Icon size={iconSize ?? Math.round(size * 0.5)} color="#fff" />
    </div>
  )
}
