import { useMemo } from "react"
import { Link } from "react-router-dom"
import AppHeader from "../../components/AppHeader/AppHeader"
import AppFooter from "../../components/AppFooter/AppFooter"
import ParallaxHeroSection from "../../components/ParallaxHeroSection/ParallaxHeroSection"
import { useProducts } from "../../context/ProductsContext"
import { landingHeroSecondary } from "../../data/content"
import styles from "./CollectionsPage.module.css"

const FALLBACK_COVER = landingHeroSecondary.imageUrl

export default function CollectionsPage() {
  const { shopCollections, loaded } = useProducts()

  const collections = useMemo(() => {
    const list = Array.isArray(shopCollections) ? [...shopCollections] : []
    list.sort((a, b) => String(a.name).localeCompare(String(b.name), "es"))
    return list
  }, [shopCollections])

  return (
    <div className="page">
      <AppHeader variant="landing" landingSolid />
      <main className={styles.main}>
        {!loaded ? (
          <section className={styles.status} aria-busy="true">
            <p className={styles.statusText}>Cargando colecciones…</p>
          </section>
        ) : collections.length === 0 ? (
          <section className={styles.status}>
            <h1 className={styles.statusTitle}>Colecciones</h1>
            <p className={styles.statusText}>
              Aún no hay colecciones publicadas. Cuando las crees en el panel de
              administración, aparecerán aquí con su imagen y nombre.
            </p>
            <Link className={styles.statusLink} to="/tienda">
              Ir a la tienda
            </Link>
          </section>
        ) : (
          collections.map((collection) => (
            <ParallaxHeroSection
              key={collection.id}
              htmlId={`coleccion-${collection.slug}`}
              imageUrl={collection.coverImageUrl?.trim() || FALLBACK_COVER}
              imageAlt=""
              overlayPlacement="center"
              ariaLabel={collection.name}
            >
              <h2 className={styles.heroTitle}>{collection.name}</h2>
            </ParallaxHeroSection>
          ))
        )}
      </main>
      <AppFooter />
    </div>
  )
}
