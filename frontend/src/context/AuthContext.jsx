import { createContext, useContext, useEffect, useState } from 'react'
import WebApp from '@twa-dev/sdk'
import { apiFetch } from '../lib/api.js'

const AuthContext = createContext({ user: null, status: 'pending', error: null })

// status: 'pending' (checking) | 'ok' (authenticated) | 'guest' (no Telegram
// context, e.g. opened in a plain browser) | 'error' (backend/verification failed)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('pending')
  const [error, setError] = useState(null)

  useEffect(() => {
    async function authenticate() {
      let initData
      try {
        initData = WebApp.initData
      } catch (err) {
        console.error('[Auth] Reading WebApp.initData threw:', err)
        setError(err.message)
        setStatus('error')
        return
      }

      if (!initData) {
        setStatus('guest')
        return
      }

      try {
        const { token, user } = await apiFetch('/auth/telegram', {
          method: 'POST',
          body: JSON.stringify({ initData }),
        })
        localStorage.setItem('lovymyt_token', token)
        setUser(user)
        setStatus('ok')
      } catch (err) {
        console.error('[Auth] Telegram auth failed:', err)
        setError(err.message)
        setStatus('error')
      }
    }

    authenticate()
  }, [])

  return (
    <AuthContext.Provider value={{ user, status, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
