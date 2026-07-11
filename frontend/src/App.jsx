import { useEffect, useState } from 'react'
import WebApp from '@twa-dev/sdk'

export default function App() {
  const [tgUser, setTgUser] = useState(null)

  useEffect(() => {
    WebApp.ready()
    WebApp.expand()
    setTgUser(WebApp.initDataUnsafe?.user ?? null)
  }, [])

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>ЛовиМить</h1>
      <p>Скелет запущен ✓</p>
      {tgUser && <p>Привет, {tgUser.first_name}!</p>}
    </div>
  )
}
