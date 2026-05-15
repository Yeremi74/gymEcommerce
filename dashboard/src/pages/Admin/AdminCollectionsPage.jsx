import { useId, useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { useAdminTaxonomy } from "../../context/AdminTaxonomyContext"
import { apiUrl, resolveAssetUrl } from "../../config/apiBase.js"
import styles from "../AdminPage/AdminPage.module.css"

export default function AdminCollectionsPage() {
  const { token } = useAuth()
  const { collections, taxonomyLoading, reloadTaxonomy } = useAdminTaxonomy()
  const [newColName, setNewColName] = useState("")
  const [newColDescription, setNewColDescription] = useState("")
  const [coverFile, setCoverFile] = useState(null)
  const [colMsg, setColMsg] = useState("")
  const coverInputId = useId()

  const createCollection = async (e) => {
    e.preventDefault()
    setColMsg("")
    const trimmed = newColName.trim()
    if (!trimmed) {
      setColMsg("Escribe un nombre de colección.")
      return
    }
    try {
      const body = new FormData()
      body.append("name", trimmed)
      body.append("description", newColDescription.trim())
      if (coverFile) {
        body.append("cover", coverFile)
      }
      const res = await fetch(apiUrl("/api/admin/collections"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setColMsg(data.error || "No se pudo crear la colección.")
        return
      }
      setNewColName("")
      setNewColDescription("")
      setCoverFile(null)
      await reloadTaxonomy()
      setColMsg("Colección creada.")
    } catch {
      setColMsg("Error de red al crear la colección.")
    }
  }

  const deleteCollection = async (id) => {
    if (!window.confirm("¿Eliminar esta colección? Solo si no tiene productos.")) {
      return
    }
    setColMsg("")
    try {
      const res = await fetch(apiUrl(`/api/admin/collections/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setColMsg(data.error || "No se pudo eliminar.")
        return
      }
      await reloadTaxonomy()
      setColMsg("Colección eliminada.")
    } catch {
      setColMsg("Error de red al eliminar.")
    }
  }

  return (
    <div className={styles.shell}>
      <h1 className={styles.title}>Colecciones</h1>
      <p className={styles.lead}>
        Agrupa productos por campaña, temporada o drop (por ejemplo &quot;Invierno
        2026&quot;, &quot;Basics&quot;). Nombre, descripción e imagen de portada opcional.
      </p>

      <section className={styles.panel} aria-labelledby="colFormTitle">
        <h2 id="colFormTitle" className={styles.panelTitle}>
          Nueva colección
        </h2>
        <form className={styles.inlineForm} onSubmit={createCollection}>
          <label className={styles.field}>
            <span className={styles.label}>Nombre</span>
            <input
              className={styles.input}
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="Ej. Línea gráfica"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Descripción</span>
            <textarea
              className={styles.textarea}
              value={newColDescription}
              onChange={(e) => setNewColDescription(e.target.value)}
              rows={3}
              placeholder="Nota interna o copy para futuras vitrinas."
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
            Crear colección
          </button>
        </form>
        {colMsg ? (
          <p
            className={
              colMsg.includes("creada") || colMsg.includes("eliminada")
                ? styles.ok
                : styles.err
            }
            role="status"
          >
            {colMsg}
          </p>
        ) : null}
      </section>

      <section className={styles.panel} style={{ marginTop: 20 }} aria-labelledby="colListTitle">
        <h2 id="colListTitle" className={styles.panelTitle}>
          Listado
        </h2>
        {taxonomyLoading ? (
          <p className={styles.mutedList}>Cargando colecciones…</p>
        ) : collections.length === 0 ? (
          <p className={styles.mutedList}>Aún no hay colecciones.</p>
        ) : (
          <ul className={styles.compactList}>
            {collections.map((c) => (
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
                  onClick={() => deleteCollection(c.id)}
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
