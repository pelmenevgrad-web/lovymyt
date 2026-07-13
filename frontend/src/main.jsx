import React from 'react'
import ReactDOM from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// ─── Діагностика точки запуску ───────────────────────────────────────────────

console.log('[main] script executing')

const rootEl = document.getElementById('root')
console.log('[main] #root found:', !!rootEl)

if (!rootEl) {
  // index.html не має <div id="root"> — дальше йти нема сенсу
  document.body.innerHTML = '<div style="padding:20px;color:red;font-family:monospace"><b>#root element not found</b> — check index.html</div>'
  throw new Error('[main] #root not found — aborting')
}

// ─── Render ───────────────────────────────────────────────────────────────────

console.log('[main] calling ReactDOM.createRoot().render()...')

try {
  ReactDOM.createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  )
  console.log('[main] render() returned — React scheduling is started')
} catch (err) {
  // Синхронне падіння render() — рідкість у React 18, але можливе при
  // неправильному rootEl або якщо сам createRoot кидає.
  console.error('[main] render() threw synchronously:', err.message)
  console.error('[main] stack:', err.stack)

  // Пишемо помилку прямо в DOM — видно навіть без DevTools
  rootEl.innerHTML = `
    <div style="padding:20px;background:#fff1f2;font-family:monospace;color:#7f1d1d;min-height:100vh">
      <div style="font-size:17px;font-weight:700;margin-bottom:12px">💥 ReactDOM.render() crashed</div>
      <div style="background:#fff;border:1.5px solid #fca5a5;border-radius:8px;padding:12px;margin-bottom:12px;font-size:13px;word-break:break-word">
        <b>${err.name}:</b> ${err.message}
      </div>
      <pre style="background:#1e1e1e;color:#f8f8f2;border-radius:8px;padding:12px;font-size:11px;white-space:pre-wrap;word-break:break-all;overflow-x:auto">${err.stack ?? '(no stack)'}</pre>
    </div>
  `
}
