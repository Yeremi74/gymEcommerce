import { useMemo } from "react"
import { Link } from "react-router-dom"
import { resolveAssetUrl } from "../../config/apiBase.js"
import styles from "./ProductTypesCarousel.module.css"

/**
 * Carrusel horizontal de categorías (tipos) creadas en admin, con nombre e imagen de portada.
 *
 * @param {object} props
 * @param {Array<{ id: string, name: string, slug: string, coverImageUrl?: string | null }>} props.categories
 */
export default function ProductTypesCarousel({ categories }) {
  const rows = useMemo(() => {
    const list = Array.isArray(categories) ? [...categories] : []
    list.sort((a, b) => String(a.name).localeCompare(String(b.name), "es"))
    return list
  }, [categories])

  return (
    <section
      className={styles.root}
      id="colecciones"
      aria-labelledby="product-types-title"
    >
      <div className={styles.inner}>
        <header className={styles.head}>
          <h2 id="product-types-title" className={styles.title}>
            Tipos de producto
          </h2>
          <p className={styles.lead}>
            Navegá por las categorías que configurás en el panel: cada tarjeta usa la imagen elegida al crear el tipo.
          </p>
        </header>

        {rows.length === 0 ? (
          <p className={styles.empty}>
            Cuando cargues categorías con imagen de portada en el admin, aparecerán acá en carrusel.
          </p>
        ) : (
          <div
            className={styles.track}
            role="region"
            aria-roledescription="carrusel"
            aria-label="Tipos de producto"
            tabIndex={0}
          >
            {rows.map((cat) => (
              <article key={cat.id} className={styles.card} id={`categoria-${cat.slug}`}>
                <Link
                  className={styles.cardLink}
                  to={{ pathname: "/", hash: `categoria-${cat.slug}` }}
                >
                  <div className={styles.media}>
                    {cat.coverImageUrl ? (
                      <img
                        className={styles.img}
                        src={resolveAssetUrl(cat.coverImageUrl)}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.mediaFallback} aria-hidden>
                        <span className={styles.mediaFallbackLetter}>
                          {String(cat.name || "?").slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={styles.meta}>
                    <h3 className={styles.name}>{cat.name}</h3>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
