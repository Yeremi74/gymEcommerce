import { Link } from "react-router-dom"
import { siteName } from "../../data/content"
import styles from "./AppFooter.module.css"

export default function AppFooter() {
  return (
    <footer className={styles.root}>
      <div className={styles.inner}>
        <div>
          <p className={styles.brandLogo}>{siteName}</p>
          <p className={styles.tagline}>
            Suplementos con criterio. Entrena con orden.
          </p>
        </div>
        <div className={styles.cols}>
          <div className={styles.col}>
            <p className={styles.label}>Explorar</p>
            <a className={styles.link} href="#featured">
              Destacados
            </a>
            <a className={styles.link} href="#bars">
              Barras
            </a>
            <a className={styles.link} href="#powders">
              Potes
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
      <p className={styles.copy}>© {new Date().getFullYear()} {siteName}</p>
    </footer>
  )
}
