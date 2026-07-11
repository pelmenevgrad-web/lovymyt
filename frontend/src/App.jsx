import { useEffect, useState } from 'react'

export default function App() {
  const [tgUser, setTgUser] = useState(null)

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      setTgUser(tg.initDataUnsafe?.user ?? null)
    }
  }, [])

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>ЛовиМить</h1>
      <p>Скелет запущен ✓</p>
      {tgUser && <p>Привет, {tgUser.first_name}!</p>}
    </div>
  )
}
