import { useEffect, useRef } from "react"
import { resolveAssetUrl } from "../../config/apiBase.js"
import styles from "./ParallaxHeroSection.module.css"

/**
 * Hero a altura de viewport con imagen y ligero efecto parallax al hacer scroll.
 *
 * @param {object} props
 * @param {string} props.htmlId
 * @param {string} props.imageUrl
 * @param {string} [props.imageAlt]
 * @param {import("react").ReactNode} [props.children] Contenido superpuesto (p. ej. título y CTA).
 * @param {"center" | "none"} [props.overlayPlacement]
 */
export default function ParallaxHeroSection({
  htmlId = "landing-hero",
  imageUrl,
  imageAlt = "",
  children,
  overlayPlacement = "none",
  ariaLabel = "Portada",
}) {
  const rootRef = useRef(null)
  const imgRef = useRef(null)

  useEffect(() => {
    const img = imgRef.current
    const root = rootRef.current
    if (!img || !root) return undefined

    const update = () => {
      const rect = root.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const centerY = rect.top + rect.height / 2
      const norm = (centerY - vh / 2) / (vh + rect.height)
      const offset = Math.max(-1, Math.min(1, norm)) * 72
      img.style.transform = `translate3d(0, ${offset}px, 0) scale(1.08)`
    }

    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update, { passive: true })
    update()
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  return (
    <section
      ref={rootRef}
      className={styles.root}
      id={htmlId}
      aria-label={ariaLabel}
    >
      <div className={styles.clip}>
        <img
          ref={imgRef}
          className={styles.image}
          src={resolveAssetUrl(imageUrl)}
          alt={imageAlt}
          decoding="async"
          fetchPriority={htmlId === "landing-hero" ? "high" : "auto"}
        />
        <div
          className={
            children && overlayPlacement === "center"
              ? `${styles.scrim} ${styles.scrimStrong}`
              : styles.scrim
          }
          aria-hidden
        />
      </div>
      {children && overlayPlacement === "center" ? (
        <div className={styles.overlayCenter}>{children}</div>
      ) : null}
    </section>
  )
}
