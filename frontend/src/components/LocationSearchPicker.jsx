import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Search, Fuel } from 'lucide-react'
import NearbyPlacesList from './NearbyPlacesList.jsx'

const pickerIcon = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:50%;background:var(--accent);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const poiIcon = (kind) => L.divIcon({
  className: '',
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid ${kind === 'fuel' ? '#F97316' : '#22C55E'};display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.35);">${kind === 'fuel' ? '⛽' : '🛒'}</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

function MapPicker({ lat, lng, onMapChange, isDark, mapRef, selectedPlace }) {
  function ClickCapture() {
    useMapEvents({ click: (e) => onMapChange(e.latlng.lat, e.latlng.lng) })
    return null
  }

  return (
    <MapContainer
      ref={mapRef}
      center={[lat, lng]}
      zoom={13}
      style={{ height: 180, width: '100%', borderRadius: 'var(--radius-md)', marginTop: 8 }}
      zoomControl={false}
    >
      <TileLayer
        url={isDark
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'}
        attribution=""
      />
      <ClickCapture />
      {selectedPlace && (
        <Marker position={[selectedPlace.lat, selectedPlace.lng]} icon={poiIcon(selectedPlace.kind)} />
      )}
      <Marker
        position={[lat, lng]}
        icon={pickerIcon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const p = e.target.getLatLng()
            onMapChange(p.lat, p.lng)
          },
        }}
      />
    </MapContainer>
  )
}

// "Київська обл., Києво-Святошинський р-н, м. Київ, вул. Хрещатик, 15, 01001"
// → "Київ, вул. Хрещатик 15" — just locality + street + house number
function formatShortAddress(result) {
  const a = result?.address ?? {}
  const locality = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? ''
  const street = a.road ?? a.pedestrian ?? a.footway ?? ''
  const streetPart = [street, a.house_number].filter(Boolean).join(' ')
  const parts = [locality, streetPart].filter(Boolean)
  if (parts.length > 0) return parts.join(', ')
  return result?.display_name || null
}

// Address search (Nominatim) + draggable-pin map, combined. Reports every
// change — typed text, picked suggestion, or map tap/drag — through one
// onChange({ address_text, lat, lng }) so the parent form just merges it in.
export default function LocationSearchPicker({
  addressText, lat, lng, isDark, onChange,
  placeholder = 'Адреса або назва місця',
  hint = 'Обери підказку вище або торкнись карти, щоб вибрати точку',
}) {
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [focused, setFocused] = useState(false)
  const [showNearby, setShowNearby] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const mapRef = useRef(null)

  function handleSelectPlace(place) {
    setSelectedPlace(place)
    mapRef.current?.flyTo([place.lat, place.lng], 17)
  }

  useEffect(() => {
    const query = (addressText || '').trim()
    if (query.length < 3) {
      setSuggestions([])
      return
    }
    const controller = new AbortController()
    setSearching(true)
    const timer = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=ua&q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(r => r.json())
        .then(data => setSuggestions(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setSearching(false))
    }, 500)
    return () => { clearTimeout(timer); controller.abort() }
  }, [addressText])

  // Reverse-geocodes wherever the user taps/drags the pin so the address field is
  // never empty — falls back to raw coordinates if the point is somewhere
  // Nominatim has no data for at all (forest, etc).
  async function handleMapChange(newLat, newLng) {
    const fallback = `${newLat.toFixed(5)}, ${newLng.toFixed(5)}`
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&zoom=16&lat=${newLat}&lon=${newLng}`)
      const result = await res.json()
      onChange({ address_text: formatShortAddress(result) ?? fallback, lat: newLat, lng: newLng })
    } catch {
      onChange({ address_text: fallback, lat: newLat, lng: newLng })
    }
  }

  function selectSuggestion(result) {
    const newLat = parseFloat(result.lat)
    const newLng = parseFloat(result.lon)
    onChange({ address_text: formatShortAddress(result), lat: newLat, lng: newLng })
    setSuggestions([])
    mapRef.current?.flyTo([newLat, newLng], 15)
  }

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} color="var(--text-3)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder={placeholder}
            value={addressText}
            onChange={e => onChange({ address_text: e.target.value, lat, lng })}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            style={{ paddingLeft: 38 }}
          />
        </div>

        {focused && (searching || suggestions.length > 0) && (
          <div className="card" style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
            marginTop: 4, maxHeight: 220, overflowY: 'auto', padding: '4px 0',
          }}>
            {searching && suggestions.length === 0 && (
              <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-3)' }}>Шукаємо…</div>
            )}
            {suggestions.map(s => (
              <button
                key={s.place_id}
                onClick={() => selectSuggestion(s)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '10px 14px', fontSize: 13, color: 'var(--text)',
                }}
              >
                {s.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>{hint}</div>
      <MapPicker lat={lat} lng={lng} isDark={isDark} mapRef={mapRef} onMapChange={handleMapChange} selectedPlace={selectedPlace} />
      <button
        type="button"
        className="chip"
        style={{
          marginTop: 8,
          background: showNearby ? 'var(--accent-light)' : 'var(--card)',
          color: showNearby ? 'var(--accent)' : 'var(--text)',
          border: '1.5px solid ' + (showNearby ? 'var(--accent)' : 'var(--border)'),
        }}
        onClick={() => { setShowNearby(v => !v); setSelectedPlace(null) }}
      >
        <Fuel size={14} /> {showNearby ? 'Приховати список' : 'Заправки/магазини поруч'}
      </button>
      {showNearby && (
        <NearbyPlacesList lat={lat} lng={lng} onSelect={handleSelectPlace} selectedId={selectedPlace?.id} />
      )}
    </div>
  )
}
