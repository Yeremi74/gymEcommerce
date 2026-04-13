import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import AppHeader from "../../components/AppHeader/AppHeader"
import { HeartIcon } from "../../components/ProductQuickActions/ProductQuickActions"
import AppFooter from "../../components/AppFooter/AppFooter"
import ProductCard from "../../components/ProductCard/ProductCard"
import { useAuth } from "../../context/AuthContext"
import { useProducts } from "../../context/ProductsContext"
import { useUserLists } from "../../context/UserListsContext"
import { getProductGallery } from "../../data/content"
import { resolveAssetUrl } from "../../config/apiBase.js"
import { formatPriceUsd } from "../../utils/formatPriceUsd.js"
import styles from "./ProductDetailPage.module.css"

export default function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { addToCart, isFavorite, toggleFavorite } = useUserLists()
  const { getProductById, getProductDescription, getRelatedProducts } =
    useProducts()
  const product = productId ? getProductById(productId) : null
  const description = productId
    ? getProductDescription(productId, product)
    : null
  const galleryUrls = product ? getProductGallery(product) : []
  const [quantity, setQuantity] = useState(1)
  const [cartHint, setCartHint] = useState("")
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [mainZoomed, setMainZoomed] = useState(false)
  const [zoomFocus, setZoomFocus] = useState({ x: 50, y: 50 })
  const zoomFocusRef = useRef({ x: 50, y: 50 })
  const mainZoomedRef = useRef(false)
  const zoomFocusRafRef = useRef(0)
  const [cursorInsideFrame, setCursorInsideFrame] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })

  mainZoomedRef.current = mainZoomed

  useEffect(() => {
    return () => {
      if (zoomFocusRafRef.current) {
        window.cancelAnimationFrame(zoomFocusRafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setGalleryIndex(0)
    setMainZoomed(false)
    setZoomFocus({ x: 50, y: 50 })
    zoomFocusRef.current = { x: 50, y: 50 }
  }, [productId])

  useEffect(() => {
    setMainZoomed(false)
    setZoomFocus({ x: 50, y: 50 })
    zoomFocusRef.current = { x: 50, y: 50 }
  }, [galleryIndex])

  const updateZoomFocusFromPoint = (el, clientX, clientY) => {
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const x = Math.min(
      100,
      Math.max(0, ((clientX - rect.left) / rect.width) * 100),
    )
    const y = Math.min(
      100,
      Math.max(0, ((clientY - rect.top) / rect.height) * 100),
    )
    zoomFocusRef.current = { x, y }
    if (!mainZoomedRef.current) return
    if (zoomFocusRafRef.current) {
      window.cancelAnimationFrame(zoomFocusRafRef.current)
    }
    zoomFocusRafRef.current = window.requestAnimationFrame(() => {
      zoomFocusRafRef.current = 0
      setZoomFocus({ ...zoomFocusRef.current })
    })
  }

  const syncFramePointer = (el, clientX, clientY) => {
    const rect = el.getBoundingClientRect()
    setCursorPos({ x: clientX - rect.left, y: clientY - rect.top })
    updateZoomFocusFromPoint(el, clientX, clientY)
  }

  const handleMainFramePointer = (e) => {
    syncFramePointer(e.currentTarget, e.clientX, e.clientY)
  }

  const handleMainFrameTouch = (e) => {
    const t = e.touches[0]
    if (!t) return
    syncFramePointer(e.currentTarget, t.clientX, t.clientY)
  }

  const handleMainFrameMouseEnter = (e) => {
    setCursorInsideFrame(true)
    syncFramePointer(e.currentTarget, e.clientX, e.clientY)
  }

  const handleMainFrameMouseLeave = () => {
    setCursorInsideFrame(false)
  }

  const handleMainFrameTouchStart = (e) => {
    const t = e.touches[0]
    if (!t) return
    setCursorInsideFrame(true)
    syncFramePointer(e.currentTarget, t.clientX, t.clientY)
  }

  const handleMainFrameTouchEnd = () => {
    setCursorInsideFrame(false)
  }

  const handleMainFrameClick = () => {
    setMainZoomed((z) => {
      if (!z) {
        setZoomFocus({ ...zoomFocusRef.current })
      }
      return !z
    })
  }

  const resetCartHintSoon = useCallback(() => {
    window.setTimeout(() => setCartHint(""), 3200)
  }, [])

  const handleFavorite = async () => {
    if (!productId) return
    if (!user) {
      navigate("/login", { state: { from: location.pathname + location.search } })
      return
    }
    const result = await toggleFavorite(productId)
    if (!result.ok) {
      setCartHint("No se pudo actualizar favoritos.")
      resetCartHintSoon()
      return
    }
    setCartHint(result.isFavorite ? "Guardado en favoritos." : "Quitado de favoritos.")
    resetCartHintSoon()
  }

  const handleAddToCart = async () => {
    if (!productId) return
    if (!user) {
      navigate("/login", { state: { from: location.pathname + location.search } })
      return
    }
    const result = await addToCart(productId, quantity)
    if (!result.ok) {
      setCartHint("No se pudo guardar en el carrito.")
      resetCartHintSoon()
      return
    }
    setCartHint(
      `En el carrito: ${quantity} ${quantity === 1 ? "unidad" : "unidades"}`,
    )
    resetCartHintSoon()
  }

  const handleShare = async () => {
    const url = window.location.href
    const title = product.name
    try {
      if (navigator.share) {
        await navigator.share({ title, text: product.name, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCartHint("Enlace copiado al portapapeles.")
      resetCartHintSoon()
    } catch (err) {
      if (err && err.name === "AbortError") {
        return
      }
      try {
        await navigator.clipboard.writeText(url)
        setCartHint("Enlace copiado al portapapeles.")
        resetCartHintSoon()
      } catch {
        setCartHint("No se pudo compartir. Copia la URL manualmente.")
        resetCartHintSoon()
      }
    }
  }

  if (!product || !description) {
    return (
      <div className="page">
        <AppHeader />
        <main className={styles.main}>
          <p className={styles.missing}>Producto no encontrado.</p>
          <Link className={styles.back} to="/">
            Volver al inicio
          </Link>
        </main>
        <AppFooter />
      </div>
    )
  }

  const subtitle =
    "flavor" in product ? product.flavor : "sublabel" in product ? product.sublabel : null
  const isBar = productId.startsWith("b")
  const categoryLabel = isBar ? "Barras proteicas" : "Polvos y botes"
  const categoryHref = isBar ? "/#bars" : "/#powders"
  const related = getRelatedProducts(productId, 4)
  const favoriteActive = productId ? isFavorite(productId) : false

  const specRows = isBar
    ? [
        { label: "Referencia", value: product.id.toUpperCase() },
        { label: "Formato", value: "Barra individual" },
        ...(subtitle ? [{ label: "Sabor / variante", value: subtitle }] : []),
        { label: "Familia", value: "Snack proteico" },
      ]
    : [
        { label: "Referencia", value: product.id.toUpperCase() },
        ...(subtitle ? [{ label: "Presentación", value: subtitle }] : []),
        { label: "Formato", value: "Suplemento en polvo o cápsulas" },
        { label: "Familia", value: "Nutrición deportiva" },
      ]

  return (
    <div className="page">
      <AppHeader />
      <article className={styles.article}>
        <div className={styles.shell}>
          <nav className={styles.breadcrumb} aria-label="Ruta de navegación">
            <Link className={styles.crumb} to="/">
              Inicio
            </Link>
            <span className={styles.crumbSep} aria-hidden>
              /
            </span>
            <Link className={styles.crumb} to={categoryHref}>
              {categoryLabel}
            </Link>
            <span className={styles.crumbSep} aria-hidden>
              /
            </span>
            <span className={styles.crumbCurrent}>{product.name}</span>
          </nav>

          <div className={styles.hero}>
            <div className={styles.gallery}>
              <div
                className={styles.thumbs}
                role="tablist"
                aria-label="Vistas del producto"
              >
                {galleryUrls.map((url, index) => (
                  <button
                    key={`thumb-${index}`}
                    type="button"
                    role="tab"
                    aria-selected={galleryIndex === index}
                    className={
                      galleryIndex === index ? styles.thumbSelected : styles.thumb
                    }
                    onClick={() => setGalleryIndex(index)}
                  >
                    <img src={resolveAssetUrl(url)} alt="" draggable={false} />
                  </button>
                ))}
              </div>
              <div
                className={
                  mainZoomed ? styles.mainFrameZoomed : styles.mainFrame
                }
                onClick={handleMainFrameClick}
                onMouseEnter={handleMainFrameMouseEnter}
                onMouseMove={handleMainFramePointer}
                onMouseLeave={handleMainFrameMouseLeave}
                onTouchStart={handleMainFrameTouchStart}
                onTouchMove={handleMainFrameTouch}
                onTouchEnd={handleMainFrameTouchEnd}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleMainFrameClick()
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={mainZoomed}
                aria-label={
                  mainZoomed
                    ? "Quitar zoom de la imagen"
                    : "Ampliar imagen al hacer clic"
                }
              >
                <img
                  className={mainZoomed ? styles.mainImageZoomed : styles.mainImage}
                  src={resolveAssetUrl(galleryUrls[galleryIndex])}
                  alt={product.name}
                  loading="eager"
                  draggable={false}
                  style={{
                    transformOrigin: `${zoomFocus.x}% ${zoomFocus.y}%`,
                    transform: mainZoomed ? "scale(2)" : "scale(1)",
                  }}
                />
                {cursorInsideFrame ? (
                  <div
                    className={styles.zoomCursor}
                    style={{ left: cursorPos.x, top: cursorPos.y }}
                    aria-hidden
                  >
                    <div
                      className={
                        mainZoomed
                          ? styles.zoomCursorRingMinus
                          : styles.zoomCursorRing
                      }
                    >
                      <span className={styles.zoomCursorH} />
                      <span className={styles.zoomCursorV} />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.meta}>
              <p className={styles.categoryLine}>{categoryLabel}</p>
              {subtitle ? <p className={styles.eyebrow}>{subtitle}</p> : null}
              <h1 className={styles.pageTitle}>{product.name}</h1>
              <p className={styles.price}>{formatPriceUsd(product.price)}</p>

              <div className={styles.buyBox}>
                <div className={styles.quantityRow}>
                  <span className={styles.quantityLabel} id="qty-label">
                    Cantidad
                  </span>
                  <div
                    className={styles.stepper}
                    role="group"
                    aria-labelledby="qty-label"
                  >
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Reducir cantidad"
                    >
                      −
                    </button>
                    <span className={styles.stepperValue} aria-live="polite">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                      aria-label="Aumentar cantidad"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className={styles.buyActionsRow}>
                  <button
                    type="button"
                    className={
                      favoriteActive
                        ? `${styles.btnFavoriteOutline} ${styles.btnFavoriteOutlineOn}`
                        : styles.btnFavoriteOutline
                    }
                    onClick={handleFavorite}
                    aria-pressed={favoriteActive}
                    aria-label={
                      favoriteActive
                        ? "Quitar de favoritos"
                        : "Añadir a favoritos"
                    }
                  >
                    <HeartIcon filled={favoriteActive} />
                  </button>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleAddToCart}
                  >
                    Añadir al carrito
                  </button>
                </div>
                {cartHint ? (
                  <p className={styles.hint} role="status">
                    {cartHint}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <section className={styles.section} aria-labelledby="desc-title">
            <h2 id="desc-title" className={styles.sectionTitle}>
              Descripción
            </h2>
            <p className={styles.description}>{description}</p>
          </section>

          <section className={styles.section} aria-labelledby="ship-title">
            <h2 id="ship-title" className={styles.sectionTitle}>
              Envío y confianza
            </h2>
            <ul className={styles.trustList}>
              <li className={styles.trustItem}>
                <span className={styles.trustLead}>Envío estándar</span>
                <span className={styles.trustText}>
                  Entrega estimada en 24–72 h laborables en península.
                </span>
              </li>
              <li className={styles.trustItem}>
                <span className={styles.trustLead}>Devoluciones</span>
                <span className={styles.trustText}>
                  14 días para cambios o reembolso según condiciones generales.
                </span>
              </li>
              <li className={styles.trustItem}>
                <span className={styles.trustLead}>Pago</span>
                <span className={styles.trustText}>
                  Tarjeta y métodos habituales con proceso cifrado (demo).
                </span>
              </li>
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="spec-title">
            <h2 id="spec-title" className={styles.sectionTitle}>
              Ficha técnica
            </h2>
            <dl className={styles.specs}>
              {specRows.map((row) => (
                <div key={row.label} className={styles.specRow}>
                  <dt className={styles.specLabel}>{row.label}</dt>
                  <dd className={styles.specValue}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className={styles.section} aria-labelledby="legal-title">
            <h2 id="legal-title" className={styles.sectionTitle}>
              Uso e información
            </h2>
            <p className={styles.legal}>
              Los suplementos alimenticios no sustituyen una dieta variada y
              equilibrada ni un estilo de vida saludable. Conservar en lugar
              fresco y seco. Mantener fuera del alcance de los niños. Consulta
              con un profesional de la salud o nutrición si tienes condiciones
              médicas o tomas medicación.
            </p>
            <p className={styles.legalMuted}>
              Alérgenos: puede contener trazas de frutos de cáscara, soja,
              leche y gluten según el lote. Revisa siempre el envase físico
              antes de consumir.
            </p>
          </section>

          {related.length > 0 ? (
            <section className={styles.section} aria-labelledby="related-title">
              <div className={styles.relatedHead}>
                <h2 id="related-title" className={styles.sectionTitle}>
                  También te puede interesar
                </h2>
                <Link className={styles.seeAll} to="/">
                  Ver catálogo
                </Link>
              </div>
              <div className={styles.relatedGrid}>
                {related.map((item) => (
                  <ProductCard
                    key={item.id}
                    productId={item.id}
                    name={item.name}
                    price={item.price}
                    imageUrl={item.imageUrl}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <div className={styles.footerActions}>
            <Link className={styles.backLink} to="/">
              ← Volver al inicio
            </Link>
            <Link className={styles.backLink} to={categoryHref}>
              Más en {categoryLabel.toLowerCase()}
            </Link>
          </div>
        </div>
      </article>
      <AppFooter />
    </div>
  )
}
