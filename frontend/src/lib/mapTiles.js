// CARTO's raster basemap tiles now watermark "API KEY REQUIRED" over
// unauthenticated requests past their free anonymous quota — a free key
// (no account needed, https://carto.com/basemaps/apikey/) removes it.
// Falls back to the keyless URL if VITE_CARTO_API_KEY isn't set, same
// watermarked-but-functional behavior as before.
const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY

export function cartoTileUrl(isDark) {
  const style = isDark ? 'dark_all' : 'light_all'
  const key = CARTO_API_KEY ? `?key=${CARTO_API_KEY}` : ''
  return `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png${key}`
}
