import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { clientConfig } from "../../config/clientConfig.js"
import { resolveAssetUrl } from "../../config/apiBase.js"
import { useAuth } from "../../context/AuthContext"
import { useProducts } from "../../context/ProductsContext"
import { useUserLists } from "../../context/UserListsContext"
import { formatPriceUsd } from "../../utils/formatPriceUsd.js"
import styles from "./AppHeader.module.css"

function IconHeart() {
  return (
    <svg className={styles.svg} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
    </svg>
  )
}

function IconCart() {
  return (
    <svg className={styles.svg} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6h15l-1.5 9h-12z M6 6 5 3H2 M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
      />
    </svg>
  )
}

function IconUser() {
  return (
    <svg className={styles.svg} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      />
      <circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg className={styles.svg} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M6 6l12 12M18 6L6 18"
      />
    </svg>
  )
}

function IconSearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.35-4.35"
      />
    </svg>
  )
}

function parseUsdNumber(raw) {
  if (raw == null) return 0
  const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {object} [props]
 * @param {"default" | "landing"} [props.variant]
 * @param {boolean} [props.landingSolid] navbar landing siempre en modo sólido (sin hero)
 */
export default function AppHeader({ variant = "default", landingSolid = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isNuevosShopView =
    location.pathname === "/tienda" && searchParams.get("vista") === "nuevos"
  const isShopCatalogView = location.pathname === "/tienda" && !isNuevosShopView
  const isCollectionsView = location.pathname === "/colecciones"
  const { user, logout } = useAuth()
  const { getProductById, allProductsFlat } = useProducts()
  const {
    favoriteProductIds,
    cartItems,
    favoriteCount,
    cartUnitsTotal,
  } = useUserLists()
  const [panel, setPanel] = useState(null)
  const [landingSearchOpen, setLandingSearchOpen] = useState(false)
  const [landingSearchQuery, setLandingSearchQuery] = useState("")
  const [landingSurface, setLandingSurface] = useState(
    variant === "landing" && landingSolid ? "solid" : "hero",
  )
  const lastScrollY = useRef(0)
  const heroEndY = useRef(520)
  const landingSearchInputRef = useRef(null)
  const landingSearchPanelRef = useRef(null)
  const titleId = useId()
  const panelRegionId = `${titleId}-region`

  const closePanel = useCallback(() => setPanel(null), [])

  useEffect(() => {
    if (variant !== "landing" || landingSolid) return undefined

    const readHeroEnd = () => {
      const hero = document.getElementById("landing-hero")
      if (hero) {
        const rect = hero.getBoundingClientRect()
        heroEndY.current = window.scrollY + rect.bottom - 88
      } else {
        heroEndY.current = Math.min(window.innerHeight * 0.72, 620)
      }
    }

    readHeroEnd()
    lastScrollY.current = window.scrollY

    const onScroll = () => {
      const y = window.scrollY
      const dy = y - lastScrollY.current
      lastScrollY.current = y
      const end = heroEndY.current

      setLandingSurface((prev) => {
        if (y < 20) return "hero"
        if (y >= end) return "solid"
        if (dy < -2) return "solid"
        if (dy > 2) return "hero"
        return prev
      })
    }

    const onResize = () => {
      readHeroEnd()
      onScroll()
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onResize)
    onScroll()
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onResize)
    }
  }, [variant, landingSolid])

  useEffect(() => {
    if (variant === "landing" && landingSolid) {
      setLandingSurface("solid")
    }
  }, [variant, landingSolid])

  const closeLandingSearch = useCallback(() => {
    setLandingSearchOpen(false)
    setLandingSearchQuery("")
  }, [])

  const landingSearchResults = useMemo(() => {
    const q = landingSearchQuery.trim().toLowerCase()
    if (!q) return []
    return allProductsFlat
      .filter((p) => p?.name && String(p.name).toLowerCase().includes(q))
      .slice(0, 6)
  }, [allProductsFlat, landingSearchQuery])

  useEffect(() => {
    if (!landingSearchOpen) return undefined
    const onKey = (e) => {
      if (e.key === "Escape") closeLandingSearch()
    }
    const onPointerDown = (e) => {
      const panel = landingSearchPanelRef.current
      const input = landingSearchInputRef.current
      if (panel?.contains(e.target) || input?.contains(e.target)) return
      if (e.target.closest?.("[data-landing-search-trigger]")) return
      closeLandingSearch()
    }
    window.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointerDown)
    const t = window.setTimeout(() => landingSearchInputRef.current?.focus(), 0)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointerDown)
      window.clearTimeout(t)
    }
  }, [landingSearchOpen, closeLandingSearch])

  useEffect(() => {
    if (!panel) return undefined
    const onKey = (e) => {
      if (e.key === "Escape") closePanel()
    }
    window.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [panel, closePanel])

  const favoriteRows = favoriteProductIds.map((id) => ({
    id,
    product: getProductById(id),
  }))

  const cartRows = cartItems.map((row) => ({
    ...row,
    product: getProductById(row.productId),
  }))

  const cartSubtotal = cartRows.reduce((acc, { product, quantity }) => {
    if (!product) return acc
    return acc + parseUsdNumber(product.price) * quantity
  }, 0)
  const cartSubtotalLabel =
    cartSubtotal > 0 ? formatPriceUsd(cartSubtotal.toFixed(2)) : formatPriceUsd("0")

  const drawer =
    panel != null
      ? createPortal(
          <div className={styles.drawerRoot}>
            <button
              type="button"
              className={styles.backdrop}
              aria-label="Cerrar panel"
              onClick={closePanel}
            />
            <aside
              id={panelRegionId}
              className={styles.drawer}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className={styles.drawerTop}>
                <h2 className={styles.drawerTitle} id={titleId}>
                  {panel === "favorites" ? "Favoritos" : "Carrito"}
                </h2>
                <button
                  type="button"
                  className={styles.drawerClose}
                  onClick={closePanel}
                  aria-label="Cerrar"
                >
                  <IconClose />
                </button>
              </div>

              <div className={styles.drawerBody}>
                {!user ? (
                  <div className={styles.drawerAuth}>
                    <p className={styles.drawerAuthText}>
                      {panel === "favorites"
                        ? "Inicia sesión para ver y guardar favoritos en tu cuenta."
                        : "Inicia sesión para ver tu carrito y continuar la compra."}
                    </p>
                    <Link
                      className={styles.drawerPrimaryCta}
                      to="/login"
                      state={{
                        from: panel === "favorites" ? "/favorites" : "/cart",
                      }}
                      onClick={closePanel}
                    >
                      Iniciar sesión
                    </Link>
                    <Link
                      className={styles.drawerSecondaryCta}
                      to="/register"
                      onClick={closePanel}
                    >
                      Crear cuenta
                    </Link>
                    <Link
                      className={styles.drawerGuestPageLink}
                      to={panel === "favorites" ? "/favorites" : "/cart"}
                      onClick={closePanel}
                    >
                      {panel === "favorites"
                        ? "Ir a la página de favoritos"
                        : "Ir a la página del carrito"}
                    </Link>
                  </div>
                ) : panel === "favorites" ? (
                  favoriteRows.length === 0 ? (
                    <p className={styles.drawerEmpty}>No tienes favoritos aún.</p>
                  ) : (
                    <ul className={styles.drawerList}>
                      {favoriteRows.map(({ id, product }) => (
                        <li key={id} className={styles.drawerRow}>
                          {product ? (
                            <Link
                              className={styles.drawerThumbLink}
                              to={`/products/${id}`}
                              onClick={closePanel}
                            >
                              <img
                                className={styles.drawerThumb}
                                src={resolveAssetUrl(product.imageUrl)}
                                alt=""
                              />
                            </Link>
                          ) : (
                            <div className={styles.drawerThumbPlaceholder} />
                          )}
                          <div className={styles.drawerRowMain}>
                            {product ? (
                              <Link
                                className={styles.drawerRowName}
                                to={`/products/${id}`}
                                onClick={closePanel}
                              >
                                {product.name}
                              </Link>
                            ) : (
                              <span className={styles.drawerRowMuted}>
                                Producto no disponible
                              </span>
                            )}
                            {product ? (
                              <p className={styles.drawerRowMeta}>
                                {formatPriceUsd(product.price)}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )
                ) : cartRows.length === 0 ? (
                  <p className={styles.drawerEmpty}>Tu carrito está vacío.</p>
                ) : (
                  <>
                    <ul className={styles.drawerList}>
                      {cartRows.map(({ productId, quantity, product }) => {
                        const unit = product ? parseUsdNumber(product.price) : 0
                        const line =
                          product && unit > 0
                            ? formatPriceUsd((unit * quantity).toFixed(2))
                            : null
                        return (
                          <li key={productId} className={styles.drawerRow}>
                            {product ? (
                              <Link
                                className={styles.drawerThumbLink}
                                to={`/products/${productId}`}
                                onClick={closePanel}
                              >
                                <img
                                  className={styles.drawerThumb}
                                  src={resolveAssetUrl(product.imageUrl)}
                                  alt=""
                                />
                              </Link>
                            ) : (
                              <div className={styles.drawerThumbPlaceholder} />
                            )}
                            <div className={styles.drawerRowMain}>
                              {product ? (
                                <Link
                                  className={styles.drawerRowName}
                                  to={`/products/${productId}`}
                                  onClick={closePanel}
                                >
                                  {product.name}
                                </Link>
                              ) : (
                                <span className={styles.drawerRowMuted}>
                                  Producto no disponible
                                </span>
                              )}
                              <p className={styles.drawerRowMeta}>
                                {quantity}{" "}
                                {quantity === 1 ? "unidad" : "unidades"}
                                {line ? ` · ${line}` : ""}
                              </p>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                    <div className={styles.drawerSummary}>
                      <span>Subtotal</span>
                      <strong>{cartSubtotalLabel}</strong>
                    </div>
                  </>
                )}
              </div>

              {user ? (
                <div className={styles.drawerFooter}>
                  {panel === "favorites" ? (
                    <Link
                      className={styles.drawerFooterPrimary}
                      to="/favorites"
                      onClick={closePanel}
                    >
                      Ver todos los favoritos
                    </Link>
                  ) : (
                    <>
                      <Link
                        className={styles.drawerFooterPrimary}
                        to="/cart"
                        onClick={closePanel}
                      >
                        Proceder al pago
                      </Link>
                      <Link
                        className={styles.drawerFooterGhost}
                        to="/cart"
                        onClick={closePanel}
                      >
                        Ver carrito completo
                      </Link>
                    </>
                  )}
                </div>
              ) : null}
            </aside>
          </div>,
          document.body,
        )
      : null

  const profileControl = user ? (
    <details className={styles.profile}>
      <summary className={styles.iconBtn} aria-label="Perfil">
        <IconUser />
      </summary>
      <div className={styles.profileMenu}>
        <p className={styles.profileEmail} title={user.email}>
          {user.name}
        </p>
        <button className={styles.profileLogout} type="button" onClick={() => logout()}>
          Salir
        </button>
      </div>
    </details>
  ) : (
    <Link className={styles.iconBtn} to="/login" aria-label="Iniciar sesión">
      <IconUser />
    </Link>
  )

  const favoritesBtn = (
    <button
      type="button"
      className={styles.iconBtn}
      aria-label="Favoritos"
      aria-expanded={panel === "favorites"}
      aria-controls={panel === "favorites" ? panelRegionId : undefined}
      onClick={() => setPanel((p) => (p === "favorites" ? null : "favorites"))}
    >
      <IconHeart />
      {favoriteCount > 0 ? <span className={styles.badge}>{favoriteCount}</span> : null}
    </button>
  )

  const cartBtn = (
    <button
      type="button"
      className={styles.iconBtn}
      aria-label="Carrito"
      aria-expanded={panel === "cart"}
      aria-controls={panel === "cart" ? panelRegionId : undefined}
      onClick={() => setPanel((p) => (p === "cart" ? null : "cart"))}
    >
      <IconCart />
      {cartUnitsTotal > 0 ? <span className={styles.badge}>{cartUnitsTotal}</span> : null}
    </button>
  )

  const onLandingSearch = (e) => {
    e.preventDefault()
    const first = landingSearchResults[0]
    if (first) {
      navigate(`/products/${first.id}`)
      closeLandingSearch()
      return
    }
    navigate("/tienda")
  }

  const toggleLandingSearch = () => {
    setLandingSearchOpen((open) => {
      if (open) {
        setLandingSearchQuery("")
        return false
      }
      return true
    })
  }

  const resolvedLandingSurface = landingSolid ? "solid" : landingSurface

  const headerSurfaceClass =
    variant === "landing"
      ? resolvedLandingSurface === "hero"
        ? styles.rootLandingHero
        : styles.rootLandingSolid
      : styles.surfaceDefault

  return (
    <header
      className={`${styles.root} ${variant === "landing" ? styles.landingDocked : ""} ${headerSurfaceClass} ${variant === "landing" && landingSearchOpen ? styles.landingSearchActive : ""}`}
    >
      {drawer}
      {variant === "landing" ? (
        <div className={styles.landingShell}>
          <div className={styles.innerLanding}>
          <Link to="/" className={styles.logo}>
            {clientConfig.logoUrl?.trim() ? (
              <img
                className={styles.logoImg}
                src={clientConfig.logoUrl.trim()}
                alt=""
                width={28}
                height={28}
                decoding="async"
              />
            ) : null}
            <span className={styles.logoText}>{clientConfig.siteName}</span>
          </Link>
          <nav className={styles.navLinks} aria-label="Secciones">
            <Link
              className={`${styles.navLink} ${isShopCatalogView ? styles.navLinkActive : ""}`}
              to="/tienda"
              aria-current={isShopCatalogView ? "page" : undefined}
            >
              Tienda
            </Link>
            <Link
              className={`${styles.navLink} ${isCollectionsView ? styles.navLinkActive : ""}`}
              to="/colecciones"
              aria-current={isCollectionsView ? "page" : undefined}
            >
              Colecciones
            </Link>
            <Link
              className={`${styles.navLink} ${isNuevosShopView ? styles.navLinkActive : ""}`}
              to="/tienda?vista=nuevos"
              aria-current={isNuevosShopView ? "page" : undefined}
            >
              Nuevos
            </Link>
          </nav>
          <button
            type="button"
            className={styles.searchTrigger}
            data-landing-search-trigger
            aria-expanded={landingSearchOpen}
            aria-controls={landingSearchOpen ? `${titleId}-landing-search` : undefined}
            onClick={toggleLandingSearch}
          >
            <span className={styles.searchTriggerLabel}>Buscar</span>
            {!landingSearchOpen ? (
              <span className={styles.searchTriggerCursor} aria-hidden />
            ) : null}
          </button>
          <nav className={styles.navActions} aria-label="Cuenta y listas">
            {profileControl}
            {favoritesBtn}
            {cartBtn}
          </nav>
          </div>

          {landingSearchOpen ? (
            <div
              ref={landingSearchPanelRef}
              id={`${titleId}-landing-search`}
              className={styles.landingSearchPanel}
              role="search"
            >
              <form className={styles.landingSearchForm} onSubmit={onLandingSearch}>
                <div className={styles.landingSearchFieldWrap}>
                  <span className={styles.searchIcon}>
                    <IconSearchGlyph />
                  </span>
                  <input
                    ref={landingSearchInputRef}
                    className={styles.landingSearchInput}
                    type="search"
                    name="q"
                    value={landingSearchQuery}
                    onChange={(e) => setLandingSearchQuery(e.target.value)}
                    placeholder="Buscar productos"
                    aria-label="Buscar productos"
                    autoComplete="off"
                  />
                </div>
              </form>

              {landingSearchQuery.trim() ? (
                <div className={styles.landingSearchResults}>
                  {landingSearchResults.length === 0 ? (
                    <p className={styles.landingSearchEmpty}>Sin resultados</p>
                  ) : (
                    <ul className={styles.landingSearchList}>
                      {landingSearchResults.map((product) => (
                        <li key={product.id}>
                          <Link
                            className={styles.landingSearchResult}
                            to={`/products/${product.id}`}
                            onClick={closeLandingSearch}
                          >
                            {product.imageUrl ? (
                              <img
                                className={styles.landingSearchThumb}
                                src={resolveAssetUrl(product.imageUrl)}
                                alt=""
                                width={40}
                                height={40}
                              />
                            ) : (
                              <span className={styles.landingSearchThumbPlaceholder} />
                            )}
                            <span className={styles.landingSearchResultText}>
                              <span className={styles.landingSearchResultName}>
                                {product.name}
                              </span>
                              <span className={styles.landingSearchResultPrice}>
                                {formatPriceUsd(product.price)}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.inner}>
          <Link to="/" className={styles.logo}>
            {clientConfig.logoUrl?.trim() ? (
              <img
                className={styles.logoImg}
                src={clientConfig.logoUrl.trim()}
                alt=""
                width={28}
                height={28}
                decoding="async"
              />
            ) : null}
            <span className={styles.logoText}>{clientConfig.siteName}</span>
          </Link>
          <nav className={styles.nav} aria-label="Principal">
            {favoritesBtn}
            {cartBtn}
            {profileControl}
          </nav>
        </div>
      )}
    </header>
  )
}
