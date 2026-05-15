import { Link } from "react-router-dom"
import { clientConfig } from "../../config/clientConfig.js"
import styles from "./AppFooter.module.css"

export default function AppFooter() {
  return (
    <footer className={styles.root}>
      <div className={styles.inner}>
        <div>
          <p className={styles.brandLogo}>{clientConfig.siteName}</p>
          <p className={styles.tagline}>{clientConfig.tagline}</p>
        </div>
        <div className={styles.cols}>
          <div className={styles.col}>
            <p className={styles.label}>Explorar</p>
            <a className={styles.link} href="#featured">
              Destacados
            </a>
            <a className={styles.link} href="#tendencia">
              En tendencia
            </a>
            <a className={styles.link} href="#pantalones">
              Pantalones
            </a>
            <a className={styles.link} href="#hoodies">
              Hoodies
            </a>
            <a className={styles.link} href="#camisetas">
              Camisetas
            </a>
            <Link className={styles.link} to="/articles/post-workout-protein">
              Primera guía
            </Link>
          </div>
          <div className={styles.col}>
            <p className={styles.label}>Legal</p>
            <span className={styles.muted}>Aviso legal</span>
            <span className={styles.muted}>Privacidad</span>
            <span className={styles.muted}>Cookies</span>
            <Link className={styles.link} to="/admin">
              Administración
            </Link>
          </div>
        </div>
      </div>
      <p className={styles.copy}>© {new Date().getFullYear()} {clientConfig.siteName}</p>
    </footer>
  )
}
