import { imageHero } from "../../data/content"
import styles from "./VideoHeroSection.module.css"

export default function VideoHeroSection({ htmlId = "hero-video" } = {}) {
  return (
    <section className={styles.root} id={htmlId} aria-labelledby="heroImageTitle">
      <div className={styles.frame}>
        <img
          className={styles.image}
          src={imageHero.imageUrl}
          alt=""
          loading="lazy"
        />
        <div className={styles.scrim} aria-hidden />
        <div className={styles.copy}>
          <h2 id="heroImageTitle" className={styles.title}>
            {imageHero.title}
          </h2>
          <p className={styles.description}>{imageHero.description}</p>
          <div className={styles.actions}>
            <a className={styles.link} href={imageHero.primaryCta.href}>
              {imageHero.primaryCta.label}
            </a>
            <a className={styles.link} href={imageHero.secondaryCta.href}>
              {imageHero.secondaryCta.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
