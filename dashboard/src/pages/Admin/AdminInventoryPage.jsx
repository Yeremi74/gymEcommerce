import { useCallback, useEffect, useMemo, useState } from "react"
import DropdownSelect from "../../components/DropdownSelect/DropdownSelect"
import { useAuth } from "../../context/AuthContext"
import { apiUrl, resolveAssetUrl } from "../../config/apiBase.js"
import { normalizeSizeKey } from "../../utils/parseSizes.js"
import adminStyles from "../AdminPage/AdminPage.module.css"
import styles from "../InventoryPage/InventoryPage.module.css"

const movementKindOptions = [
  { value: "in", label: "Entrada" },
  { value: "out", label: "Salida" },
]

const kindLabels = {
  in: "Entrada",
  out: "Salida",
  set: "Ajuste",
}

function formatDate(iso) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("es", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function formatStockBySize(stockBySize) {
  if (!stockBySize || typeof stockBySize !== "object") return null
  const entries = Object.entries(stockBySize).filter(
    ([, qty]) => Number.isFinite(qty) && qty > 0,
  )
  if (entries.length === 0) return null
  return entries.map(([size, qty]) => `${size}: ${qty}`).join(" · ")
}

function formatMovementSizes(m) {
  if (Array.isArray(m.sizeLines) && m.sizeLines.length > 0) {
    const prefix = m.kind === "out" ? "−" : m.kind === "in" ? "+" : ""
    return m.sizeLines.map((line) => `${line.size} ${prefix}${line.amount}`).join(", ")
  }
  return String(m.amount ?? "—")
}

function emptySizeQty(sizes) {
  const next = {}
  for (const size of sizes) {
    next[size] = ""
  }
  return next
}

export default function AdminInventoryPage() {
  const { token } = useAuth()
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState("")

  const [tab, setTab] = useState("stock")

  const [productId, setProductId] = useState("")
  const [movKind, setMovKind] = useState("in")
  const [amount, setAmount] = useState("")
  const [sizeQty, setSizeQty] = useState({})
  const [note, setNote] = useState("")
  const [formStatus, setFormStatus] = useState("")
  const [formSubmitting, setFormSubmitting] = useState(false)

  const [historyFilterId, setHistoryFilterId] = useState("")
  const [movements, setMovements] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState("")

  const loadProducts = useCallback(async () => {
    setProductsLoading(true)
    setProductsError("")
    try {
      const res = await fetch(apiUrl("/api/admin/products"), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setProductsError(data.error || "No se pudieron cargar los productos.")
        setProducts([])
        return
      }
      const list = Array.isArray(data.products) ? data.products : []
      setProducts(list)
    } catch {
      setProductsError("Error de red al cargar productos.")
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }, [token])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError("")
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (historyFilterId) {
        params.set("productId", historyFilterId)
      }
      const res = await fetch(
        apiUrl(`/api/admin/inventory/movements?${params.toString()}`),
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setHistoryError(data.error || "No se pudo cargar el historial.")
        setMovements([])
        return
      }
      setMovements(Array.isArray(data.movements) ? data.movements : [])
    } catch {
      setHistoryError("Error de red al cargar el historial.")
      setMovements([])
    } finally {
      setHistoryLoading(false)
    }
  }, [token, historyFilterId])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    if (products.length === 0) return
    if (!productId || !products.some((p) => p.id === productId)) {
      setProductId(products[0].id)
    }
  }, [products, productId])

  useEffect(() => {
    if (tab === "history") {
      loadHistory()
    }
  }, [tab, loadHistory])

  const productById = useMemo(() => {
    const map = new Map()
    for (const p of products) {
      map.set(p.id, p)
    }
    return map
  }, [products])

  const productOptions = useMemo(
    () => [
      { value: "", label: "Todos los productos" },
      ...products.map((p) => ({ value: p.id, label: p.name })),
    ],
    [products],
  )

  const movementProductOptions = useMemo(
    () => products.map((p) => ({ value: p.id, label: p.name })),
    [products],
  )

  const selectedProduct = productById.get(productId) ?? null
  const productSizes = useMemo(() => {
    if (!selectedProduct || !Array.isArray(selectedProduct.sizes)) return []
    return selectedProduct.sizes.map(normalizeSizeKey).filter(Boolean)
  }, [selectedProduct])

  const usesSizes = productSizes.length > 0

  useEffect(() => {
    if (usesSizes) {
      setSizeQty(emptySizeQty(productSizes))
      setAmount("")
    } else {
      setSizeQty({})
    }
  }, [productId, usesSizes, productSizes.join("|")])

  const handleSizeQtyChange = (size, value) => {
    setSizeQty((prev) => ({ ...prev, [size]: value }))
  }

  const buildSizeLines = () => {
    const lines = []
    for (const size of productSizes) {
      const amt = parseInt(String(sizeQty[size] ?? "").trim(), 10)
      if (Number.isFinite(amt) && amt > 0) {
        lines.push({ size, amount: amt })
      }
    }
    return lines
  }

  const handleMovementSubmit = async (e) => {
    e.preventDefault()
    if (!productId) {
      setFormStatus("Selecciona un producto.")
      return
    }

    let payload = { productId, kind: movKind, note }

    if (usesSizes) {
      const sizeLines = buildSizeLines()
      if (sizeLines.length === 0) {
        setFormStatus("Indica cantidad en al menos una talla.")
        return
      }
      payload = { ...payload, sizeLines }
    } else {
      const amt = parseInt(String(amount).trim(), 10)
      if (!Number.isFinite(amt) || amt < 1) {
        setFormStatus("Indica al menos 1 unidad.")
        return
      }
      payload = { ...payload, amount: amt }
    }

    setFormSubmitting(true)
    setFormStatus("")
    try {
      const res = await fetch(apiUrl("/api/admin/inventory/movements"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormStatus(data.error || "No se pudo guardar el movimiento.")
        return
      }
      setAmount("")
      setSizeQty(emptySizeQty(productSizes))
      setNote("")
      setFormStatus("Movimiento registrado correctamente.")
      await loadProducts()
      if (tab === "history") {
        await loadHistory()
      }
    } catch {
      setFormStatus("Error de red.")
    } finally {
      setFormSubmitting(false)
    }
  }

  return (
    <div className={adminStyles.shell}>
      <h1 className={adminStyles.title}>Inventario</h1>
      <p className={adminStyles.lead}>
        Registra entradas y salidas por producto. Si el producto tiene tallas, indica
        cantidades por cada una. Todo queda en el historial.
      </p>

      <div className={styles.tabs} role="tablist" aria-label="Secciones de inventario">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "stock"}
          className={tab === "stock" ? styles.tabActive : styles.tab}
          onClick={() => setTab("stock")}
        >
          Stock actual
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "movement"}
          className={tab === "movement" ? styles.tabActive : styles.tab}
          onClick={() => {
            setTab("movement")
            setFormStatus("")
          }}
        >
          Entrada / salida
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "history"}
          className={tab === "history" ? styles.tabActive : styles.tab}
          onClick={() => setTab("history")}
        >
          Historial
        </button>
      </div>

      {productsError ? (
        <p className={styles.formErr} role="alert">
          {productsError}
        </p>
      ) : null}

      {tab === "stock" ? (
        <>
          {productsLoading ? (
            <p className={styles.empty}>Cargando productos…</p>
          ) : products.length === 0 ? (
            <p className={styles.empty}>
              No hay productos. Crea productos en la sección Productos del panel.
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col" />
                    <th scope="col">Producto</th>
                    <th scope="col">Categoría</th>
                    <th scope="col">Total</th>
                    <th scope="col">Por talla</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((row) => {
                    const bySize = formatStockBySize(row.stockBySize)
                    return (
                      <tr key={row.id}>
                        <td>
                          {row.imageUrl ? (
                            <img
                              className={styles.thumb}
                              src={resolveAssetUrl(row.imageUrl)}
                              alt=""
                            />
                          ) : (
                            <span className={styles.thumbPlaceholder} />
                          )}
                        </td>
                        <td>{row.name}</td>
                        <td>{row.categoryName || "—"}</td>
                        <td>
                          <span className={styles.stockValue}>
                            {row.currentStock ?? 0}
                          </span>
                        </td>
                        <td className={styles.noteCell}>
                          {bySize || (row.sizes?.length ? "Sin stock" : "—")}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      {tab === "movement" ? (
        productsLoading ? (
          <p className={styles.empty}>Cargando productos…</p>
        ) : products.length === 0 ? (
          <p className={styles.empty}>No hay productos para registrar movimientos.</p>
        ) : (
          <form className={styles.form} onSubmit={handleMovementSubmit}>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.label}>Producto</span>
                <DropdownSelect
                  value={productId}
                  onChange={setProductId}
                  options={movementProductOptions}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Tipo de movimiento</span>
                <DropdownSelect
                  value={movKind}
                  onChange={setMovKind}
                  options={movementKindOptions}
                />
              </label>
            </div>

            {usesSizes ? (
              <div className={styles.sizeSection}>
                <p className={styles.sizeSectionTitle}>
                  Cantidades por talla ({movKind === "in" ? "entrada" : "salida"})
                </p>
                <p className={styles.fieldHint}>
                  Deja en 0 las tallas que no aplican. Stock actual por talla debajo de
                  cada campo.
                </p>
                <div className={styles.sizeGrid}>
                  {productSizes.map((size) => {
                    const current = selectedProduct?.stockBySize?.[size] ?? 0
                    return (
                      <label key={size} className={styles.sizeField}>
                        <span className={styles.sizeLabel}>Talla {size}</span>
                        <input
                          className={styles.input}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          value={sizeQty[size] ?? ""}
                          onChange={(e) => handleSizeQtyChange(size, e.target.value)}
                          placeholder="0"
                        />
                        <span className={styles.fieldHint}>En stock: {current}</span>
                      </label>
                    )
                  })}
                </div>
                {selectedProduct ? (
                  <p className={styles.fieldHint}>
                    Total en stock: {selectedProduct.currentStock ?? 0} · Máx. global:{" "}
                    {selectedProduct.stockMax ?? 0}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <label className={styles.field}>
                  <span className={styles.label}>
                    {movKind === "in" ? "Unidades (entrada)" : "Unidades (salida)"}
                  </span>
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1"
                  />
                  {selectedProduct ? (
                    <span className={styles.fieldHint}>
                      Stock actual: {selectedProduct.currentStock ?? 0}. Para inventario
                      por talla, edita el producto y añade tallas (ej. XS, S, M, L, XL).
                    </span>
                  ) : null}
                </label>
              </>
            )}

            <label className={styles.field}>
              <span className={styles.label}>Nota (opcional)</span>
              <textarea
                className={styles.textarea}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Ej. compra proveedor, venta mostrador…"
              />
            </label>

            <div className={styles.formFooter}>
              {formStatus ? (
                <p
                  className={
                    formStatus.startsWith("Movimiento registrado")
                      ? styles.formOk
                      : styles.formErr
                  }
                  role="status"
                >
                  {formStatus}
                </p>
              ) : null}
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={formSubmitting}
              >
                {formSubmitting ? "Guardando…" : "Registrar movimiento"}
              </button>
            </div>
          </form>
        )
      ) : null}

      {tab === "history" ? (
        <>
          <div className={styles.historyFilters}>
            <label className={styles.field}>
              <span className={styles.label}>Filtrar por producto</span>
              <DropdownSelect
                value={historyFilterId}
                onChange={setHistoryFilterId}
                options={productOptions}
              />
            </label>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={loadHistory}
              disabled={historyLoading}
            >
              {historyLoading ? "Actualizando…" : "Actualizar"}
            </button>
          </div>

          {historyError ? (
            <p className={styles.formErr} role="alert">
              {historyError}
            </p>
          ) : null}

          {historyLoading && movements.length === 0 ? (
            <p className={styles.empty}>Cargando historial…</p>
          ) : movements.length === 0 ? (
            <p className={styles.empty}>Aún no hay movimientos registrados.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Producto</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Detalle</th>
                    <th scope="col">Total antes</th>
                    <th scope="col">Total después</th>
                    <th scope="col">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => {
                    const product = productById.get(m.productId)
                    return (
                      <tr key={m.id || `${m.productId}-${m.createdAt}`}>
                        <td>{formatDate(m.createdAt)}</td>
                        <td>{product?.name || m.productId}</td>
                        <td>{kindLabels[m.kind] || m.kind}</td>
                        <td className={styles.noteCell}>{formatMovementSizes(m)}</td>
                        <td>{m.previousStock}</td>
                        <td>
                          <span className={styles.stockValue}>{m.newStock}</span>
                        </td>
                        <td className={styles.noteCell}>{m.note || "—"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
