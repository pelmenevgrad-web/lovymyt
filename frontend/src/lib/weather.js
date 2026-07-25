// Forecast for one specific event's start time — Open-Meteo, no key needed,
// no anti-bot gating (unlike Overpass, see nearbyPlaces.js). Only covers the
// next 16 days, which is all Open-Meteo's free forecast endpoint gives.
export async function fetchWeatherForecast(lat, lng, isoDatetime) {
  const start = new Date(isoDatetime)
  const now = new Date()
  const daysAhead = (start - now) / 86_400_000
  if (daysAhead < 0 || daysAhead > 16) return null

  try {
    // timezone=UTC (not the default `auto`, which returns the *location's*
    // local time with no offset marker — parsing that with `new Date()`
    // would silently use the *device's* local timezone instead, giving a
    // wrong result for anyone whose phone isn't set to the event's zone).
    // Appending 'Z' below makes every comparison timezone-independent.
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,precipitation_probability&timezone=UTC&forecast_days=16`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const times = data?.hourly?.time
    if (!Array.isArray(times) || times.length === 0) return null

    let closestIdx = 0
    let closestDiff = Infinity
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(new Date(times[i] + 'Z') - start)
      if (diff < closestDiff) { closestDiff = diff; closestIdx = i }
    }

    const temp_c = data.hourly.temperature_2m?.[closestIdx]
    const precip_pct = data.hourly.precipitation_probability?.[closestIdx]
    if (temp_c == null) return null
    return { temp_c: Math.round(temp_c), precip_pct: precip_pct ?? 0 }
  } catch {
    return null
  }
}
