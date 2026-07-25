import { apiFetch } from './api.js'

// Nearby gas stations / shops, proxied through the backend rather than
// calling Overpass directly from the client — kept on top of the existing
// Leaflet+OSM map instead of switching map providers just to get POIs.
//
// Direct-from-browser calls to the public Overpass mirrors turned out to
// be considerably flakier in practice than a quick test suggested
// (intermittent timeouts/rate-limits, one mirror even carrying an
// incomplete regional dataset), and every client hitting Overpass directly
// shares no rate-limit budget with any other. The backend proxy
// (GET /nearby-pois) caches results and retries across mirrors server-side
// instead.
export async function fetchNearbyPOIs(lat, lng, radiusMeters = 1500) {
  const { pois } = await apiFetch(`/nearby-pois?lat=${lat}&lng=${lng}&radius=${radiusMeters}`)
  return pois
}
