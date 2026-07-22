import { createContext, useContext, useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import { apiFetch } from '../lib/api.js'
import { resolveIcon } from '../lib/icons.js'

// Not a real DB row — a client-side "show everything" pseudo-category used
// by the map/category filters (category_id 0 never exists on a real event).
const ALL_CATEGORY = { id: 0, name: 'Усі', Icon: Flame, icon_name: 'Flame', color: '#6366F1' }

const CategoriesContext = createContext({ categories: [ALL_CATEGORY], reload: () => {} })

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([ALL_CATEGORY])

  function load() {
    apiFetch('/categories')
      .then(({ categories: rows }) => {
        setCategories([
          ALL_CATEGORY,
          ...rows.map(c => ({
            id: c.id, name: c.name, Icon: resolveIcon(c.icon_name),
            icon_name: c.icon_name, color: c.color || '#6366F1',
          })),
        ])
      })
      .catch(err => console.error('[Categories] failed to load:', err.message))
  }

  useEffect(() => { load() }, [])

  return (
    <CategoriesContext.Provider value={{ categories, reload: load }}>
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories() {
  return useContext(CategoriesContext)
}
