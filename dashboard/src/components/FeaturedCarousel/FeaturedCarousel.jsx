import { useEffect, useState } from "react"
import { carouselFeatured } from "../../data/content"
import { formatPriceUsd } from "../../utils/formatPriceUsd.js"
import styles from "./FeaturedCarousel.module.css"

const intervalMs = 5200

export default function FeaturedCarousel() {
  const [index, setIndex] = useState(0)
  const count = carouselFeatured.length

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((value) => (value + 1) % count)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [count])

  return (
    <section
      className={styles.root}
      id="featured"
      aria-roledescription="carrusel"
      aria-label="Productos destacados"
    >
      <div
        className={styles.track}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {carouselFeatured.map((item) => (
          <article key={item.id} className={styles.slide}>
            <img
              className={styles.image}
              src={item.imageUrl}
              alt=""
              loading={item.id === carouselFeatured[0].id ? "eager" : "lazy"}
            />
            <div className={styles.scrim} aria-hidden />
            <div className={styles.content}>
              <p className={styles.eyebrow}>{item.category}</p>
              <h2 className={styles.title}>{item.name}</h2>
              <p className={styles.tagline}>{item.tagline}</p>
              <p className={styles.price}>{formatPriceUsd(item.price)}</p>
            </div>
          </article>
        ))}
      </div>
      <div className={styles.dots} role="tablist" aria-label="Slide">
        {carouselFeatured.map((item, dotIndex) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.dot} ${dotIndex === index ? styles.dotActive : ""}`}
            aria-selected={dotIndex === index}
            aria-label={`Slide ${dotIndex + 1}`}
            onClick={() => setIndex(dotIndex)}
          />
        ))}
      </div>
    </section>
  )
}
