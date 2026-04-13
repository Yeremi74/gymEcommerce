import { useProducts } from "../../context/ProductsContext"
import ProductCard from "../ProductCard/ProductCard"
import ProductGridSkeleton from "../ProductGridSkeleton/ProductGridSkeleton"
import styles from "./BarSupplementsSection.module.css"

export default function BarSupplementsSection() {
  const { barProducts, loaded } = useProducts()
  const showSkeleton = !loaded || barProducts.length === 0
  return (
    <section
      className={styles.root}
      id="bars"
      aria-labelledby="barSectionTitle"
      aria-busy={!loaded}
    >
      <div className={styles.head}>
        <h2 id="barSectionTitle" className={styles.title}>
          Suplementos alimenticios
        </h2>
        <p className={styles.lead}>
          Barras con macros claros: para llevar al bolso o romper el hambre entre
          comidas.
        </p>
      </div>
      {showSkeleton ? (
        <ProductGridSkeleton animate={!loaded} />
      ) : (
        <div className={styles.grid}>
          {barProducts.map((item) => (
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
