import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import WebApp from '@twa-dev/sdk'
import { LocateFixed, Loader2 } from 'lucide-react'
import CategoryChips from '../components/CategoryChips.jsx'
import EventCard from '../components/EventCard.jsx'
import { apiFetch } from '../lib/api.js'
import { useCategories } from '../context/CategoriesContext.jsx'
import { MARKER_ICON_PATHS } from '../lib/markerIcons.js'

// Kyiv center as default
const DEFAULT_CENTER = [50.4501, 30.5234]

// Lightning-bolt badge path (lucide "Zap"), used to mark events that can
// still be joined after they've started.
const JOIN_BADGE_ICON = '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>'

// Small overlapping avatar row hanging below the pin, showing who's already
// joined (up to 4). Falls back to an initial-letter circle without a photo.
function markerAvatarsHtml(people) {
  if (!people || people.length === 0) return ''
  const size = 18
  const items = people.slice(0, 4).map((p, i) => {
    const marginLeft = i === 0 ? 0 : -6
    if (p.avatar_url) {
      return `<img src="${p.avatar_url}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:1.5px solid #fff;margin-left:${marginLeft}px;box-shadow:0 1px 3px rgba(0,0,0,.35);display:block;" />`
    }
    const initial = (p.first_name || '?')[0].toUpperCase()
    const hue = p.first_name ? (p.first_name.charCodeAt(0) * 37) % 360 : 200
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:hsl(${hue},60%,55%);color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;border:1.5px solid #fff;margin-left:${marginLeft}px;box-shadow:0 1px 3px rgba(0,0,0,.35);">${initial}</div>`
  }).join('')
  return `<div style="display:flex;">${items}</div>`
}

// Pin (teardrop) shape: a square rotated -45deg with 3 rounded corners.
// The unrotated square's center never moves, so the icon overlay just
// needs to sit centered on that same point (no counter-rotation needed).
// `joinableNow` marks events the creator opted to allow joining after start —
// shown as a small pulsing badge instead of a full halo around the pin.
function createMarker(cat, isActive, joinableNow, people) {
  const body = isActive ? 48 : 40
  const height = Math.round(body * 1.45)
  const centerY = height / 2
  const tipY = Math.round(centerY + (body / 2) * Math.SQRT2)
  const iconSize = isActive ? 24 : 20
  const half = body / 2

  const hasAvatars = people && people.length > 0
  const avatarRowTop = tipY + 4
  const canvasHeight = hasAvatars ? avatarRowTop + 20 : height

  const iconSvg = `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${MARKER_ICON_PATHS[cat.icon_name] ?? MARKER_ICON_PATHS.Sparkles}</svg>`

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative; width:${body}px; height:${canvasHeight}px;">
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
        <div style="position:absolute; left:50%; top:${avatarRowTop}px; transform:translateX(-50%); pointer-events:none;">
          ${markerAvatarsHtml(people)}
        </div>
      </div>
    `,
    iconSize: [body, canvasHeight],
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
  const navigate = useNavigate()
  const { categories: CATEGORIES } = useCategories()
  const [selectedCat, setSelectedCat] = useState(() => location.state?.categoryId ?? 0)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [isDark, setIsDark] = useState(
    document.documentElement.getAttribute('data-theme') === 'dark'
  )
  const mapRef = useRef(null)
  const [events, setEvents] = useState([])
  const [eventsLoaded, setEventsLoaded] = useState(false)

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
      .finally(() => setEventsLoaded(true))
  }, [])

  const filtered = selectedCat === 0
    ? events
    : events.filter(e => e.category_id === selectedCat)

  const activeCategories = CATEGORIES.filter(cat =>
    cat.id === 0 || events.some(e => e.category_id === cat.id)
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

      {/* Map — mounted only once we know real event locations, so it opens
          directly on the right view instead of starting at Kyiv and jumping */}
      {eventsLoaded ? (
        <MapContainer
          ref={mapRef}
          {...(events.length > 0
            ? { bounds: L.latLngBounds(events.map(e => [e.lat, e.lng])), boundsOptions: { padding: [60, 60], maxZoom: 15 } }
            : { center: DEFAULT_CENTER, zoom: 14 })}
          style={{ flex: 1, width: '100%', height: '100%' }}
          zoomControl={false}
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
                icon={createMarker(cat, isActive, joinableNow, event.participant_avatars)}
                eventHandlers={{ click: () => handleMarkerClick(event) }}
              />
            )
          })}

          <LocateButton onLocate={() => {}} />
        </MapContainer>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={28} className="spin" color="var(--text-3)" />
        </div>
      )}

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
          {filtered.length} заходів поруч
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
              onClick={() => navigate(`/events/${selectedEvent.id}`)}
            />
          </div>
        </>
      )}
    </div>
  )
}
