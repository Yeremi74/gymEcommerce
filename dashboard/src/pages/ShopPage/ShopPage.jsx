import { useMemo } from "react"
import { Link, useSearchParams } from "react-router-dom"
import AppHeader from "../../components/AppHeader/AppHeader"
import AppFooter from "../../components/AppFooter/AppFooter"
import ProductCard from "../../components/ProductCard/ProductCard"
import ProductGridSkeleton from "../../components/ProductGridSkeleton/ProductGridSkeleton"
import { useProducts } from "../../context/ProductsContext"
import {
  getProductCategoryKey,
  productCategorySectionMeta,
} from "../../data/content"
import styles from "./ShopPage.module.css"

const NUEVOS_LIMIT = 30

const SORT_OPTIONS = [
  { id: "precio-asc", label: "Precio: menor a mayor" },
  { id: "precio-desc", label: "Precio: mayor a menor" },
  { id: "recientes", label: "Más recientes" },
  { id: "vendidos", label: "Más vendidos" },
  { id: "nombre", label: "Nombre (A–Z)" },
]

function getProductCategoryFilterKey(product) {
  if (product?.categoryId) return product.categoryId
  return `legacy:${getProductCategoryKey(product?.id)}`
}

function getProductCategoryLabel(product) {
  if (product?.categoryName) return product.categoryName
  const key = getProductCategoryKey(product?.id)
  return productCategorySectionMeta[key]?.label ?? "Otros"
}

function parseCreatedAtMs(product) {
  if (!product?.createdAt) return 0
  const t = Date.parse(product.createdAt)
  return Number.isFinite(t) ? t : 0
}

function parseUsdNumber(raw) {
  if (raw == null) return 0
  const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(n) ? n : 0
}

function sortProducts(list, orden) {
  const sorted = [...list]
  switch (orden) {
    case "precio-asc":
      return sorted.sort((a, b) => parseUsdNumber(a.price) - parseUsdNumber(b.price))
    case "precio-desc":
      return sorted.sort((a, b) => parseUsdNumber(b.price) - parseUsdNumber(a.price))
    case "recientes":
      return sorted.sort((a, b) => parseCreatedAtMs(b) - parseCreatedAtMs(a))
    case "vendidos":
      return sorted.sort((a, b) => {
        const diff = (b.unitsSold ?? 0) - (a.unitsSold ?? 0)
        if (diff !== 0) return diff
        return String(a.name).localeCompare(String(b.name), "es")
      })
    case "nombre":
      return sorted.sort((a, b) => String(a.name).localeCompare(String(b.name), "es"))
    default:
      return sorted
  }
}

export default function ShopPage() {
  const { allProductsFlat, shopCategories, shopCollections, loaded } = useProducts()
  const [searchParams, setSearchParams] = useSearchParams()

  const categoryFilter = searchParams.get("categoria") ?? ""
  const collectionFilter = searchParams.get("coleccion") ?? ""
  const sortOrder = searchParams.get("orden") ?? ""
  const isNuevosView = searchParams.get("vista") === "nuevos"

  const effectiveSort = isNuevosView && !sortOrder ? "recientes" : sortOrder

  const categoryOptions = useMemo(() => {
    const counts = new Map()
    for (const product of allProductsFlat) {
      const key = getProductCategoryFilterKey(product)
      const label = getProductCategoryLabel(product)
      const prev = counts.get(key)
      if (prev) {
        prev.count += 1
      } else {
        counts.set(key, { id: key, label, count: 1 })
      }
    }

    const fromProducts = Array.from(counts.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es"),
    )

    const adminById = new Map(
      (shopCategories ?? []).map((c) => [c.id, c.name]),
    )
    for (const opt of fromProducts) {
      if (adminById.has(opt.id)) {
        opt.label = adminById.get(opt.id)
      }
    }

    return fromProducts
  }, [allProductsFlat, shopCategories])

  const collectionOptions = useMemo(() => {
    const counts = new Map()
    for (const product of allProductsFlat) {
      if (!product?.collectionId) continue
      counts.set(product.collectionId, (counts.get(product.collectionId) ?? 0) + 1)
    }

    const byId = new Map()
    for (const col of shopCollections ?? []) {
      byId.set(col.id, {
        id: col.id,
        label: col.name,
        count: counts.get(col.id) ?? 0,
      })
    }
    for (const [id, count] of counts) {
      if (!byId.has(id)) {
        const product = allProductsFlat.find((p) => p.collectionId === id)
        byId.set(id, {
          id,
          label: product?.collectionName || "Colección",
          count,
        })
      }
    }

    return Array.from(byId.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es"),
    )
  }, [allProductsFlat, shopCollections])

  const filteredProducts = useMemo(() => {
    let list = allProductsFlat.filter((product) => {
      if (categoryFilter && getProductCategoryFilterKey(product) !== categoryFilter) {
        return false
      }
      if (collectionFilter && product.collectionId !== collectionFilter) {
        return false
      }
      return true
    })

    if (effectiveSort) {
      list = sortProducts(list, effectiveSort)
    }

    if (isNuevosView) {
      list = list.slice(0, NUEVOS_LIMIT)
    }

    return list
  }, [
    allProductsFlat,
    categoryFilter,
    collectionFilter,
    effectiveSort,
    isNuevosView,
  ])

  const patchSearchParams = (patch) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === "") next.delete(key)
        else next.set(key, value)
      }
      return next
    })
  }

  const setCategoryFilter = (id) => patchSearchParams({ categoria: id || null })
  const setCollectionFilter = (id) => patchSearchParams({ coleccion: id || null })
  const setSortOrder = (id) => patchSearchParams({ orden: id || null })

  const clearFilters = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams()
      const vista = prev.get("vista")
      if (vista) next.set("vista", vista)
      return next
    })
  }

  const hasActiveFilters = Boolean(
    categoryFilter || collectionFilter || (sortOrder && sortOrder !== ""),
  )

  return (
    <div className="page">
      <AppHeader variant="landing" landingSolid />
      <main className={styles.main}>
        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>{isNuevosView ? "Nuevos" : "Tienda"}</h1>
          <p className={styles.heroSubtitle}>
            {isNuevosView
              ? `Los últimos ${NUEVOS_LIMIT} productos del catálogo. Filtra por categoría, colección u orden.`
              : "Explora el catálogo. Filtra por categoría o colección y ordena por precio, novedad, ventas o nombre."}
          </p>
        </header>

        <div className={styles.layout}>
          <aside className={styles.sidebar} aria-label="Filtros de productos">
            <div className={styles.sidebarInner}>
              <div className={styles.sidebarHead}>
                <h2 className={styles.sidebarTitle}>Filtros</h2>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={clearFilters}
                  >
                    Limpiar
                  </button>
                ) : null}
              </div>

              <fieldset className={styles.filterGroup}>
                <legend className={styles.filterLegend}>Ordenar</legend>
                <ul className={styles.filterList}>
                  <li>
                    <label className={styles.filterOption}>
                      <input
                        type="radio"
                        name="shop-sort"
                        checked={!sortOrder}
                        onChange={() => setSortOrder("")}
                      />
                      <span className={styles.filterLabel}>Por defecto</span>
                    </label>
                  </li>
                  {SORT_OPTIONS.map((opt) => (
                    <li key={opt.id}>
                      <label className={styles.filterOption}>
                        <input
                          type="radio"
                          name="shop-sort"
                          checked={sortOrder === opt.id}
                          onChange={() => setSortOrder(opt.id)}
                        />
                        <span className={styles.filterLabel}>{opt.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>

              <fieldset className={styles.filterGroup}>
                <legend className={styles.filterLegend}>Categoría</legend>
                <ul className={styles.filterList}>
                  <li>
                    <label className={styles.filterOption}>
                      <input
                        type="radio"
                        name="shop-category"
                        checked={!categoryFilter}
                        onChange={() => setCategoryFilter("")}
                      />
                      <span className={styles.filterLabel}>Todas</span>
                      <span className={styles.filterCount}>{allProductsFlat.length}</span>
                    </label>
                  </li>
                  {categoryOptions.map((opt) => (
                    <li key={opt.id}>
                      <label className={styles.filterOption}>
                        <input
                          type="radio"
                          name="shop-category"
                          checked={categoryFilter === opt.id}
                          onChange={() => setCategoryFilter(opt.id)}
                        />
                        <span className={styles.filterLabel}>{opt.label}</span>
                        <span className={styles.filterCount}>{opt.count}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>

              {collectionOptions.length > 0 ? (
                <fieldset className={styles.filterGroup}>
                  <legend className={styles.filterLegend}>Colección</legend>
                  <ul className={styles.filterList}>
                    <li>
                      <label className={styles.filterOption}>
                        <input
                          type="radio"
                          name="shop-collection"
                          checked={!collectionFilter}
                          onChange={() => setCollectionFilter("")}
                        />
                        <span className={styles.filterLabel}>Todas</span>
                      </label>
                    </li>
                    {collectionOptions.map((opt) => (
                      <li key={opt.id}>
                        <label className={styles.filterOption}>
                          <input
                            type="radio"
                            name="shop-collection"
                            checked={collectionFilter === opt.id}
                            onChange={() => setCollectionFilter(opt.id)}
                          />
                          <span className={styles.filterLabel}>{opt.label}</span>
                          <span className={styles.filterCount}>{opt.count}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              ) : null}
            </div>
          </aside>

          <section className={styles.catalog} aria-label="Productos">
            <div className={styles.catalogHead}>
              <p className={styles.resultCount}>
                {loaded ? (
                  <>
                    <strong>{filteredProducts.length}</strong>{" "}
                    {filteredProducts.length === 1 ? "producto" : "productos"}
                  </>
                ) : (
                  "Cargando catálogo…"
                )}
              </p>
            </div>

            {!loaded ? (
              <ProductGridSkeleton animate lines={12} />
            ) : filteredProducts.length === 0 ? (
              <div className={styles.empty}>
                <h2 className={styles.emptyTitle}>No hay productos con estos filtros</h2>
                <p className={styles.emptyText}>
                  Prueba otro criterio o restablece los filtros.
                </p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    className={styles.emptyCta}
                    onClick={clearFilters}
                  >
                    Ver todos los productos
                  </button>
                ) : isNuevosView ? (
                  <Link className={styles.emptyCta} to="/tienda">
                    Ver catálogo completo
                  </Link>
                ) : (
                  <Link className={styles.emptyCta} to="/">
                    Volver al inicio
                  </Link>
                )}
              </div>
            ) : (
              <ul className={styles.grid}>
                {filteredProducts.map((product) => (
                  <li key={product.id} className={styles.gridItem}>
                    <ProductCard
                      productId={product.id}
                      name={product.name}
                      price={product.price}
                      imageUrl={product.imageUrl}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <AppFooter />
    </div>
  )
}
