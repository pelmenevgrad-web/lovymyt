// Nearby gas stations / supermarkets as a text list (name, distance,
// address) — via Nominatim's `[key=value]` structured tag search, the same
// service this app already relies on for address autocomplete/reverse
// geocoding. Deliberately not Overpass: that public API proved unreliable
// across every client/mirror tried (see git history on this file's
// predecessor, lib/overpass.js), while Nominatim has been solid all along.
const CATEGORIES = [
  { tag: 'amenity=fuel', kind: 'fuel', fallbackName: 'Заправка' },
  { tag: 'shop=supermarket', kind: 'shop', fallbackName: 'Магазин' },
]

// Nominatim's usage policy caps requests at 1/second — the two category
// queries below run sequentially with a gap, not in parallel.
const REQUEST_GAP_MS = 1100

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

// left,top,right,bottom in lon/lat, matching Nominatim's viewbox param
function boundingBox(lat, lng, radiusMeters) {
  const dLat = radiusMeters / 111_320
  const dLng = radiusMeters / (111_320 * Math.cos(lat * Math.PI / 180))
  return `${lng - dLng},${lat + dLat},${lng + dLng},${lat - dLat}`
}

function formatShortAddress(address, fallback) {
  if (!address) return fallback
  const locality = address.city ?? address.town ?? address.village ?? address.suburb ?? ''
  const streetPart = [address.road, address.house_number].filter(Boolean).join(' ')
  const parts = [locality, streetPart].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : fallback
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function fetchNearbyPlaces(lat, lng, radiusMeters = 2000) {
  const viewbox = boundingBox(lat, lng, radiusMeters)
  const results = []

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i]
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`[${cat.tag}]`)}&format=json&addressdetails=1&viewbox=${viewbox}&bounded=1&limit=15`
      const res = await fetch(url)
      const data = await res.json()
      for (const item of Array.isArray(data) ? data : []) {
        const itemLat = Number(item.lat)
        const itemLng = Number(item.lon)
        results.push({
          id: item.place_id,
          name: item.name || cat.fallbackName,
          kind: cat.kind,
          lat: itemLat,
          lng: itemLng,
          address: formatShortAddress(item.address, item.display_name),
          distance_km: Math.round(haversineKm(lat, lng, itemLat, itemLng) * 10) / 10,
        })
      }
    } catch {
      // skip this category, keep whatever the other one found
    }
    if (i < CATEGORIES.length - 1) await sleep(REQUEST_GAP_MS)
  }

  return results.sort((a, b) => a.distance_km - b.distance_km)
}
