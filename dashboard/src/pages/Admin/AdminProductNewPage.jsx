import { useEffect, useId, useRef, useState } from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import DropdownSelect from "../../components/DropdownSelect/DropdownSelect"
import { useProducts } from "../../context/ProductsContext"
import { useAuth } from "../../context/AuthContext"
import { useAdminTaxonomy } from "../../context/AdminTaxonomyContext"
import { apiUrl } from "../../config/apiBase.js"
import styles from "../AdminPage/AdminPage.module.css"

function SortableImageItem({ id, previewUrl, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 0,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.imageCard}
      {...attributes}
      {...listeners}
    >
      <img className={styles.imageThumb} src={previewUrl} alt="" />
      <button
        type="button"
        className={styles.imageRemove}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onRemove()
        }}
      >
        ×
      </button>
      <span className={styles.dragHint} aria-hidden="true">
        ⋮⋮
      </span>
    </div>
  )
}

export default function AdminProductNewPage() {
  const { token } = useAuth()
  const { refreshProducts } = useProducts()
  const { categories, collections, taxonomyLoading, reloadTaxonomy } =
    useAdminTaxonomy()
  const [productCategoryId, setProductCategoryId] = useState("")
  const [productCollectionId, setProductCollectionId] = useState("")
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [detail, setDetail] = useState("")
  const [description, setDescription] = useState("")
  const [images, setImages] = useState([])
  const [fileKey, setFileKey] = useState(0)
  const [status, setStatus] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const fileInputId = useId()
  const imagesRef = useRef(images)
  imagesRef.current = images

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl))
    }
  }, [])

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const addFilesFromList = (fileList) => {
    const list = Array.from(fileList || [])
    setImages((prev) => {
      const merged = [...prev]
      for (const file of list) {
        if (!file.type.startsWith("image/")) continue
        merged.push({
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        })
      }
      return merged
    })
    setFileKey((k) => k + 1)
  }

  const removeImage = (id) => {
    setImages((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((i) => i.id !== id)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!productCategoryId || !productCollectionId) {
      setStatus("Selecciona tipo de ropa y colección.")
      return
    }
    if (images.length === 0) {
      setStatus("Añade al menos una imagen.")
      return
    }
    setSubmitting(true)
    setStatus("")
    try {
      const body = new FormData()
      body.append("categoryId", productCategoryId)
      body.append("collectionId", productCollectionId)
      body.append("name", name)
      body.append("price", price)
      body.append("detail", detail)
      body.append("description", description)
      for (const item of images) {
        body.append("images", item.file)
      }
      const res = await fetch(apiUrl("/api/admin/products"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setStatus(data.error || "No se pudo guardar. Revisa el entorno y los datos.")
        return
      }
      setStatus("Producto publicado correctamente.")
      setName("")
      setPrice("")
      setDetail("")
      setDescription("")
      setImages((prev) => {
        prev.forEach((img) => URL.revokeObjectURL(img.previewUrl))
        return []
      })
      setFileKey((k) => k + 1)
      await refreshProducts()
      await reloadTaxonomy()
    } catch {
      setStatus(
        "Error de red. ¿Está el servidor en marcha y el front con npm run dev?",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const detailLabel = "Color, talle o variante"

  const categorySelectOptions = [
    { value: "", label: "Selecciona tipo de ropa" },
    ...categories.map((c) => ({
      value: c.id,
      label: c.name,
    })),
  ]

  const collectionSelectOptions = [
    { value: "", label: "Selecciona colección" },
    ...collections.map((c) => ({
      value: c.id,
      label: c.name,
    })),
  ]

  return (
    <div className={styles.shell}>
      <h1 className={styles.title}>Nuevo producto</h1>
      <p className={styles.lead}>
        Elige tipo de ropa y colección, sube imágenes y completa los datos. Creá
        tipos de ropa y colecciones desde el menú lateral si aún no existen.
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Tipo de ropa</span>
            <DropdownSelect
              value={productCategoryId}
              onChange={setProductCategoryId}
              options={categorySelectOptions}
              disabled={taxonomyLoading || categories.length === 0}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Colección</span>
            <DropdownSelect
              value={productCollectionId}
              onChange={setProductCollectionId}
              options={collectionSelectOptions}
              disabled={taxonomyLoading || collections.length === 0}
            />
          </label>
        </div>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Nombre del producto</span>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Precio (ej. $29.90)</span>
            <input
              className={styles.input}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </label>
        </div>
        <label className={styles.field}>
          <span className={styles.label}>{detailLabel}</span>
          <input
            className={styles.input}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
        </label>
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
              id={fileInputId}
              key={fileKey}
              className={styles.fileInputHidden}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(e) => {
                addFilesFromList(e.target.files)
                e.target.value = ""
              }}
            />
            <label className={styles.filePickBtn} htmlFor={fileInputId}>
              Elegir archivos
            </label>
            <span className={styles.fileHint}>
              o suelta aquí (JPG, PNG, WebP, GIF)
            </span>
          </div>
          <div
            className={styles.dropArea}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onDrop={(e) => {
              e.preventDefault()
              addFilesFromList(e.dataTransfer.files)
            }}
          >
            {images.length === 0 ? (
              <p className={styles.dropEmpty}>Ninguna imagen aún</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={images.map((i) => i.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className={styles.imageGrid}>
                    {images.map((img) => (
                      <SortableImageItem
                        key={img.id}
                        id={img.id}
                        previewUrl={img.previewUrl}
                        onRemove={() => removeImage(img.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
        {status ? (
          <p
            className={
              status.startsWith("Producto publicado") ? styles.ok : styles.err
            }
            role="status"
          >
            {status}
          </p>
        ) : null}
        <button
          type="submit"
          className={styles.submit}
          disabled={submitting}
        >
          {submitting ? "Publicando…" : "Publicar producto"}
        </button>
      </form>
    </div>
  )
}
