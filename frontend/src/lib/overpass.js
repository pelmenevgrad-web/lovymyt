// Nearby gas stations / shops via Overpass (free, no API key, queries OSM
// data directly) — kept on top of the existing Leaflet+OSM map instead of
// switching map providers just to get POIs.
//
// The public Overpass instances are notoriously flaky, confirmed by hand:
// the main overpass-api.de host and its lz4 mirror reject requests that
// don't carry their own overpass-turbo.eu Referer (406); community mirrors
// like overpass.osm.ch respond fine but turned out to carry an incomplete
// regional dataset (27 fuel stations near Zurich, 0 near Kyiv) — worse
// than an outage, since it looks like a valid empty result instead of a
// clear failure. z.overpass-api.de is the one mirror that both accepts
// requests without a special Referer and actually has full data, so this
// retries *that* mirror a couple of times (transient rate-limit/timeout
// responses on it cleared up on retry during testing) rather than falling
// back to a second host with unverified coverage.
const OVERPASS_URL = 'https://z.overpass-api.de/api/interpreter'
const ATTEMPT_TIMEOUT_MS = 10_000
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 1_500

function buildQuery(lat, lng, radiusMeters) {
  return `[out:json][timeout:15];(
    node["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
    node["shop"~"^(supermarket|convenience|grocery)$"](around:${radiusMeters},${lat},${lng});
  );out center 30;`
}

function shapeElements(elements) {
  return (elements ?? [])
    .map(el => ({
      id: el.id,
      lat: el.lat ?? el.center?.lat,
      lng: el.lon ?? el.center?.lon,
      name: el.tags?.name || (el.tags?.amenity === 'fuel' ? 'Заправка' : 'Магазин'),
      kind: el.tags?.amenity === 'fuel' ? 'fuel' : 'shop',
    }))
    .filter(p => p.lat != null && p.lng != null)
}

async function attempt(query) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS)
  try {
    const res = await fetch(OVERPASS_URL, { method: 'POST', body: 'data=' + encodeURIComponent(query), signal: controller.signal })
    const text = await res.text()
    // Overpass sometimes answers 200 with an XML rate-limit/error body
    // instead of the requested JSON — a successful HTTP status alone isn't
    // enough, the JSON parse itself is the real success check.
    return JSON.parse(text)
  } finally {
    clearTimeout(timer)
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function fetchNearbyPOIs(lat, lng, radiusMeters = 1500) {
  const query = buildQuery(lat, lng, radiusMeters)

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const data = await attempt(query)
      return shapeElements(data.elements)
    } catch {
      if (i < MAX_ATTEMPTS - 1) await sleep(RETRY_DELAY_MS)
    }
  }
  throw new Error('Overpass тимчасово недоступний')
}
