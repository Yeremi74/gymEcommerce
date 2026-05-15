import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  productCategoryKeys,
  productSeedLists,
  getProductCategoryKey,
  productDescriptionsById,
} from "../data/content"
import { apiUrl } from "../config/apiBase.js"

const ProductsContext = createContext(null)

function mergeById(seedList, apiList) {
  const map = new Map()
  for (const p of seedList) {
    map.set(p.id, p)
  }
  for (const p of apiList) {
    map.set(p.id, p)
  }
  return Array.from(map.values())
}

function parseCreatedAtMs(product) {
  if (!product || !product.createdAt) return 0
  const t = Date.parse(product.createdAt)
  return Number.isFinite(t) ? t : 0
}

function isAdminUploadedProduct(product) {
  return typeof product?.id === "string" && product.id.includes("-custom-")
}

function normalizeApiPayload(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      trending: [],
      pants: [],
      hoodies: [],
      tees: [],
      shopCategories: [],
      shopCollections: [],
    }
  }
  const shopCategories = Array.isArray(raw.shopCategories) ? raw.shopCategories : []
  const shopCollections = Array.isArray(raw.shopCollections) ? raw.shopCollections : []
  if (Array.isArray(raw.bars) || Array.isArray(raw.powder)) {
    return {
      trending: Array.isArray(raw.bars) ? raw.bars : [],
      pants: [],
      hoodies: Array.isArray(raw.powder) ? raw.powder : [],
      tees: [],
      shopCategories,
      shopCollections,
    }
  }
  return {
    trending: Array.isArray(raw.trending) ? raw.trending : [],
    pants: Array.isArray(raw.pants) ? raw.pants : [],
    hoodies: Array.isArray(raw.hoodies) ? raw.hoodies : [],
    tees: Array.isArray(raw.tees) ? raw.tees : [],
    shopCategories,
    shopCollections,
  }
}

export function ProductsProvider({ children }) {
  const [extra, setExtra] = useState({
    trending: [],
    pants: [],
    hoodies: [],
    tees: [],
    shopCategories: [],
    shopCollections: [],
  })
  const [loaded, setLoaded] = useState(false)

  const refreshProducts = useCallback(() => {
    return fetch(apiUrl("/api/products"))
      .then(async (r) => {
        if (!r.ok) return normalizeApiPayload(null)
        const raw = await r.json().catch(() => null)
        return normalizeApiPayload(raw)
      })
      .then(setExtra)
      .catch(() =>
        setExtra({
          trending: [],
          pants: [],
          hoodies: [],
          tees: [],
          shopCategories: [],
          shopCollections: [],
        }),
      )
  }, [])

  useEffect(() => {
    refreshProducts().finally(() => setLoaded(true))
  }, [refreshProducts])

  const trendingProducts = useMemo(
    () => mergeById(productSeedLists.trending, extra.trending || []),
    [extra],
  )
  const pantsProducts = useMemo(
    () => mergeById(productSeedLists.pants, extra.pants || []),
    [extra],
  )
  const hoodiesProducts = useMemo(
    () => mergeById(productSeedLists.hoodies, extra.hoodies || []),
    [extra],
  )
  const teesProducts = useMemo(
    () => mergeById(productSeedLists.tees, extra.tees || []),
    [extra],
  )

  const listsByCategory = useMemo(
    () => ({
      trending: trendingProducts,
      pants: pantsProducts,
      hoodies: hoodiesProducts,
      tees: teesProducts,
    }),
    [trendingProducts, pantsProducts, hoodiesProducts, teesProducts],
  )

  const shopCategories = useMemo(
    () => (Array.isArray(extra.shopCategories) ? extra.shopCategories : []),
    [extra.shopCategories],
  )

  const shopCollections = useMemo(
    () => (Array.isArray(extra.shopCollections) ? extra.shopCollections : []),
    [extra.shopCollections],
  )

  const allProductsFlat = useMemo(() => {
    const seen = new Map()
    for (const key of productCategoryKeys) {
      const list = listsByCategory[key] || []
      for (const p of list) {
        if (p && p.id && !seen.has(p.id)) seen.set(p.id, p)
      }
    }
    return Array.from(seen.values())
  }, [listsByCategory])

  /** Últimos subidos desde el panel (ids custom); si no hay, orden global por fecha. */
  const recentProductsForLanding = useMemo(() => {
    const admin = allProductsFlat.filter(isAdminUploadedProduct)
    const pool = admin.length > 0 ? admin : allProductsFlat
    return [...pool].sort((a, b) => parseCreatedAtMs(b) - parseCreatedAtMs(a))
  }, [allProductsFlat])

  /** Productos con más unidades vendidas (salidas de inventario en admin). */
  const bestsellerProductsForLanding = useMemo(
    () =>
      [...allProductsFlat]
        .sort((a, b) => (b.unitsSold ?? 0) - (a.unitsSold ?? 0))
        .slice(0, 12),
    [allProductsFlat],
  )

  const getProductById = useCallback(
    (id) => {
      for (const key of productCategoryKeys) {
        const found = listsByCategory[key].find((item) => item.id === id)
        if (found) return found
      }
      return null
    },
    [listsByCategory],
  )

  const getProductDescription = useCallback((productId, product) => {
    if (product && product.description) {
      return product.description
    }
    return productDescriptionsById[productId] ?? null
  }, [])

  const getRelatedProducts = useCallback(
    (productId, limit = 4) => {
      const self = allProductsFlat.find((item) => item.id === productId)
      if (!self) return []
      if (self.categoryId) {
        return allProductsFlat
          .filter((item) => item.id !== productId && item.categoryId === self.categoryId)
          .slice(0, limit)
      }
      const cat = getProductCategoryKey(productId)
      const list = listsByCategory[cat] || []
      if (!list.some((item) => item.id === productId)) {
        return []
      }
      return list.filter((item) => item.id !== productId).slice(0, limit)
    },
    [allProductsFlat, listsByCategory],
  )

  const value = useMemo(
    () => ({
      trendingProducts,
      pantsProducts,
      hoodiesProducts,
      teesProducts,
      shopCategories,
      shopCollections,
      allProductsFlat,
      recentProductsForLanding,
      bestsellerProductsForLanding,
      loaded,
      refreshProducts,
      getProductById,
      getProductDescription,
      getRelatedProducts,
    }),
    [
      trendingProducts,
      pantsProducts,
      hoodiesProducts,
      teesProducts,
      shopCategories,
      shopCollections,
      allProductsFlat,
      recentProductsForLanding,
      bestsellerProductsForLanding,
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
