import styles from "./ProductGridSkeleton.module.css"

export default function ProductGridSkeleton({ animate = true, lines = 5 }) {
  return (
    <div className={styles.root} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${styles.line} ${animate ? styles.shimmer : styles.static}`}
        />
      ))}
    </div>
  )
}
