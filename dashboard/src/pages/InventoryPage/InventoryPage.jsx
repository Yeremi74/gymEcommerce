import { useEffect, useMemo, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import AppHeader from "../../components/AppHeader/AppHeader"
import AppFooter from "../../components/AppFooter/AppFooter"
import DropdownSelect from "../../components/DropdownSelect/DropdownSelect"
import { useProducts } from "../../context/ProductsContext"
import { useAuth } from "../../context/AuthContext"
import { apiUrl, resolveAssetUrl } from "../../config/apiBase.js"
import styles from "./InventoryPage.module.css"

function buildRows(powderProducts, barProducts) {
  const rows = []
  for (const p of barProducts) {
    rows.push({
      ...p,
      kind: "bar",
      detail: p.flavor || "",
      kindLabel: "Barra",
    })
  }
  for (const p of powderProducts) {
    rows.push({
      ...p,
      kind: "powder",
      detail: p.sublabel || "",
      kindLabel: "Pote / polvo",
    })
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, "es"))
  return rows
}

const movementKindOptions = [
  { value: "in", label: "Entrada" },
  { value: "out", label: "Salida" },
  { value: "set", label: "Ajuste a valor fijo" },
]

export default function InventoryPage() {
  const { user, token, ready } = useAuth()
  const { refreshProducts, powderProducts, barProducts, loaded } = useProducts()

  const rows = useMemo(
    () => buildRows(powderProducts, barProducts),
    [powderProducts, barProducts],
  )

  /** "list" = tabla; "movement" = formulario de movimiento */
  const [view, setView] = useState("list")

  const [productId, setProductId] = useState("")
  const [movKind, setMovKind] = useState("in")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [formStatus, setFormStatus] = useState("")
  const [formSubmitting, setFormSubmitting] = useState(false)

  const productOptions = useMemo(
    () => rows.map((r) => ({ value: r.id, label: r.name })),
    [rows],
  )

  useEffect(() => {
    if (rows.length === 0) return
    if (!productId || !rows.some((r) => r.id === productId)) {
      setProductId(rows[0].id)
    }
  }, [rows, productId])

  const selectedRow = rows.find((r) => r.id === productId) ?? null

  const amountLabel =
    movKind === "set"
      ? "Nuevo stock"
      : movKind === "in"
        ? "Unidades (entrada)"
        : "Unidades (salida)"

  const handleMovementSubmit = async (e) => {
    e.preventDefault()
    if (!productId) {
      setFormStatus("Selecciona un producto.")
      return
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
        body: JSON.stringify({
          productId,
          kind: movKind,
          amount,
          note,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormStatus(data.error || "No se pudo guardar el movimiento.")
        return
      }
      setAmount("")
      setNote("")
      setFormStatus("")
      await refreshProducts()
      setView("list")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {
      setFormStatus("Error de red.")
    } finally {
      setFormSubmitting(false)
    }
  }

  if (!ready) {
    return (
      <div className="page">
        <AppHeader />
        <main className={styles.main}>
          <div className={styles.shell}>
            <p className={styles.lead}>Cargando…</p>
          </div>
        </main>
        <AppFooter />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: "/inventario" }} />
  }

  if (user.isMainAdmin !== true) {
    return (
      <div className="page">
        <AppHeader />
        <main className={styles.main}>
          <div className={styles.shell}>
            <Link className={styles.back} to="/">
              ← Volver al inicio
            </Link>
            <h1 className={styles.title}>Inventario</h1>
            <p className={styles.lead}>
              Solo el administrador principal puede gestionar el inventario.
            </p>
          </div>
        </main>
        <AppFooter />
      </div>
    )
  }

  return (
    <div className="page">
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.shell}>
          <Link className={styles.back} to="/">
            ← Volver al inicio
          </Link>

          <header className={styles.pageHeader}>
            <div className={styles.pageHeaderText}>
              <h1 className={styles.title}>Movimientos de inventario</h1>
              <p className={styles.lead}>
                {view === "list"
                  ? "Consulta el stock actual de cada producto. Para registrar un movimiento, usa el botón de la derecha."
                  : "Registra entradas, salidas o un ajuste al valor de stock. Se guarda el historial en la base de datos."}
              </p>
            </div>
            {view === "list" ? (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => {
                  setView("movement")
                  setFormStatus("")
                }}
                disabled={!loaded || rows.length === 0}
              >
                Registrar movimiento
              </button>
            ) : (
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => {
                  setView("list")
                  setFormStatus("")
                }}
              >
                Ver listado
              </button>
            )}
          </header>

          {view === "list" ? (
            <>
              {!loaded ? (
                <p className={styles.empty}>Cargando productos…</p>
              ) : rows.length === 0 ? (
                <p className={styles.empty}>
                  No hay productos. Añade productos en Productos.
                </p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col" />
                        <th scope="col">Producto</th>
                        <th scope="col">Tipo</th>
                        <th scope="col">Mín.</th>
                        <th scope="col">Máx.</th>
                        <th scope="col">Stock actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
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
                          <td>{row.kindLabel}</td>
                          <td>{row.stockMin ?? 0}</td>
                          <td>{row.stockMax ?? 0}</td>
                          <td>
                            <span className={styles.stockValue}>
                              {row.currentStock ?? 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : rows.length === 0 ? (
            <p className={styles.empty}>No hay productos para registrar movimientos.</p>
          ) : (
            <form className={styles.form} onSubmit={handleMovementSubmit}>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.label}>Producto</span>
                  <DropdownSelect
                    value={productId}
                    onChange={setProductId}
                    options={productOptions}
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
                <label className={styles.field}>
                  <span className={styles.label}>{amountLabel}</span>
                  <input
                    className={styles.input}
                    type="number"
                    inputMode="numeric"
                    min={movKind === "set" ? 0 : 1}
                    step={1}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={movKind === "set" ? "0" : "1"}
                  />
                  {selectedRow ? (
                    <span className={styles.fieldHint}>
                      Stock actual: {selectedRow.currentStock ?? 0} · Máx.:{" "}
                      {selectedRow.stockMax ?? 0}
                    </span>
                  ) : null}
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Nota (opcional)</span>
                  <textarea
                    className={styles.textarea}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    placeholder="Ej. compra proveedor, rotura, inventario físico…"
                  />
                </label>
              </div>
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
                  {formSubmitting ? "Guardando…" : "Guardar movimiento"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <AppFooter />
    </div>
  )
}
