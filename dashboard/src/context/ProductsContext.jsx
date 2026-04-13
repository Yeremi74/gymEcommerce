import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { productDescriptionsById } from "../data/content"
import { apiUrl } from "../config/apiBase.js"

const ProductsContext = createContext(null)

export function ProductsProvider({ children }) {
  const [extra, setExtra] = useState({ powder: [], bars: [] })
  const [loaded, setLoaded] = useState(false)

  const refreshProducts = useCallback(() => {
    return fetch(apiUrl("/api/products"))
      .then(async (r) => {
        if (!r.ok) return { powder: [], bars: [] }
        const raw = await r.json().catch(() => null)
        if (!raw || typeof raw !== "object") return { powder: [], bars: [] }
        return {
          powder: Array.isArray(raw.powder) ? raw.powder : [],
          bars: Array.isArray(raw.bars) ? raw.bars : [],
        }
      })
      .then(setExtra)
      .catch(() => setExtra({ powder: [], bars: [] }))
  }, [])

  useEffect(() => {
    refreshProducts().finally(() => setLoaded(true))
  }, [refreshProducts])

  const powderProducts = useMemo(
    () => [...(extra.powder || [])],
    [extra],
  )
  const barProducts = useMemo(
    () => [...(extra.bars || [])],
    [extra],
  )

  const getProductById = useCallback(
    (id) =>
      barProducts.find((item) => item.id === id) ||
      powderProducts.find((item) => item.id === id) ||
      null,
    [barProducts, powderProducts],
  )

  const getProductDescription = useCallback((productId, product) => {
    if (product && product.description) {
      return product.description
    }
    return productDescriptionsById[productId] ?? null
  }, [])

  const getRelatedProducts = useCallback(
    (productId, limit = 4) => {
      const inBars = barProducts.some((item) => item.id === productId)
      const list = inBars ? barProducts : powderProducts
      if (!inBars && !powderProducts.some((item) => item.id === productId)) {
        return []
      }
      return list.filter((item) => item.id !== productId).slice(0, limit)
    },
    [barProducts, powderProducts],
  )

  const value = useMemo(
    () => ({
      powderProducts,
      barProducts,
      loaded,
      refreshProducts,
      getProductById,
      getProductDescription,
      getRelatedProducts,
    }),
    [
      powderProducts,
      barProducts,
      loaded,
      refreshProducts,
      getProductById,
      getProductDescription,
      getRelatedProducts,
    ],
  )

  return (
    <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
  )
}

export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) {
    throw new Error("useProducts must be used within ProductsProvider")
  }
  return ctx
}
