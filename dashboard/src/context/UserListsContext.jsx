import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import {
  addCartItemsRequest,
  fetchLibrary,
  patchCartItemRequest,
  removeCartItemRequest,
  toggleFavoriteRequest,
} from "../api/userListsApi"
import { useAuth } from "./AuthContext"

const UserListsContext = createContext(null)

export function UserListsProvider({ children }) {
  const { token, user, ready } = useAuth()
  const [favoriteProductIds, setFavoriteProductIds] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [listsLoaded, setListsLoaded] = useState(false)

  const refreshLibrary = useCallback(async () => {
    if (!token) {
      setFavoriteProductIds([])
      setCartItems([])
      setListsLoaded(true)
      return
    }
    try {
      const data = await fetchLibrary(token)
      setFavoriteProductIds(
        Array.isArray(data.favoriteProductIds) ? data.favoriteProductIds : [],
      )
      setCartItems(Array.isArray(data.cartItems) ? data.cartItems : [])
    } catch {
      setFavoriteProductIds([])
      setCartItems([])
    } finally {
      setListsLoaded(true)
    }
  }, [token])

  useEffect(() => {
    if (!ready) return
    if (!token) {
      setFavoriteProductIds([])
      setCartItems([])
      setListsLoaded(true)
      return
    }
    setListsLoaded(false)
    refreshLibrary()
  }, [ready, token, refreshLibrary])

  const isFavorite = useCallback(
    (productId) => favoriteProductIds.includes(productId),
    [favoriteProductIds],
  )

  const toggleFavorite = useCallback(
    async (productId) => {
      if (!token || !user) {
        return { ok: false, needAuth: true }
      }
      try {
        const data = await toggleFavoriteRequest(token, productId)
        setFavoriteProductIds(
          Array.isArray(data.favoriteProductIds) ? data.favoriteProductIds : [],
        )
        return { ok: true, isFavorite: data.isFavorite }
      } catch {
        return { ok: false, needAuth: false }
      }
    },
    [token, user],
  )

  const addToCart = useCallback(
    async (productId, quantity = 1) => {
      if (!token || !user) {
        return { ok: false, needAuth: true }
      }
      try {
        const data = await addCartItemsRequest(token, productId, quantity)
        setCartItems(Array.isArray(data.cartItems) ? data.cartItems : [])
        return { ok: true }
      } catch {
        return { ok: false, needAuth: false }
      }
    },
    [token, user],
  )

  const setCartLineQuantity = useCallback(
    async (productId, quantity) => {
      if (!token || !user) {
        return { ok: false, needAuth: true }
      }
      try {
        const data = await patchCartItemRequest(token, productId, quantity)
        setCartItems(Array.isArray(data.cartItems) ? data.cartItems : [])
        return { ok: true }
      } catch {
        return { ok: false, needAuth: false }
      }
    },
    [token, user],
  )

  const removeFromCart = useCallback(
    async (productId) => {
      if (!token || !user) {
        return { ok: false, needAuth: true }
      }
      try {
        const data = await removeCartItemRequest(token, productId)
        setCartItems(Array.isArray(data.cartItems) ? data.cartItems : [])
        return { ok: true }
      } catch {
        return { ok: false, needAuth: false }
      }
    },
    [token, user],
  )

  const favoriteCount = favoriteProductIds.length
  const cartUnitsTotal = useMemo(
    () => cartItems.reduce((sum, row) => sum + (row.quantity || 0), 0),
    [cartItems],
  )

  const value = useMemo(
    () => ({
      favoriteProductIds,
      cartItems,
      listsLoaded,
      favoriteCount,
      cartUnitsTotal,
      isFavorite,
      toggleFavorite,
      addToCart,
      setCartLineQuantity,
      removeFromCart,
      refreshLibrary,
    }),
    [
      favoriteProductIds,
      cartItems,
      listsLoaded,
      favoriteCount,
      cartUnitsTotal,
      isFavorite,
      toggleFavorite,
      addToCart,
      setCartLineQuantity,
      removeFromCart,
      refreshLibrary,
    ],
  )

  return (
    <UserListsContext.Provider value={value}>{children}</UserListsContext.Provider>
  )
}

export function useUserLists() {
  const ctx = useContext(UserListsContext)
  if (!ctx) {
    throw new Error("useUserLists must be used within UserListsProvider")
  }
  return ctx
}
