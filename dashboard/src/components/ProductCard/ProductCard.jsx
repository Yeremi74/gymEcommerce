import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { resolveAssetUrl } from "../../config/apiBase.js"
import { useProducts } from "../../context/ProductsContext"
import { getProductGallery } from "../../data/content"
import { getCardSizeAvailability } from "../../utils/productCardSizes.js"
import ProductQuickActions from "../ProductQuickActions/ProductQuickActions"
import { formatPriceUsd } from "../../utils/formatPriceUsd.js"
import styles from "./ProductCard.module.css"

function IconChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 6l-6 6 6 6"
      />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6l6 6-6 6"
      />
    </svg>
  )
}

export default function ProductCard({
  name,
  price,
  imageUrl,
  imageUrls,
  role: roleProp,
  productId,
  badge,
}) {
  const { getProductById } = useProducts()
  const product = productId ? getProductById(productId) : null

  const displayName = product?.name ?? name
  const displayPrice = product?.price ?? price

  const gallery = useMemo(() => {
    if (product) {
      const urls = getProductGallery(product)
      if (urls.length > 0) return urls
    }
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      return imageUrls
    }
    if (imageUrl) return [imageUrl]
    return []
  }, [product, imageUrls, imageUrl])

  const [carouselIndex, setCarouselIndex] = useState(0)
  const sizeRows = useMemo(
    () => getCardSizeAvailability(product),
    [product],
  )

  const resetCarousel = useCallback(() => {
    setCarouselIndex(0)
  }, [])

  const goPrev = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (gallery.length <= 1) return
    setCarouselIndex((i) => (i - 1 + gallery.length) % gallery.length)
  }

  const goNext = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (gallery.length <= 1) return
    setCarouselIndex((i) => (i + 1) % gallery.length)
  }

  const activeImage = gallery[carouselIndex] ?? gallery[0]

  const mediaBlock = (
    <div
      className={styles.mediaBlock}
      onMouseLeave={resetCarousel}
    >
      <div className={styles.media}>
        {badge ? <span className={styles.badge}>{badge}</span> : null}
        {activeImage ? (
          <img
            src={resolveAssetUrl(activeImage)}
            alt=""
            className={styles.image}
            loading="lazy"
            draggable={false}
          />
        ) : null}
      </div>

      {gallery.length > 1 ? (
        <div className={styles.carouselControls} aria-hidden>
          <button
            type="button"
            className={styles.carouselBtn}
            onClick={goPrev}
            tabIndex={-1}
            aria-label="Imagen anterior"
          >
            <IconChevronLeft />
          </button>
          <button
            type="button"
            className={styles.carouselBtn}
            onClick={goNext}
            tabIndex={-1}
            aria-label="Imagen siguiente"
          >
            <IconChevronRight />
          </button>
        </div>
      ) : null}
    </div>
  )

  const body = (
    <div className={styles.body}>
      <div className={styles.bodyDefault}>
        <h3 className={styles.title}>{displayName}</h3>
        <p className={styles.price}>{formatPriceUsd(displayPrice)}</p>
      </div>
      <div className={styles.bodyHover} aria-hidden>
        <p className={styles.sizesLabel}>Tallas</p>
        <ul className={styles.sizeList}>
          {sizeRows.map(({ size, available }) => (
            <li key={size}>
              <span
                className={`${styles.sizeChip} ${available ? styles.sizeAvailable : styles.sizeUnavailable}`}
              >
                {size}
              </span>
            </li>
          ))}
        </ul>
      </div>
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
