import { useState, useEffect } from 'react'
import { CloudRain, Cloud, Sun } from 'lucide-react'
import { fetchWeatherForecast } from '../lib/weather.js'

export default function WeatherBadge({ lat, lng, startTime }) {
  const [forecast, setForecast] = useState(null)

  useEffect(() => {
    let cancelled = false
    setForecast(null)
    fetchWeatherForecast(lat, lng, startTime).then(data => {
      if (!cancelled) setForecast(data)
    })
    return () => { cancelled = true }
  }, [lat, lng, startTime])

  if (!forecast) return null

  const { temp_c, precip_pct } = forecast
  const Icon = precip_pct >= 50 ? CloudRain : precip_pct >= 20 ? Cloud : Sun
  const color = precip_pct >= 50 ? 'var(--red)' : precip_pct >= 20 ? 'var(--text-2)' : 'var(--orange)'

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color }}>
      <Icon size={14} /> {temp_c}° {precip_pct >= 50 ? `· ${precip_pct}% дощ` : ''}
    </span>
  )
}
