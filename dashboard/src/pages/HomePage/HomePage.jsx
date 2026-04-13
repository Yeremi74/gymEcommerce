import AppHeader from "../../components/AppHeader/AppHeader"
import FeaturedCarousel from "../../components/FeaturedCarousel/FeaturedCarousel"
import VideoHeroSection from "../../components/VideoHeroSection/VideoHeroSection"
import BenefitsSection from "../../components/BenefitsSection/BenefitsSection"
import BarSupplementsSection from "../../components/BarSupplementsSection/BarSupplementsSection"
import PowderSupplementsSection from "../../components/PowderSupplementsSection/PowderSupplementsSection"
import AppFooter from "../../components/AppFooter/AppFooter"
import styles from "./HomePage.module.css"

export default function HomePage() {
  return (
    <div className="page">
      <AppHeader />
      <main className={styles.main}>
        <FeaturedCarousel />
        <BenefitsSection />
        <BarSupplementsSection />
        <VideoHeroSection />
        <PowderSupplementsSection />
      </main>
      <AppFooter />
    </div>
  )
}
