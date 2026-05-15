import AppHeader from "../../components/AppHeader/AppHeader"
import AppFooter from "../../components/AppFooter/AppFooter"
import ParallaxHeroSection from "../../components/ParallaxHeroSection/ParallaxHeroSection"
import LandingProductShowcase from "../../components/LandingProductShowcase/LandingProductShowcase"
import ProductTypesCarousel from "../../components/ProductTypesCarousel/ProductTypesCarousel"
import { useProducts } from "../../context/ProductsContext"
import {
  imageHero,
  landingHeroSecondary,
  landingPromoSpotlightImage,
} from "../../data/content"
import styles from "./HomePage.module.css"

export default function HomePage() {
  const {
    shopCategories,
    recentProductsForLanding,
    bestsellerProductsForLanding,
    loaded,
  } = useProducts()

  return (
    <div className="page">
      <AppHeader variant="landing" />
      <main className={styles.main}>
        <ParallaxHeroSection htmlId="landing-hero" imageUrl={imageHero.imageUrl} />

        <div className={styles.jumpMark} id="tienda" aria-hidden />

        <LandingProductShowcase
          sectionId="nuevos-productos"
          htmlId="nuevos"
          title="Nuevos productos"
          lead="Las últimas piezas cargadas desde el panel de administración, ordenadas por fecha de alta."
          products={recentProductsForLanding}
          loaded={loaded}
          promoImageUrl={landingPromoSpotlightImage.imageUrl}
          variant="stone"
        />

        <ProductTypesCarousel categories={shopCategories} />

        <ParallaxHeroSection
          htmlId="landing-pantalones-hero"
          imageUrl={landingHeroSecondary.imageUrl}
          overlayPlacement="center"
          ariaLabel="Pantalones y shorts"
        >
          <div className={styles.pantsOverlay}>
            <h2 className={styles.pantsTitle}>Pantalones y shorts</h2>
            <button type="button" className={styles.pantsCta}>
              Ver colección
            </button>
          </div>
        </ParallaxHeroSection>

        <LandingProductShowcase
          sectionId="mas-vendidos"
          htmlId="mas-vendidos"
          title="Más vendidos"
          lead="Selección destacada del catálogo. Cuando tengamos datos de ventas reales, este bloque reflejará los líderes."
          products={bestsellerProductsForLanding}
          loaded={loaded}
          promoImageUrl={landingPromoSpotlightImage.imageUrl}
          variant="canvas"
        />
      </main>
      <AppFooter />
    </div>
  )
}
