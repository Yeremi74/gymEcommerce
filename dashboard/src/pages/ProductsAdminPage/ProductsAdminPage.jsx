import { useId, useMemo, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import AppHeader from "../../components/AppHeader/AppHeader"
import AppFooter from "../../components/AppFooter/AppFooter"
import DropdownSelect from "../../components/DropdownSelect/DropdownSelect"
import { useProducts } from "../../context/ProductsContext"
import { useAuth } from "../../context/AuthContext"
import { apiUrl, resolveAssetUrl } from "../../config/apiBase.js"
import { formatPriceUsd } from "../../utils/formatPriceUsd.js"
import styles from "./ProductsAdminPage.module.css"

const productTypeOptions = [
  { value: "powder", label: "Pote / polvo" },
  { value: "bar", label: "Barra" },
]

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

export default function ProductsAdminPage() {
  const { user, token, ready } = useAuth()
  const { refreshProducts, powderProducts, barProducts, loaded } = useProducts()

  const rows = useMemo(
    () => buildRows(powderProducts, barProducts),
    [powderProducts, barProducts],
  )

  const [type, setType] = useState("powder")
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [detail, setDetail] = useState("")
  const [description, setDescription] = useState("")
  const [stockMin, setStockMin] = useState("0")
  const [stockMax, setStockMax] = useState("100")
  const [createFiles, setCreateFiles] = useState([])
  const [createKey, setCreateKey] = useState(0)
  const [createStatus, setCreateStatus] = useState("")
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [editing, setEditing] = useState(null)
  const [editName, setEditName] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editDetail, setEditDetail] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editStockMin, setEditStockMin] = useState("0")
  const [editStockMax, setEditStockMax] = useState("0")
  const [editFiles, setEditFiles] = useState([])
  const [editKey, setEditKey] = useState(0)
  const [editStatus, setEditStatus] = useState("")
  const [editSubmitting, setEditSubmitting] = useState(false)

  /** "list" = tabla y edición; "create" = solo formulario nuevo */
  const [view, setView] = useState("list")

  const createFileInputId = useId()
  const editFileInputId = useId()

  const detailLabelCreate = type === "bar" ? "Sabor o variante" : "Presentación"
  const detailLabelEdit =
    editing?.kind === "bar" ? "Sabor o variante" : "Presentación"

  const addCreateFiles = (fileList) => {
    const list = Array.from(fileList || [])
    setCreateFiles((prev) => {
      const next = [...prev]
      for (const file of list) {
        if (!file.type.startsWith("image/")) continue
        next.push({
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        })
      }
      return next
    })
    setCreateKey((k) => k + 1)
  }

  const removeCreateFile = (id) => {
    setCreateFiles((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((i) => i.id !== id)
    })
  }

  const addEditFiles = (fileList) => {
    const list = Array.from(fileList || [])
    setEditFiles((prev) => {
      const next = [...prev]
      for (const file of list) {
        if (!file.type.startsWith("image/")) continue
        next.push({
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        })
      }
      return next
    })
    setEditKey((k) => k + 1)
  }

  const removeEditFile = (id) => {
    setEditFiles((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((i) => i.id !== id)
    })
  }

  const startEdit = (row) => {
    setView("list")
    setEditing(row)
    setEditName(row.name)
    setEditPrice(row.price)
    setEditDetail(row.detail || "")
    setEditDescription(row.description || "")
    setEditStockMin(String(row.stockMin ?? 0))
    setEditStockMax(String(row.stockMax ?? 0))
    setEditFiles([])
    setEditKey((k) => k + 1)
    setEditStatus("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const cancelEdit = () => {
    setEditing(null)
    editFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl))
    setEditFiles([])
    setEditKey((k) => k + 1)
    setEditStatus("")
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (createFiles.length === 0) {
      setCreateStatus("Añade al menos una imagen.")
      return
    }
    setCreateSubmitting(true)
    setCreateStatus("")
    try {
      const body = new FormData()
      body.append("type", type)
      body.append("name", name)
      body.append("price", price)
      body.append("detail", detail)
      body.append("description", description)
      body.append("stockMin", stockMin)
      body.append("stockMax", stockMax)
      for (const item of createFiles) {
        body.append("images", item.file)
      }
      const res = await fetch(apiUrl("/api/admin/products"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setCreateStatus(data.error || "No se pudo crear el producto.")
        return
      }
      setCreateStatus("Producto creado correctamente.")
      setName("")
      setPrice("")
      setDetail("")
      setDescription("")
      setStockMin("0")
      setStockMax("100")
      setCreateFiles((prev) => {
        prev.forEach((img) => URL.revokeObjectURL(img.previewUrl))
        return []
      })
      setCreateKey((k) => k + 1)
      await refreshProducts()
      setView("list")
    } catch {
      setCreateStatus("Error de red. Comprueba el servidor.")
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editing) return
    setEditSubmitting(true)
    setEditStatus("")
    try {
      const body = new FormData()
      body.append("name", editName)
      body.append("price", editPrice)
      body.append("detail", editDetail)
      body.append("description", editDescription)
      body.append("stockMin", editStockMin)
      body.append("stockMax", editStockMax)
      for (const item of editFiles) {
        body.append("images", item.file)
      }
      const res = await fetch(
        apiUrl(`/api/admin/products/${encodeURIComponent(editing.id)}`),
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body,
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setEditStatus(data.error || "No se pudo guardar.")
        return
      }
      setEditStatus("Cambios guardados.")
      editFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl))
      setEditFiles([])
      setEditKey((k) => k + 1)
      await refreshProducts()
      setTimeout(() => {
        setEditing(null)
        setEditStatus("")
      }, 800)
    } catch {
      setEditStatus("Error de red.")
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDelete = async (row) => {
    const ok = window.confirm(
      `¿Eliminar "${row.name}"? Esta acción no se puede deshacer.`,
    )
    if (!ok) return
    try {
      const res = await fetch(
        apiUrl(`/api/admin/products/${encodeURIComponent(row.id)}`),
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        window.alert(data.error || "No se pudo eliminar.")
        return
      }
      if (editing?.id === row.id) {
        cancelEdit()
      }
      await refreshProducts()
    } catch {
      window.alert("Error de red.")
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
    return <Navigate to="/login" replace state={{ from: "/productos" }} />
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
            <h1 className={styles.title}>Productos</h1>
            <p className={styles.lead}>
              Solo el administrador principal puede gestionar el catálogo.
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
          <h1 className={styles.title}>Productos</h1>
          <p className={styles.lead}>
            Consulta el catálogo y usa el botón para dar de alta un producto nuevo.
          </p>

          {view === "list" ? (
            <div className={styles.listToolbar}>
              <button
                type="button"
                className={styles.newProductBtn}
                onClick={() => {
                  cancelEdit()
                  setView("create")
                }}
              >
                Nuevo producto
              </button>
            </div>
          ) : (
            <div className={styles.createToolbar}>
              <button
                type="button"
                className={styles.backToListBtn}
                onClick={() => setView("list")}
              >
                ← Volver al catálogo
              </button>
            </div>
          )}

          {view === "list" && editing ? (
            <div className={styles.editPanel}>
              <h2 className={styles.sectionTitle}>Editar producto</h2>
              <p className={styles.lead} style={{ marginBottom: 16 }}>
                {editing.kindLabel} · <code>{editing.id}</code>
              </p>
              <form className={styles.form} onSubmit={handleEditSubmit}>
                <label className={styles.field}>
                  <span className={styles.label}>Nombre</span>
                  <input
                    className={styles.input}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </label>
                <div className={styles.row}>
                  <label className={styles.field}>
                    <span className={styles.label}>Precio (ej. $29.90)</span>
                    <input
                      className={styles.input}
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      required
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>{detailLabelEdit}</span>
                    <input
                      className={styles.input}
                      value={editDetail}
                      onChange={(e) => setEditDetail(e.target.value)}
                    />
                  </label>
                </div>
                <div className={styles.row}>
                  <label className={styles.field}>
                    <span className={styles.label}>Stock mínimo</span>
                    <input
                      className={styles.input}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={editStockMin}
                      onChange={(e) => setEditStockMin(e.target.value)}
                      required
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Stock máximo</span>
                    <input
                      className={styles.input}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={editStockMax}
                      onChange={(e) => setEditStockMax(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <label className={styles.field}>
                  <span className={styles.label}>Descripción</span>
                  <textarea
                    className={styles.textarea}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={5}
                    required
                  />
                </label>
                <div className={styles.field}>
                  <span className={styles.label}>
                    Imágenes actuales (si subes nuevas, reemplazan todas)
                  </span>
                  <div className={styles.previewRow}>
                    {(editing.imageUrls && editing.imageUrls.length > 0
                      ? editing.imageUrls
                      : editing.imageUrl
                        ? [editing.imageUrl]
                        : []
                    ).map((url) => (
                      <img
                        key={url}
                        className={styles.previewThumb}
                        src={resolveAssetUrl(url)}
                        alt=""
                      />
                    ))}
                  </div>
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>Nuevas imágenes (opcional)</span>
                  <div className={styles.fileZone}>
                    <input
                      id={editFileInputId}
                      key={editKey}
                      className={styles.fileInputHidden}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      onChange={(e) => {
                        addEditFiles(e.target.files)
                        e.target.value = ""
                      }}
                    />
                    <label className={styles.filePickBtn} htmlFor={editFileInputId}>
                      Elegir archivos
                    </label>
                    <span className={styles.fileHint}>
                      JPG, PNG, WebP, GIF · máx. 5 MB c/u
                    </span>
                  </div>
                  {editFiles.length > 0 ? (
                    <div className={styles.previewRow}>
                      {editFiles.map((img) => (
                        <div key={img.id} style={{ position: "relative" }}>
                          <img
                            className={styles.previewThumb}
                            src={img.previewUrl}
                            alt=""
                          />
                          <button
                            type="button"
                            className={styles.actionBtn}
                            style={{
                              position: "absolute",
                              top: 4,
                              right: 4,
                              padding: "2px 8px",
                            }}
                            onClick={() => removeEditFile(img.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                {editStatus ? (
                  <p
                    className={
                      editStatus === "Cambios guardados." ? styles.ok : styles.err
                    }
                    role="status"
                  >
                    {editStatus}
                  </p>
                ) : null}
                <div className={styles.formActions}>
                  <button
                    type="submit"
                    className={styles.submit}
                    disabled={editSubmitting}
                  >
                    {editSubmitting ? "Guardando…" : "Guardar cambios"}
                  </button>
                  <button
                    type="button"
                    className={`${styles.submit} ${styles.submitGhost}`}
                    onClick={cancelEdit}
                    disabled={editSubmitting}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {view === "list" ? (
            <>
              <h2 className={styles.sectionTitle}>Catálogo</h2>
              {!loaded ? (
                <p className={styles.empty}>Cargando productos…</p>
              ) : rows.length === 0 ? (
                <p className={styles.empty}>No hay productos en el catálogo.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col" />
                        <th scope="col">Nombre</th>
                        <th scope="col">Tipo</th>
                        <th scope="col">Precio</th>
                        <th scope="col">Stock mín.</th>
                        <th scope="col">Stock máx.</th>
                        <th scope="col">Acciones</th>
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
                          <td>{formatPriceUsd(row.price)}</td>
                          <td>{row.stockMin ?? 0}</td>
                          <td>{row.stockMax ?? 0}</td>
                          <td>
                            <div className={styles.actions}>
                              <button
                                type="button"
                                className={styles.actionBtn}
                                onClick={() => startEdit(row)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                                onClick={() => handleDelete(row)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className={styles.sectionTitle}>Nuevo producto</h2>
              <form className={styles.form} onSubmit={handleCreate}>
            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>Tipo</span>
                <DropdownSelect
                  value={type}
                  onChange={setType}
                  options={productTypeOptions}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Nombre</span>
                <input
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>Precio (ej. $29.90)</span>
                <input
                  className={styles.input}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>{detailLabelCreate}</span>
                <input
                  className={styles.input}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                />
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>Stock mínimo</span>
                <input
                  className={styles.input}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={stockMin}
                  onChange={(e) => setStockMin(e.target.value)}
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Stock máximo</span>
                <input
                  className={styles.input}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={stockMax}
                  onChange={(e) => setStockMax(e.target.value)}
                  required
                />
              </label>
            </div>
            <label className={styles.field}>
              <span className={styles.label}>Descripción</span>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                required
              />
            </label>
            <div className={styles.field}>
              <span className={styles.label}>Imágenes</span>
              <div className={styles.fileZone}>
                <input
                  id={createFileInputId}
                  key={createKey}
                  className={styles.fileInputHidden}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={(e) => {
                    addCreateFiles(e.target.files)
                    e.target.value = ""
                  }}
                />
                <label className={styles.filePickBtn} htmlFor={createFileInputId}>
                  Elegir archivos
                </label>
                <span className={styles.fileHint}>
                  o arrastra al área (JPG, PNG, WebP, GIF)
                </span>
              </div>
              {createFiles.length > 0 ? (
                <div className={styles.previewRow}>
                  {createFiles.map((img) => (
                    <div key={img.id} style={{ position: "relative" }}>
                      <img
                        className={styles.previewThumb}
                        src={img.previewUrl}
                        alt=""
                      />
                      <button
                        type="button"
                        className={styles.actionBtn}
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          padding: "2px 8px",
                        }}
                        onClick={() => removeCreateFile(img.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            {createStatus ? (
              <p
                className={
                  createStatus.startsWith("Producto creado")
                    ? styles.ok
                    : styles.err
                }
                role="status"
              >
                {createStatus}
              </p>
            ) : null}
            <button
              type="submit"
              className={styles.submit}
              disabled={createSubmitting}
            >
              {createSubmitting ? "Creando…" : "Crear producto"}
            </button>
              </form>
            </>
          )}
        </div>
      </main>
      <AppFooter />
    </div>
  )
}
