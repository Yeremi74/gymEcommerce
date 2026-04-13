import { Link } from "react-router-dom"
import { resolveAssetUrl } from "../../config/apiBase.js"
import ProductQuickActions from "../ProductQuickActions/ProductQuickActions"
import { formatPriceUsd } from "../../utils/formatPriceUsd.js"
import styles from "./FavoriteProductCard.module.css"

export default function FavoriteProductCard({ productId, name, price, imageUrl }) {
  return (
    <article className={styles.root}>
      <Link className={styles.thumbWrap} to={`/products/${productId}`}>
        <img
          className={styles.thumb}
          src={resolveAssetUrl(imageUrl)}
          alt=""
          loading="lazy"
          draggable={false}
        />
      </Link>
      <div className={styles.middle}>
        <Link className={styles.name} to={`/products/${productId}`}>
          {name}
        </Link>
        <p className={styles.price}>{formatPriceUsd(price)}</p>
      </div>
      <ProductQuickActions productId={productId} variant="row" />
    </article>
  )
}
