import { Link } from "react-router-dom"
import AppHeader from "../../components/AppHeader/AppHeader"
import AppFooter from "../../components/AppFooter/AppFooter"
import FavoriteProductCard from "../../components/FavoriteProductCard/FavoriteProductCard"
import { useAuth } from "../../context/AuthContext"
import { useProducts } from "../../context/ProductsContext"
import { useUserLists } from "../../context/UserListsContext"
import styles from "./FavoritesPage.module.css"

export default function FavoritesPage() {
  const { user } = useAuth()
  const { getProductById } = useProducts()
  const { favoriteProductIds } = useUserLists()

  if (!user) {
    return (
      <div className="page">
        <AppHeader />
        <main className={styles.main}>
          <div className={styles.hero}>
            <h1 className={styles.heroTitle}>Favoritos</h1>
            <p className={styles.heroSubtitle}>
              Guarda productos para compararlos o comprarlos más tarde.
            </p>
          </div>
          <div className={styles.authCard}>
            <div className={styles.authIcon} aria-hidden>
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M24 10.5C21 6 14.5 6 14.5 14C14.5 21 24 30 24 30C24 30 33.5 21 33.5 14C33.5 6 27 6 24 10.5Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className={styles.authHeading}>Inicia sesión</h2>
            <p className={styles.authLead}>
              Tus favoritos se sincronizan con tu cuenta para no perder ninguna
              selección.
            </p>
            <Link className={styles.primaryCta} to="/login" state={{ from: "/favorites" }}>
              Iniciar sesión
            </Link>
            <p className={styles.authHint}>
              ¿No tienes cuenta?{" "}
              <Link className={styles.inlineLink} to="/register">
                Crear cuenta
              </Link>
            </p>
          </div>
        </main>
        <AppFooter />
      </div>
    )
  }

  const rows = favoriteProductIds.map((id) => ({
    id,
    product: getProductById(id),
  }))

  return (
    <div className="page">
      <AppHeader />
      <main className={styles.main}>
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <h1 className={styles.heroTitle}>Favoritos</h1>
            {rows.length > 0 ? (
              <span className={styles.badge}>
                {rows.length} {rows.length === 1 ? "favorito" : "favoritos"}
              </span>
            ) : null}
          </div>
          <p className={styles.heroSubtitle}>
            Tus artículos guardados aparecen aquí. Puedes quitarlos desde cada tarjeta.
          </p>
        </header>

        {rows.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden>
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
                <path
                  d="M32 18C26 18 22 22.5 22 28.5C22 36 32 46 32 46C32 46 42 36 42 28.5C42 22.5 38 18 32 18Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Aún no tienes favoritos</h2>
            <p className={styles.emptyText}>
              Pulsa el corazón en un producto para añadirlo a esta lista.
            </p>
            <Link className={styles.primaryCta} to="/tienda">
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <div className={styles.gridWrap}>
            <div className={styles.grid}>
              {rows.map(({ id, product }) =>
                product ? (
                  <FavoriteProductCard
                    key={id}
                    productId={product.id}
                    name={product.name}
                    price={product.price}
                    imageUrl={product.imageUrl}
                  />
                ) : (
                  <div key={id} className={styles.missingCard}>
                    <p className={styles.missingTitle}>No disponible</p>
                    <p className={styles.missingText}>
                      Este producto ya no está en el catálogo (ID: {id}).
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        <Link className={styles.backLink} to="/">
          ← Volver al inicio
        </Link>
      </main>
      <AppFooter />
    </div>
  )
}
