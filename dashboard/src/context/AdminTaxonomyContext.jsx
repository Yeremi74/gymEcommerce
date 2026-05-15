import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { apiUrl } from "../config/apiBase.js"
import { useAuth } from "./AuthContext"

const AdminTaxonomyContext = createContext(null)

export function AdminTaxonomyProvider({ children }) {
  const { token, user, ready } = useAuth()
  const [categories, setCategories] = useState([])
  const [collections, setCollections] = useState([])
  const [taxonomyLoading, setTaxonomyLoading] = useState(false)

  const reloadTaxonomy = useCallback(async () => {
    if (!token || user?.isMainAdmin !== true) return
    setTaxonomyLoading(true)
    try {
      const [rc, rcol] = await Promise.all([
        fetch(apiUrl("/api/admin/categories"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(apiUrl("/api/admin/collections"), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
      const jc = await rc.json().catch(() => ({}))
      const jcol = await rcol.json().catch(() => ({}))
      if (rc.ok) {
        setCategories(Array.isArray(jc.categories) ? jc.categories : [])
      } else {
        setCategories([])
      }
      if (rcol.ok) {
        setCollections(Array.isArray(jcol.collections) ? jcol.collections : [])
      } else {
        setCollections([])
      }
    } catch {
      setCategories([])
      setCollections([])
    } finally {
      setTaxonomyLoading(false)
    }
  }, [token, user?.isMainAdmin])

  useEffect(() => {
    if (!ready || user?.isMainAdmin !== true || !token) return
    reloadTaxonomy()
  }, [ready, user?.isMainAdmin, token, reloadTaxonomy])

  const value = useMemo(
    () => ({
      categories,
      collections,
      taxonomyLoading,
      reloadTaxonomy,
    }),
    [categories, collections, taxonomyLoading, reloadTaxonomy],
  )

  return (
    <AdminTaxonomyContext.Provider value={value}>
      {children}
    </AdminTaxonomyContext.Provider>
  )
}

export function useAdminTaxonomy() {
  const ctx = useContext(AdminTaxonomyContext)
  if (!ctx) {
    throw new Error("useAdminTaxonomy must be used within AdminTaxonomyProvider")
  }
  return ctx
}
