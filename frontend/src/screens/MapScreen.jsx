import { useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import CategoryChips from '../components/CategoryChips.jsx'
import EventCard from '../components/EventCard.jsx'
import { MOCK_EVENTS, CATEGORIES } from '../data/mockData.js'

// Kyiv center as default
const DEFAULT_CENTER = [50.4501, 30.5234]

function createMarker(cat, isActive) {
  const size = isActive ? 46 : 38
  return L.divIcon({
    className: '',
    html: `<div style="
      position:relative;
      width:${size}px; height:${size}px;
      background:${cat.color};
      border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      font-size:${isActive ? 20 : 17}px;
      border:3px solid white;
      box-shadow:0 2px 10px rgba(0,0,0,.25);
      ${isActive ? `animation:pulse-ring 1.8s ease-out infinite;` : ''}
    ">${cat.icon}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function LocateButton({ onLocate }) {
  const map = useMap()
  const handleClick = useCallback(() => {
    map.locate({ setView: true, maxZoom: 15 })
    map.once('locationfound', (e) => onLocate(e.latlng))
    map.once('locationerror', () => map.setView(DEFAULT_CENTER, 13))
  }, [map, onLocate])

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'absolute', right: 14, bottom: 14, zIndex: 900,
        width: 44, height: 44, borderRadius: '50%',
        background: '#fff', border: 'none', cursor: 'pointer',
        boxShadow: 'var(--shadow-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}
      title="Моє місцезнаходження"
    >
      🎯
    </button>
  )
}

export default function MapScreen() {
  const [selectedCat, setSelectedCat] = useState(0)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const mapRef = useRef(null)

  const filtered = selectedCat === 0
    ? MOCK_EVENTS
    : MOCK_EVENTS.filter(e => e.category_id === selectedCat)

  function handleMarkerClick(event) {
    setSelectedEvent(event)
    if (mapRef.current) {
      mapRef.current.panTo([event.lat, event.lng], { animate: true, duration: 0.4 })
    }
  }

  return (
    <div className="page-full" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Top overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 800,
        paddingTop: 12, paddingBottom: 10,
        background: 'linear-gradient(to bottom, rgba(255,255,255,.98) 70%, transparent)',
      }}>
        <div style={{ padding: '0 16px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: '#fff', borderRadius: 12, padding: '9px 14px',
            boxShadow: 'var(--shadow-sm)', border: '1.5px solid var(--border)',
          }}>
            <span style={{ fontSize: 16 }}>🔍</span>
            <span style={{ color: 'var(--text-3)', fontSize: 14 }}>Пошук мероприятий…</span>
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(99,102,241,.35)',
          }}>⚙️</div>
        </div>
        <CategoryChips selected={selectedCat} onChange={setSelectedCat} />
      </div>

      {/* Map */}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={14}
        style={{ flex: 1, width: '100%', height: '100%' }}
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {filtered.map((event) => {
          const cat = CATEGORIES.find(c => c.id === event.category_id) ?? CATEGORIES[1]
          const isActive = event.status === 'active'
          return (
            <Marker
              key={event.id}
              position={[event.lat, event.lng]}
              icon={createMarker(cat, isActive)}
              eventHandlers={{ click: () => handleMarkerClick(event) }}
            />
          )
        })}

        <LocateButton onLocate={() => {}} />
      </MapContainer>

      {/* Bottom event count badge */}
      {!selectedEvent && (
        <div style={{
          position: 'absolute', bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom,0px) + 10px)',
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 800,
          background: 'var(--accent)', color: '#fff',
          padding: '7px 18px', borderRadius: 999,
          fontSize: 13, fontWeight: 700,
          boxShadow: 'var(--shadow-md)',
          whiteSpace: 'nowrap',
        }}>
          {filtered.length} мероприятий поруч
        </div>
      )}

      {/* Bottom sheet — selected event */}
      {selectedEvent && (
        <>
          <div className="sheet-backdrop" onClick={() => setSelectedEvent(null)} />
          <div style={{
            position: 'absolute',
            bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom,0px))',
            left: 0, right: 0,
            zIndex: 900,
            padding: '0 12px 12px',
            animation: 'slide-up .22s ease',
          }}>
            <style>{`@keyframes slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>

            <EventCard
              event={selectedEvent}
              onClick={() => {}}
            />

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 10 }}
              onClick={() => setSelectedEvent(null)}
            >
              Приєднатися 👋
            </button>
          </div>
        </>
      )}
    </div>
  )
}
