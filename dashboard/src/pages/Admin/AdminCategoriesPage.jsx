import { useId, useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { useAdminTaxonomy } from "../../context/AdminTaxonomyContext"
import { apiUrl, resolveAssetUrl } from "../../config/apiBase.js"
import styles from "../AdminPage/AdminPage.module.css"

export default function AdminCategoriesPage() {
  const { token } = useAuth()
  const { categories, taxonomyLoading, reloadTaxonomy } = useAdminTaxonomy()
  const [newCatName, setNewCatName] = useState("")
  const [newCatDescription, setNewCatDescription] = useState("")
  const [coverFile, setCoverFile] = useState(null)
  const [catMsg, setCatMsg] = useState("")
  const coverInputId = useId()

  const createCategory = async (e) => {
    e.preventDefault()
    setCatMsg("")
    const trimmed = newCatName.trim()
    if (!trimmed) {
      setCatMsg("Escribe un nombre de tipo de ropa.")
      return
    }
    try {
      const body = new FormData()
      body.append("name", trimmed)
      body.append("description", newCatDescription.trim())
      if (coverFile) {
        body.append("cover", coverFile)
      }
      const res = await fetch(apiUrl("/api/admin/categories"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCatMsg(data.error || "No se pudo crear el tipo de ropa.")
        return
      }
      setNewCatName("")
      setNewCatDescription("")
      setCoverFile(null)
      await reloadTaxonomy()
      setCatMsg("Tipo de ropa creado.")
    } catch {
      setCatMsg("Error de red al crear el tipo de ropa.")
    }
  }

  const deleteCategory = async (id) => {
    if (!window.confirm("¿Eliminar este tipo de ropa? Solo si no tiene productos.")) {
      return
    }
    setCatMsg("")
    try {
      const res = await fetch(apiUrl(`/api/admin/categories/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCatMsg(data.error || "No se pudo eliminar.")
        return
      }
      await reloadTaxonomy()
      setCatMsg("Tipo de ropa eliminado.")
    } catch {
      setCatMsg("Error de red al eliminar.")
    }
  }

  return (
    <div className={styles.shell}>
      <h1 className={styles.title}>Tipos de ropa</h1>
      <p className={styles.lead}>
        Cada tipo de ropa es una zona del catálogo (por ejemplo pantalón, hoodies). En la
        tienda aparece como sección propia y los clientes navegan por productos
        asignados a ese tipo.
      </p>

      <section className={styles.panel} aria-labelledby="catFormTitle">
        <h2 id="catFormTitle" className={styles.panelTitle}>
          Nuevo tipo de ropa
        </h2>
        <form className={styles.inlineForm} onSubmit={createCategory}>
          <label className={styles.field}>
            <span className={styles.label}>Nombre</span>
            <input
              className={styles.input}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Ej. Pantalón"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Descripción</span>
            <textarea
              className={styles.textarea}
              value={newCatDescription}
              onChange={(e) => setNewCatDescription(e.target.value)}
              rows={3}
              placeholder="Texto que verá el cliente en la sección de este tipo de ropa."
            />
          </label>
          <div className={styles.field}>
            <span className={styles.label}>Imagen de portada (opcional)</span>
            <div className={styles.fileZone}>
              <input
                id={coverInputId}
                className={styles.fileInputHidden}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  setCoverFile(f && f.type.startsWith("image/") ? f : null)
                  e.target.value = ""
                }}
              />
              <label className={styles.filePickBtn} htmlFor={coverInputId}>
                Elegir imagen
              </label>
              <span className={styles.fileHint}>
                {coverFile ? coverFile.name : "JPG, PNG, WebP o GIF"}
              </span>
            </div>
          </div>
          <button type="submit" className={styles.btnSecondary}>
            Crear tipo de ropa
          </button>
        </form>
        {catMsg ? (
          <p
            className={
              catMsg.includes("creado") ||
              catMsg.includes("creada") ||
              catMsg.includes("eliminado") ||
              catMsg.includes("eliminada")
                ? styles.ok
                : styles.err
            }
            role="status"
          >
            {catMsg}
          </p>
        ) : null}
      </section>

      <section className={styles.panel} style={{ marginTop: 20 }} aria-labelledby="catListTitle">
        <h2 id="catListTitle" className={styles.panelTitle}>
          Listado
        </h2>
        {taxonomyLoading ? (
          <p className={styles.mutedList}>Cargando tipos de ropa…</p>
        ) : categories.length === 0 ? (
          <p className={styles.mutedList}>Aún no hay tipos de ropa.</p>
        ) : (
          <ul className={styles.compactList}>
            {categories.map((c) => (
              <li key={c.id} className={styles.listRow}>
                <span className={styles.taxonomyRowMain}>
                  {c.coverImageUrl ? (
                    <img
                      className={styles.taxonomyThumb}
                      src={resolveAssetUrl(c.coverImageUrl)}
                      alt=""
                    />
                  ) : (
                    <span className={styles.taxonomyThumbPlaceholder} aria-hidden>
                      —
                    </span>
                  )}
                  <span className={styles.taxonomyRowText}>
                    <strong>{c.name}</strong>
                    {c.description ? (
                      <span className={styles.listMeta}>
                        {" "}
                        · {c.description.length > 80 ? `${c.description.slice(0, 80)}…` : c.description}
                      </span>
                    ) : null}
                  </span>
                </span>
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={() => deleteCategory(c.id)}
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
