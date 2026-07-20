import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import WebApp from '@twa-dev/sdk'
import { LocateFixed, Check } from 'lucide-react'
import CategoryChips from '../components/CategoryChips.jsx'
import EventCard from '../components/EventCard.jsx'
import { apiFetch } from '../lib/api.js'
import { CATEGORIES } from '../data/mockData.js'

// Kyiv center as default
const DEFAULT_CENTER = [50.4501, 30.5234]

// Inner <path>/<circle> markup for each category's lucide icon (viewBox 0 0 24 24),
// extracted ahead of time so map markers don't need to pull react-dom/server into
// the client bundle just to stringify a handful of static icons.
const MARKER_ICON_PATHS = {
  0: '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"></path>',
  1: '<path d="M11 7a16 16 20 0 1 10.98 4.362"></path><path d="M12 12a13 13 0 0 1-8.66 5"></path><path d="M16.83 13.634a16 16 0 0 1-9.267 7.328"></path><path d="M20.66 17A13 13 0 0 0 12 12a13 13 0 0 1 0-10"></path><path d="M8.17 15.366a16 16 0 0 1-1.713-11.69"></path><circle cx="12" cy="12" r="10"></circle>',
  2: '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"></path><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"></path><path d="M16 17h4"></path><path d="M4 13h4"></path>',
  3: '<rect width="12" height="12" x="2" y="10" rx="2" ry="2"></rect><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"></path><path d="M6 18h.01"></path><path d="M10 14h.01"></path><path d="M15 6h.01"></path><path d="M18 9h.01"></path>',
  4: '<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"></path><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"></path><path d="m2.1 21.8 6.4-6.3"></path><path d="m19 5-7 7"></path>',
  5: '<path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>',
  6: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>',
}

// Lightning-bolt badge path (lucide "Zap"), used to mark events that can
// still be joined after they've started.
const JOIN_BADGE_ICON = '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>'

// Pin (teardrop) shape: a square rotated -45deg with 3 rounded corners.
// The unrotated square's center never moves, so the icon overlay just
// needs to sit centered on that same point (no counter-rotation needed).
// `joinableNow` marks events the creator opted to allow joining after start —
// shown as a small pulsing badge instead of a full halo around the pin.
function createMarker(cat, isActive, joinableNow) {
  const body = isActive ? 40 : 32
  const height = Math.round(body * 1.45)
  const centerY = height / 2
  const tipY = Math.round(centerY + (body / 2) * Math.SQRT2)
  const iconSize = isActive ? 20 : 16
  const half = body / 2

  const iconSvg = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${MARKER_ICON_PATHS[cat.id] ?? MARKER_ICON_PATHS[1]}</svg>`

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative; width:${body}px; height:${height}px;">
        ${joinableNow ? `
          <div style="
            position:absolute; left:50%; top:${centerY}px; margin:-${half + 3}px 0 0 ${half - 7}px;
            width:16px; height:16px; border-radius:50%;
            background:#22C55E; border:2px solid #fff;
            display:flex; align-items:center; justify-content:center;
            box-shadow:0 1px 4px rgba(0,0,0,.3);
            animation:badge-pulse 1.8s ease-out infinite;
            z-index:2;
          "><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${JOIN_BADGE_ICON}</svg></div>
        ` : ''}
        <div style="
          position:absolute; left:50%; top:${centerY}px; margin:-${half}px 0 0 -${half}px;
          width:${body}px; height:${body}px;
          background:${cat.color}; border-radius:50% 50% 50% 0;
          border:3px solid #fff;
          transform:rotate(-45deg);
          box-shadow:0 2px 10px rgba(0,0,0,.25);
        "></div>
        <div style="
          position:absolute; left:50%; top:${centerY}px; margin:-${half}px 0 0 -${half}px;
          width:${body}px; height:${body}px;
          display:flex; align-items:center; justify-content:center;
          pointer-events:none;
        ">${iconSvg}</div>
      </div>
    `,
    iconSize: [body, height],
    iconAnchor: [half, tipY],
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
        position: 'absolute', right: 14, bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 14px)', zIndex: 900,
        width: 44, height: 44, borderRadius: '50%',
        background: 'var(--card)', border: 'none', cursor: 'pointer',
        boxShadow: 'var(--shadow-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      title="Моє місцезнаходження"
    >
      <LocateFixed size={20} />
    </button>
  )
}

export default function MapScreen() {
  const location = useLocation()
  const [selectedCat, setSelectedCat] = useState(() => location.state?.categoryId ?? 0)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [isDark, setIsDark] = useState(
    document.documentElement.getAttribute('data-theme') === 'dark'
  )
  const mapRef = useRef(null)
  const [events, setEvents] = useState([])

  useEffect(() => {
    const onTheme = () =>
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    WebApp.onEvent('themeChanged', onTheme)
    return () => WebApp.offEvent('themeChanged', onTheme)
  }, [])

  useEffect(() => {
    apiFetch('/events')
      .then(({ events }) => setEvents(events))
      .catch(err => console.error('[Map] failed to load events:', err.message))
  }, [])

  const filtered = selectedCat === 0
    ? events
    : events.filter(e => e.category_id === selectedCat)

  const activeCategories = CATEGORIES.filter(cat =>
    cat.id === 0 || events.some(e =>
      e.category_id === cat.id && ['active', 'gathering'].includes(e.status)
    )
  )

  function handleMarkerClick(event) {
    setSelectedEvent(event)
    if (mapRef.current) {
      mapRef.current.panTo([event.lat, event.lng], { animate: true, duration: 0.4 })
    }
  }

  return (
    <div className="page-full" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Top overlay — chips float directly over the map, no background panel behind them */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 800,
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: 10,
      }}>
        <CategoryChips categories={activeCategories} selected={selectedCat} onChange={setSelectedCat} />
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
          url={isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'}
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {filtered.map((event) => {
          const cat = CATEGORIES.find(c => c.id === event.category_id) ?? CATEGORIES[1]
          const isActive = event.status === 'active'
          const joinableNow = isActive && event.late_join_allowed
          return (
            <Marker
              key={event.id}
              position={[event.lat, event.lng]}
              icon={createMarker(cat, isActive, joinableNow)}
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Приєднатися <Check size={18} />
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
