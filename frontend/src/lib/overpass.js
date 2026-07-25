// Nearby gas stations / shops via Overpass (free, no API key, queries OSM
// data directly) — kept on top of the existing Leaflet+OSM map instead of
// switching map providers just to get POIs.
//
// The main overpass-api.de host (and its lz4 mirror) reject requests that
// don't come from their own overpass-turbo.eu frontend (406, verified by
// hand) — z.overpass-api.de is a mirror that doesn't have that restriction.
// Overpass also sometimes answers 200 with an XML rate-limit/error body
// instead of the requested JSON, so a successful HTTP status alone isn't
// enough — the JSON parse itself is the real success check.
const OVERPASS_URL = 'https://z.overpass-api.de/api/interpreter'

export async function fetchNearbyPOIs(lat, lng, radiusMeters = 1500) {
  const query = `[out:json][timeout:15];(
    node["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
    node["shop"~"^(supermarket|convenience|grocery)$"](around:${radiusMeters},${lat},${lng});
  );out center 30;`

  const res = await fetch(OVERPASS_URL, { method: 'POST', body: 'data=' + encodeURIComponent(query) })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Overpass тимчасово недоступний')
  }

  return (data.elements ?? [])
    .map(el => ({
      id: el.id,
      lat: el.lat ?? el.center?.lat,
      lng: el.lon ?? el.center?.lon,
      name: el.tags?.name || (el.tags?.amenity === 'fuel' ? 'Заправка' : 'Магазин'),
      kind: el.tags?.amenity === 'fuel' ? 'fuel' : 'shop',
    }))
    .filter(p => p.lat != null && p.lng != null)
}
