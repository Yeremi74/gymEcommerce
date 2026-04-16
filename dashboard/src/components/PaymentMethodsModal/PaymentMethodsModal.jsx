import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { apiUrl } from "../../config/apiBase.js"
import styles from "./PaymentMethodsModal.module.css"

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? ""
const stripePromise = publishableKey ? loadStripe(publishableKey) : null

function IconLock() {
  return (
    <svg className={styles.headerIcon} viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path
        fill="currentColor"
        d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm3 8H9V6a3 3 0 1 1 6 0v3z"
      />
    </svg>
  )
}

function IconCard() {
  return (
    <svg className={styles.sectionIcon} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M20 4H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"
      />
    </svg>
  )
}

function LoadingSkeleton() {
  return (
    <div className={styles.skeletonWrap} aria-hidden>
      <div className={styles.skeletonLine} style={{ width: "100%" }} />
      <div className={styles.skeletonRow}>
        <div className={styles.skeletonLine} style={{ width: "48%" }} />
        <div className={styles.skeletonLine} style={{ width: "48%" }} />
      </div>
      <div className={styles.skeletonLine} style={{ width: "55%" }} />
    </div>
  )
}

function FooterTrust() {
  return (
    <p className={styles.footerTrust}>
      <svg
        className={styles.footerLockIcon}
        viewBox="0 0 24 24"
        width="16"
        height="16"
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm3 8H9V6a3 3 0 1 1 6 0v3z"
        />
      </svg>
      <span>
        Conexión cifrada. Los datos los procesa Stripe; no almacenamos tu tarjeta completa.
      </span>
    </p>
  )
}

/** Vista previa del formulario (sin Stripe activo): misma maquetación que el flujo real. */
function MockPaymentForm({ amountLabel, footnote }) {
  return (
    <div className={styles.form}>
      <div className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <IconCard />
          <span>Información de pago</span>
        </div>
        <p className={styles.sectionHint}>
          Tarjeta, Apple Pay u otros métodos según tu dispositivo y región.
        </p>
        <div
          className={`${styles.paymentShell} ${styles.mockShell}`}
          role="presentation"
          aria-hidden
        >
          <div className={styles.mockField}>
            <span className={styles.mockFieldLabel}>Número de tarjeta</span>
            <div className={styles.mockInput}>1234 5678 9012 3456</div>
          </div>
          <div className={styles.mockRow}>
            <div className={styles.mockField}>
              <span className={styles.mockFieldLabel}>Caducidad</span>
              <div className={styles.mockInput}>MM / AA</div>
            </div>
            <div className={styles.mockField}>
              <span className={styles.mockFieldLabel}>CVC</span>
              <div className={styles.mockInput}>123</div>
            </div>
          </div>
          <div className={styles.mockField}>
            <span className={styles.mockFieldLabel}>Titular</span>
            <div className={styles.mockInput}>Nombre como en la tarjeta</div>
          </div>
        </div>
        {footnote ? <p className={styles.mockFootnote}>{footnote}</p> : null}
      </div>
      <button
        type="button"
        className={styles.submit}
        disabled
        title="Configura las claves de Stripe para habilitar el cobro"
      >
        Pagar {amountLabel}
      </button>
      <FooterTrust />
    </div>
  )
}

function CheckoutForm({ amountLabel, onClose }) {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setBusy(true)
    setMessage("")
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/cart?payment=success`,
      },
    })
    setBusy(false)
    if (error) {
      setMessage(error.message ?? "No se pudo completar el pago.")
      return
    }
    if (paymentIntent?.status === "succeeded") {
      onClose()
      navigate("/cart?payment=success", { replace: true })
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <IconCard />
          <span>Información de pago</span>
        </div>
        <p className={styles.sectionHint}>
          Tarjeta, Apple Pay u otros métodos según tu dispositivo y región.
        </p>
        <div className={styles.paymentShell}>
          <PaymentElement />
        </div>
      </div>
      {message ? (
        <div className={styles.alertErr} role="alert">
          {message}
        </div>
      ) : null}
      <button type="submit" className={styles.submit} disabled={!stripe || busy}>
        {busy ? (
          <span className={styles.submitInner}>
            <span className={styles.spinner} aria-hidden />
            Procesando pago…
          </span>
        ) : (
          <>Pagar {amountLabel}</>
        )}
      </button>
      <FooterTrust />
    </form>
  )
}

export default function PaymentMethodsModal({
  open,
  onClose,
  amountUsd,
  amountLabel,
  token,
}) {
  const [clientSecret, setClientSecret] = useState(null)
  const [loadError, setLoadError] = useState("")
  const [loading, setLoading] = useState(false)

  const hasStripeKeys = Boolean(publishableKey && stripePromise)

  useEffect(() => {
    if (!open) {
      setClientSecret(null)
      setLoadError("")
      return
    }
    if (!hasStripeKeys) {
      setLoading(false)
      setLoadError("")
      setClientSecret(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError("")
    setClientSecret(null)
    fetch(apiUrl("/api/payments/create-payment-intent"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: amountUsd }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          throw new Error(data.error || "No se pudo preparar el pago")
        }
        if (!data.clientSecret) {
          throw new Error("Respuesta inválida del servidor")
        }
        if (!cancelled) setClientSecret(data.clientSecret)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "Error")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, amountUsd, token, hasStripeKeys])

  if (!open) return null

  const content = (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-methods-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalInner}>
          <div className={styles.header}>
            <div className={styles.headerMain}>
              <div className={styles.headerBadge}>
                <IconLock />
              </div>
              <div>
                <h2 id="payment-methods-title" className={styles.title}>
                  Pago seguro
                </h2>
                <p className={styles.subtitle}>
                  Completa los datos para finalizar tu pedido.
                </p>
              </div>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              aria-label="Cerrar"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <div className={styles.amountCard}>
            <span className={styles.amountLabel}>Total a pagar</span>
            <span className={styles.amountValue}>{amountLabel}</span>
            <span className={styles.amountMeta}>USD · impuestos y envío según corresponda</span>
          </div>

          {!hasStripeKeys ? (
            <>
              {/* <div className={styles.panelMuted}>
                <p className={styles.panelTitle}>Configuración pendiente</p>
                <p className={styles.errText}>
                  Añade <code className={styles.code}>VITE_STRIPE_PUBLISHABLE_KEY</code> en el front
                  y <code className={styles.code}>STRIPE_SECRET_KEY</code> en el servidor para activar
                  el cobro real.
                </p>
              </div> */}
              <MockPaymentForm
                amountLabel={amountLabel}
                footnote="Vista previa: al configurar Stripe, estos campos serán el formulario real de Stripe."
              />
            </>
          ) : loading ? (
            <div className={styles.formSection}>
              <div className={styles.sectionHeading}>
                <IconCard />
                <span>Información de pago</span>
              </div>
              <p className={styles.loadingText}>Preparando formulario seguro…</p>
              <LoadingSkeleton />
            </div>
          ) : loadError ? (
            <>
              <div className={styles.panelErr}>
                <p className={styles.panelErrTitle}>No se pudo iniciar el pago</p>
                <p className={styles.errText}>{loadError}</p>
              </div>
              <MockPaymentForm
                amountLabel={amountLabel}
                footnote="Revisa las claves del servidor y vuelve a abrir el modal. Vista previa del formulario."
              />
            </>
          ) : clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    borderRadius: "10px",
                    fontFamily:
                      "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
                    spacingUnit: "3px",
                  },
                },
              }}
            >
              <CheckoutForm amountLabel={amountLabel} onClose={onClose} />
            </Elements>
          ) : (
            <>
              <div className={styles.panelErr}>
                <p className={styles.errText}>No se pudo cargar el formulario de pago.</p>
              </div>
              <MockPaymentForm amountLabel={amountLabel} />
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
