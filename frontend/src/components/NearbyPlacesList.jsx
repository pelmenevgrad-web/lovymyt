import { useState, useEffect } from 'react'
import { Fuel, ShoppingCart, Loader2 } from 'lucide-react'
import { fetchNearbyPlaces } from '../lib/nearbyPlaces.js'

// Shared by LocationSearchPicker (picking a spot) and EventDetailScreen
// (viewing one) — text list instead of map markers, since Nominatim gives
// name/address/distance directly and a marker-covered map at high zoom
// turned out both flaky (Overpass) and hard to read in a small embed.
// Tapping a row calls onSelect so the parent can drop a marker for it on
// its own map and fly to it.
export default function NearbyPlacesList({ lat, lng, onSelect, selectedId }) {
  const [places, setPlaces] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setPlaces(null)
    setError(null)
    fetchNearbyPlaces(lat, lng)
      .then(setPlaces)
      .catch(err => setError(err.message))
    // Rounded so dragging a picker pin by a pixel doesn't refire two
    // sequential Nominatim calls.
  }, [lat.toFixed(4), lng.toFixed(4)])

  if (error) {
    return <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{error} — спробуй ще раз пізніше</div>
  }
  if (places === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
        <Loader2 size={13} className="spin" /> Шукаємо поруч…
      </div>
    )
  }
  if (places.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>Нічого не знайдено поблизу</div>
  }
  return (
    <div style={{ marginTop: 8, maxHeight: 160, overflowY: 'auto' }}>
      {places.slice(0, 12).map(p => (
        <div
          key={p.id}
          onClick={() => onSelect?.(p)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px',
            borderBottom: '1px solid var(--border)', cursor: onSelect ? 'pointer' : 'default',
            borderRadius: 'var(--radius-sm)',
            background: selectedId === p.id ? 'var(--accent-light)' : 'transparent',
          }}
        >
          {p.kind === 'fuel' ? <Fuel size={14} color="var(--orange)" /> : <ShoppingCart size={14} color="var(--green)" />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address}</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600, flexShrink: 0 }}>{p.distance_km} км</div>
        </div>
      ))}
    </div>
  )
}
