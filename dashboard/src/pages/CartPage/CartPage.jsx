import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import AppHeader from "../../components/AppHeader/AppHeader"
import AppFooter from "../../components/AppFooter/AppFooter"
import PaymentMethodsModal from "../../components/PaymentMethodsModal/PaymentMethodsModal"
import { resolveAssetUrl } from "../../config/apiBase.js"
import { useAuth } from "../../context/AuthContext"
import { useProducts } from "../../context/ProductsContext"
import { useUserLists } from "../../context/UserListsContext"
import { formatPriceUsd } from "../../utils/formatPriceUsd.js"
import styles from "./CartPage.module.css"

function parseUsdNumber(raw) {
  if (raw == null) return 0
  const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(n) ? n : 0
}

export default function CartPage() {
  const { user, token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const paymentSuccess = searchParams.get("payment") === "success"
  const { getProductById } = useProducts()
  const { cartItems, setCartLineQuantity, removeFromCart } = useUserLists()

  if (!user) {
    return (
      <div className="page">
        <AppHeader />
        <main className={styles.main}>
          <div className={styles.hero}>
            <h1 className={styles.heroTitle}>Carrito</h1>
            <p className={styles.heroSubtitle}>
              Accede a tu cuenta para revisar artículos y cantidades.
            </p>
          </div>
          <div className={styles.authCard}>
            <div className={styles.authIcon} aria-hidden>
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M14 16V14C14 9.58172 17.5817 6 22 6H26C30.4183 6 34 9.58172 34 14V16"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M8 18H40L38 40H10L8 18Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className={styles.authHeading}>Inicia sesión</h2>
            <p className={styles.authLead}>
              Guardamos tu carrito en la nube para que puedas continuar desde cualquier
              dispositivo.
            </p>
            <Link className={styles.primaryCta} to="/login" state={{ from: "/cart" }}>
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

  const rows = cartItems.map((row) => ({
    ...row,
    product: getProductById(row.productId),
  }))

  const totalUnits = rows.reduce((acc, r) => acc + r.quantity, 0)
  const subtotal = rows.reduce((acc, { product, quantity }) => {
    if (!product) return acc
    return acc + parseUsdNumber(product.price) * quantity
  }, 0)

  const subtotalLabel =
    subtotal > 0 ? formatPriceUsd(subtotal.toFixed(2)) : formatPriceUsd("0")

  return (
    <div className="page">
      <AppHeader />
      <main className={styles.main}>
        {paymentSuccess ? (
          <div className={styles.paymentBanner} role="status">
            <span>Pago recibido correctamente.</span>
            <button
              type="button"
              className={styles.paymentBannerDismiss}
              onClick={() => setSearchParams({}, { replace: true })}
            >
              Entendido
            </button>
          </div>
        ) : null}
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <h1 className={styles.heroTitle}>Carrito</h1>
            {rows.length > 0 ? (
              <span className={styles.badge}>
                {totalUnits} {totalUnits === 1 ? "artículo" : "artículos"}
              </span>
            ) : null}
          </div>
          <p className={styles.heroSubtitle}>
            Revisa cantidades antes de seguir comprando.
          </p>
        </header>

        {rows.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden>
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
                <path
                  d="M20 24H44L42 46H22L20 24Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M24 24V20C24 16.6863 26.6863 14 30 14H34C37.3137 14 40 16.6863 40 20V24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Tu carrito está vacío</h2>
            <p className={styles.emptyText}>
              Explora el catálogo y añade suplementos o snacks cuando quieras.
            </p>
            <Link className={styles.primaryCta} to="/">
              Ver productos
            </Link>
          </div>
        ) : (
          <div className={styles.layout}>
            <ul className={styles.list}>
              {rows.map(({ productId, quantity, product }) => {
                const unit = product ? parseUsdNumber(product.price) : 0
                const lineTotal = unit * quantity
                const lineLabel =
                  product && unit > 0
                    ? formatPriceUsd(lineTotal.toFixed(2))
                    : null
                return (
                  <li key={productId} className={styles.row}>
                    {product ? (
                      <Link className={styles.thumbLink} to={`/products/${productId}`}>
                        <img
                          className={styles.thumb}
                          src={resolveAssetUrl(product.imageUrl)}
                          alt=""
                        />
                      </Link>
                    ) : (
                      <div className={styles.thumbPlaceholder} />
                    )}
                    <div className={styles.rowBody}>
                      <div className={styles.rowTop}>
                        <div className={styles.rowInfo}>
                          {product ? (
                            <Link className={styles.name} to={`/products/${productId}`}>
                              {product.name}
                            </Link>
                          ) : (
                            <span className={styles.nameMuted}>Producto no disponible</span>
                          )}
                          {product ? (
                            <p className={styles.unitPrice}>
                              {formatPriceUsd(product.price)} c/u
                            </p>
                          ) : null}
                        </div>
                        {lineLabel ? (
                          <p className={styles.lineTotal}>{lineLabel}</p>
                        ) : null}
                      </div>
                      <div className={styles.controls}>
                        <div className={styles.stepper} role="group" aria-label="Cantidad">
                          <button
                            type="button"
                            className={styles.stepperBtn}
                            aria-label="Reducir cantidad"
                            onClick={() =>
                              setCartLineQuantity(productId, Math.max(1, quantity - 1))
                            }
                          >
                            −
                          </button>
                          <span className={styles.stepperValue}>{quantity}</span>
                          <button
                            type="button"
                            className={styles.stepperBtn}
                            aria-label="Aumentar cantidad"
                            onClick={() =>
                              setCartLineQuantity(productId, Math.min(99, quantity + 1))
                            }
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className={styles.remove}
                          onClick={() => removeFromCart(productId)}
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            <aside className={styles.summary}>
              <div className={styles.summaryCard}>
                <h2 className={styles.summaryTitle}>Resumen</h2>
                <dl className={styles.summaryRows}>
                  <div className={styles.summaryRow}>
                    <dt>Subtotal</dt>
                    <dd>{subtotalLabel}</dd>
                  </div>
                  <div className={styles.summaryRowMuted}>
                    <dt>Envío</dt>
                    <dd>Se calcula al finalizar</dd>
                  </div>
                </dl>
                <div className={styles.summaryTotal}>
                  <span>Total estimado</span>
                  <strong>{subtotalLabel}</strong>
                </div>
                <div className={styles.summaryActions}>
                  <Link className={styles.secondaryCta} to="/">
                    Seguir comprando
                  </Link>
                  <button
                    type="button"
                    className={styles.payCta}
                    disabled={subtotal < 0.5}
                    title={
                      subtotal < 0.5
                        ? "El importe mínimo para pagar es 0,50 USD"
                        : undefined
                    }
                    onClick={() => setPaymentModalOpen(true)}
                  >
                    Pagar
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}

        {rows.length > 0 ? (
          <Link className={styles.backLink} to="/">
            ← Volver al inicio
          </Link>
        ) : null}
        {rows.length > 0 && token ? (
          <PaymentMethodsModal
            open={paymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            amountUsd={subtotal}
            amountLabel={subtotalLabel}
            token={token}
          />
        ) : null}
      </main>
      <AppFooter />
    </div>
  )
}
