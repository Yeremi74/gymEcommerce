import ProductCard from "../ProductCard/ProductCard"
import ProductGridSkeleton from "../ProductGridSkeleton/ProductGridSkeleton"
import { resolveAssetUrl } from "../../config/apiBase.js"
import styles from "./LandingProductShowcase.module.css"

/**
 * Sección reutilizable: título, rejilla 4×2, bloque 2×2 + imagen editorial.
 *
 * @param {object} props
 * @param {string} props.sectionId prefijo estable para ids de título
 * @param {string} props.title
 * @param {string} [props.lead]
 * @param {Array<{ id: string, name: string, price: string, imageUrl: string }>} props.products
 * @param {boolean} props.loaded
 * @param {string} props.promoImageUrl imagen derecha del bloque inferior
 * @param {"stone" | "canvas"} [props.variant]
 * @param {string} [props.htmlId] id del `<section>` (anclas)
 */
export default function LandingProductShowcase({
  sectionId,
  title,
  lead,
  products,
  loaded,
  promoImageUrl,
  variant = "stone",
  htmlId,
}) {
  const list = products ?? []
  const top = list.slice(0, 8)
  const mini = list.slice(8, 12)
  const titleId = `${sectionId}-title`
  const domId = htmlId ?? sectionId
  const showSkeleton = !loaded
  const showEmpty = loaded && list.length === 0

  const renderSlot = (item, key) => {
    if (!item) {
      return <div key={key} className={styles.cardPlaceholder} aria-hidden />
    }
    return (
      <ProductCard
        key={item.id}
        productId={item.id}
        name={item.name}
        price={item.price}
        imageUrl={item.imageUrl}
      />
    )
  }

  return (
    <section
      className={`${styles.root} ${variant === "canvas" ? styles.canvas : styles.stone}`}
      id={domId}
      aria-labelledby={titleId}
      aria-busy={!loaded}
    >
      <div className={styles.inner}>
        <header className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {lead ? <p className={styles.lead}>{lead}</p> : null}
        </header>

        {showSkeleton ? (
          <div className={styles.skeletonBlock}>
            <ProductGridSkeleton animate lines={8} />
            <ProductGridSkeleton animate lines={4} />
          </div>
        ) : showEmpty ? (
          <p className={styles.empty}>Aún no hay productos para mostrar en esta sección.</p>
        ) : (
          <>
            <div className={styles.gridTop}>
              {Array.from({ length: 8 }).map((_, i) => renderSlot(top[i], `top-${i}`))}
            </div>

            <div className={styles.split}>
              <div className={styles.gridMini}>
                {Array.from({ length: 4 }).map((_, i) => renderSlot(mini[i], `mini-${i}`))}
              </div>
              <div className={styles.promo}>
                <img
                  className={styles.promoImg}
                  src={resolveAssetUrl(promoImageUrl)}
                  alt=""
                  loading="lazy"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
