import ProductCard from "../ProductCard/ProductCard"
import ProductGridSkeleton from "../ProductGridSkeleton/ProductGridSkeleton"
import { resolveAssetUrl } from "../../config/apiBase.js"
import styles from "./CategoryProductSection.module.css"

/**
 * @param {object} props
 * @param {string} props.sectionId
 * @param {string} props.title
 * @param {string} props.lead
 * @param {string} [props.coverImageUrl]
 * @param {Array<{ id: string, name: string, price: string, imageUrl: string }>} props.products
 * @param {boolean} props.loaded
 * @param {"stone" | "canvas"} [props.variant]
 * @param {string} [props.htmlId] DOM id for anchors (defaults to sectionId)
 */
export default function CategoryProductSection({
  sectionId,
  title,
  lead,
  coverImageUrl,
  products,
  loaded,
  variant = "stone",
  htmlId,
}) {
  const list = products ?? []
  const showSkeleton = !loaded
  const showEmpty = loaded && list.length === 0
  const titleId = `${sectionId}-title`
  const domId = htmlId ?? sectionId
  return (
    <section
      className={`${styles.root} ${variant === "canvas" ? styles.canvas : styles.stone}`}
      id={domId}
      aria-labelledby={titleId}
      aria-busy={!loaded}
    >
      <div className={styles.head}>
        {coverImageUrl ? (
          <div className={styles.coverWrap}>
            <img
              className={styles.coverImg}
              src={resolveAssetUrl(coverImageUrl)}
              alt=""
            />
          </div>
        ) : null}
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.lead}>{lead}</p>
      </div>
      {showSkeleton ? (
        <ProductGridSkeleton animate />
      ) : showEmpty ? (
        <p className={styles.empty}>Aún no hay productos en esta categoría.</p>
      ) : (
        <div className={styles.grid}>
          {list.map((item) => (
            <ProductCard
              key={item.id}
              productId={item.id}
              name={item.name}
              price={item.price}
              imageUrl={item.imageUrl}
            />
          ))}
        </div>
      )}
    </section>
  )
}
