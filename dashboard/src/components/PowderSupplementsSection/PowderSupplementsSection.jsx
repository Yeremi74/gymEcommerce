import { useProducts } from "../../context/ProductsContext"
import ProductCard from "../ProductCard/ProductCard"
import ProductGridSkeleton from "../ProductGridSkeleton/ProductGridSkeleton"
import styles from "./PowderSupplementsSection.module.css"

export default function PowderSupplementsSection() {
  const { powderProducts, loaded } = useProducts()
  const showSkeleton = !loaded || powderProducts.length === 0
  return (
    <section
      className={styles.root}
      id="powders"
      aria-labelledby="powderSectionTitle"
      aria-busy={!loaded}
    >
      <div className={styles.head}>
        <h2 id="powderSectionTitle" className={styles.title}>
          En pote: creatina y más
        </h2>
        <p className={styles.lead}>
          Polvos para dosificar con precisión: creatina, aminoácidos y apoyo al
          rendimiento.
        </p>
      </div>
      {showSkeleton ? (
        <ProductGridSkeleton animate={!loaded} />
      ) : (
        <div className={styles.grid}>
          {powderProducts.map((item) => (
            <ProductCard
              key={item.id}
              productId={item.id}
              name={item.name}
              price={item.price}
              imageUrl={item.imageUrl}
            />
          ))}
        </div>
      )}
    </section>
  )
}
