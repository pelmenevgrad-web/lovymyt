import { createContext, useContext, useEffect, useState } from 'react'
import WebApp from '@twa-dev/sdk'
import { apiFetch } from '../lib/api.js'

const AuthContext = createContext({ user: null, status: 'pending' })

// status: 'pending' (checking) | 'ok' (authenticated) | 'guest' (no Telegram
// context, e.g. opened in a plain browser) | 'error' (backend/verification failed)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    if (!WebApp.initData) {
      setStatus('guest')
      return
    }

    apiFetch('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData: WebApp.initData }),
    })
      .then(({ token, user }) => {
        localStorage.setItem('lovymyt_token', token)
        setUser(user)
        setStatus('ok')
      })
      .catch((err) => {
        console.error('[Auth] Telegram auth failed:', err.message)
        setStatus('error')
      })
  }, [])

  return (
    <AuthContext.Provider value={{ user, status }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
