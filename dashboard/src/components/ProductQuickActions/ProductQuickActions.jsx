import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useUserLists } from "../../context/UserListsContext"
import styles from "./ProductQuickActions.module.css"

export function HeartIcon({ filled }) {
  const d =
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
  return (
    <svg
      className={styles.svgIcon}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden
    >
      <path
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? "none" : "currentColor"}
        strokeWidth="1.6"
        strokeLinejoin="round"
        d={d}
      />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg
      className={styles.svgIcon}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6h15l-1.5 9h-12z M6 6 5 3H2 M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
      />
    </svg>
  )
}

export default function ProductQuickActions({ productId, variant = "card" }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { isFavorite, toggleFavorite, addToCart } = useUserLists()
  const favorite = isFavorite(productId)

  const goLogin = () => {
    navigate("/login", { state: { from: location.pathname + location.search } })
  }

  const handleFavorite = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      goLogin()
      return
    }
    await toggleFavorite(productId)
  }

  const handleCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      goLogin()
      return
    }
    await addToCart(productId, 1)
  }

  const rootClass =
    variant === "row"
      ? `${styles.root} ${styles.row}`
      : variant === "overlay"
        ? `${styles.root} ${styles.overlay}`
        : styles.root

  return (
    <div className={rootClass} role="group" aria-label="Acciones del producto">
      <button
        type="button"
        className={`${styles.btn} ${favorite ? styles.btnFavoriteOn : ""}`}
        onClick={handleFavorite}
        aria-pressed={favorite}
        aria-label={favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
      >
        <HeartIcon filled={favorite} />
      </button>
      <button
        type="button"
        className={styles.btn}
        onClick={handleCart}
        aria-label="Añadir al carrito"
      >
        <CartIcon />
      </button>
    </div>
  )
}
