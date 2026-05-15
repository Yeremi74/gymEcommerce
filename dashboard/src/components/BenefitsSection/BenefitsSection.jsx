import { homeBenefits } from "../../data/content"
import styles from "./BenefitsSection.module.css"

const benefitIcons = {
  shipping: (
    <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 7h11v10H3V7zm11 4h4l3 3v3h-7V11z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M7 21h.01M17 21h.01M7 17v4M17 17v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  quality: (
    <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.9 6.2 18l.9-5.4-3.9-3.8 5.4-.8L12 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  secure: (
    <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  support: (
    <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.9L3 21l1.5-3.5A8.38 8.38 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
}

export default function BenefitsSection() {
  return (
    <section
      className={styles.root}
      id="beneficios"
      aria-labelledby="benefitsSectionTitle"
    >
      <div className={styles.head}>
        <h2 id="benefitsSectionTitle" className={styles.title}>
          Por qué comprar con nosotros
        </h2>
        <p className={styles.lead}>
          Streetwear con buena base: prendas que conviven entre sí y aguantan el ritmo de la ciudad.
        </p>
      </div>
      <ul className={styles.grid}>
        {homeBenefits.map((item) => (
          <li key={item.id} className={styles.card}>
            <div className={styles.iconWrap} aria-hidden>
              {benefitIcons[item.icon]}
            </div>
            <h3 className={styles.cardTitle}>{item.title}</h3>
            <p className={styles.cardText}>{item.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
