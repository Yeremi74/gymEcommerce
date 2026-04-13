import { Link, Navigate, useParams } from "react-router-dom"
import AppHeader from "../../components/AppHeader/AppHeader"
import AppFooter from "../../components/AppFooter/AppFooter"
import { articlesBySlug, legacyArticleSlugRedirects } from "../../data/content"
import styles from "./ArticlePage.module.css"

export default function ArticlePage() {
  const { slug } = useParams()
  const legacyTarget = slug ? legacyArticleSlugRedirects[slug] : undefined
  if (legacyTarget) {
    return <Navigate to={`/articles/${legacyTarget}`} replace />
  }
  const article = slug ? articlesBySlug[slug] : null

  if (!article) {
    return (
      <div className="page">
        <AppHeader />
        <main className={styles.main}>
          <p className={styles.missing}>Artículo no encontrado.</p>
          <Link className={styles.back} to="/">
            Volver al inicio
          </Link>
        </main>
        <AppFooter />
      </div>
    )
  }

  return (
    <div className="page">
      <AppHeader />
      <article className={styles.article}>
        <div className={styles.shell}>
          <Link className={styles.back} to="/">
            ← Inicio
          </Link>
          <p className={styles.date}>{article.date}</p>
          <h1 className={styles.pageTitle}>{article.title}</h1>
          <p className={styles.intro}>{article.intro}</p>
          {article.sections.map((section) => (
            <section key={section.heading} className={styles.block}>
              <h2 className={styles.blockTitle}>{section.heading}</h2>
              <p className={styles.blockBody}>{section.body}</p>
            </section>
          ))}
        </div>
      </article>
      <AppFooter />
    </div>
  )
}
