import React from 'react'
import ReactDOM from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

const rootEl = document.getElementById('root')

if (!rootEl) {
  document.body.innerHTML = '<div style="padding:20px;color:red;font-family:monospace"><b>#root element not found</b> — check index.html</div>'
  throw new Error('#root not found')
}

try {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  )
} catch (err) {
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
