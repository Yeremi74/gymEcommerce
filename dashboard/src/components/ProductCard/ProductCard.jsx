import { Link } from "react-router-dom"
import { resolveAssetUrl } from "../../config/apiBase.js"
import ProductQuickActions from "../ProductQuickActions/ProductQuickActions"
import { formatPriceUsd } from "../../utils/formatPriceUsd.js"
import styles from "./ProductCard.module.css"

export default function ProductCard({ name, price, imageUrl, role: roleProp, productId, badge }) {
  const mediaBlock = (
    <div className={styles.mediaBlock}>
      <div className={styles.media}>
        {badge ? <span className={styles.badge}>{badge}</span> : null}
        <img
          src={resolveAssetUrl(imageUrl)}
          alt=""
          className={styles.image}
          loading="lazy"
          draggable={false}
        />
      </div>
    </div>
  )
  const body = (
    <div className={styles.body}>
      <h3 className={styles.title}>{name}</h3>
      <p className={styles.price}>{formatPriceUsd(price)}</p>
    </div>
  )
  if (productId) {
    return (
      <article className={styles.root} role={roleProp}>
        <div className={styles.cardInner}>
          <Link className={styles.cardLink} to={`/products/${productId}`}>
            {mediaBlock}
            {body}
          </Link>
          <div className={styles.overlayActions}>
            <ProductQuickActions productId={productId} variant="overlay" />
          </div>
        </div>
      </article>
    )
  }
  return (
    <article className={styles.root} role={roleProp}>
      <div className={styles.staticInner}>
        {mediaBlock}
        {body}
      </div>
    </article>
  )
}
