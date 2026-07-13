import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import BottomNav from './components/BottomNav.jsx'
import MapScreen from './screens/MapScreen.jsx'
import ProfileScreen from './screens/ProfileScreen.jsx'
import CreateScreen from './screens/CreateScreen.jsx'

// ── Visible init-debug overlay ───────────────────────────────────────────────
// Rendered instead of the real app while initialization is in progress.
// If the app is stuck at any step, this screen stays visible — no blank page.

const STEP_LABELS = {
  mounting:   'Монтування React…',
  tg_check:   'Перевірка Telegram WebApp…',
  tg_ready:   'Виклик WebApp.ready()…',
  done:       'Готово — рендер застосунку',
  failed:     'Ініціалізація провалилась',
}

function Row({ ok, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>
      <span style={{ flexShrink: 0, fontSize: 15 }}>{ok ? '✅' : '❌'}</span>
      <span style={{ color: '#475569', minWidth: 180 }}>{label}</span>
      <span style={{ color: '#0f172a', fontWeight: 600, wordBreak: 'break-all' }}>{String(value)}</span>
    </div>
  )
}

function InitDebug({ step, info, error }) {
  const failed = step === 'failed'
  return (
    <div style={{
      padding: 20, fontFamily: '-apple-system, sans-serif',
      background: failed ? '#fff1f2' : '#f8fafc',
      minHeight: 'var(--full-h)', color: '#0f172a',
    }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
        {failed ? '💥 Помилка ініціалізації' : '⏳ Ініціалізація…'}
      </div>
      <div style={{
        display: 'inline-block', padding: '3px 10px', borderRadius: 999,
        background: failed ? '#fee2e2' : '#e0e7ff',
        color: failed ? '#dc2626' : '#4f46e5',
        fontSize: 12, fontWeight: 700, marginBottom: 16,
      }}>
        {STEP_LABELS[step] ?? step}
      </div>

      {error && (
        <div style={{
          background: '#fff', border: '1.5px solid #fca5a5',
          borderRadius: 10, padding: 12, marginBottom: 16,
          fontSize: 13, color: '#b91c1c', wordBreak: 'break-word',
        }}>
          <strong>Помилка:</strong> {error}
        </div>
      )}

      {info && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '4px 14px', boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
          <Row ok={info.windowTelegram}   label="window.Telegram"        value={info.windowTelegram ? 'є' : 'відсутній'} />
          <Row ok={info.webApp}           label="window.Telegram.WebApp" value={info.webApp ? 'є' : 'відсутній'} />
          <Row ok={info.platform !== 'unknown'} label="Platform"         value={info.platform} />
          <Row ok={info.initDataLength > 0}    label="initData довжина"  value={info.initDataLength} />
          <Row ok={info.hasUser}          label="initDataUnsafe.user"    value={info.hasUser ? `є (id: ${info.userId})` : 'відсутній'} />
          <Row ok={info.hasUser}          label="Ім'я користувача"       value={info.userName ?? '—'} />
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
        Цей екран показується замість порожньої сторінки під час ініціалізації.<br />
        Якщо він не зникає — значить застосунок завис на кроці вище.
      </div>
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep]           = useState('mounting')
  const [tgInfo, setTgInfo]       = useState(null)
  const [initError, setInitError] = useState(null)

  useEffect(() => {
    setStep('tg_check')

    try {
      const info = {
        windowTelegram:  !!window?.Telegram,
        webApp:          !!window?.Telegram?.WebApp,
        platform:        WebApp.platform || 'unknown',
        initDataLength:  WebApp.initData?.length ?? 0,
        hasUser:         !!WebApp.initDataUnsafe?.user,
        userId:          WebApp.initDataUnsafe?.user?.id ?? null,
        userName:        WebApp.initDataUnsafe?.user?.first_name ?? null,
      }
      setTgInfo(info)
      setStep('tg_ready')
    } catch (err) {
      setInitError('Крок збору info: ' + err.message)
      setStep('failed')
      return
    }

    try {
      WebApp.ready()
      WebApp.expand()
    } catch (err) {
      setInitError('Крок WebApp.ready/expand: ' + err.message)
      setStep('failed')
      return
    }

    setStep('done')
  }, [])

  if (step !== 'done') {
    return <InitDebug step={step} info={tgInfo} error={initError} />
  }

  // TODO: повернути HashRouter після підтвердження що step досягає 'done'
  return <InitDebug step="done — ось тут мав би бути HashRouter" info={tgInfo} error={null} />
}

function WithNav({ children }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}
