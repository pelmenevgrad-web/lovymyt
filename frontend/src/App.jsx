import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'
import BottomNav from './components/BottomNav.jsx'
import MapScreen from './screens/MapScreen.jsx'
import ProfileScreen from './screens/ProfileScreen.jsx'
import CreateScreen from './screens/CreateScreen.jsx'

export default function App() {
  useEffect(() => {
    WebApp.ready()
    WebApp.expand()
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route path="/"        element={<WithNav><MapScreen /></WithNav>} />
        <Route path="/profile" element={<WithNav><ProfileScreen /></WithNav>} />
        <Route path="/create"  element={<CreateScreen />} />
      </Routes>
    </HashRouter>
  )
}

function WithNav({ children }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}
