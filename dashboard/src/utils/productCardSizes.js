import { normalizeSizeKey } from "./parseSizes.js"

/** Tallas mostradas siempre en la card al hacer hover. */
export const CARD_DISPLAY_SIZES = ["S", "M", "L", "XL"]

/**
 * @param {object | null | undefined} product
 * @returns {{ size: string, available: boolean }[]}
 */
export function getCardSizeAvailability(product) {
  const bySize = product?.stockBySize
  const hasPerSize =
    bySize && typeof bySize === "object" && !Array.isArray(bySize) && Object.keys(bySize).length > 0

  const normalizedStock = new Map()
  if (hasPerSize) {
    for (const [key, val] of Object.entries(bySize)) {
      const sz = normalizeSizeKey(key)
      if (!sz) continue
      const n = parseInt(val, 10)
      normalizedStock.set(sz, Number.isFinite(n) && n >= 0 ? n : 0)
    }
  }

  return CARD_DISPLAY_SIZES.map((size) => {
    let qty = 0
    if (hasPerSize) {
      qty = normalizedStock.get(size) ?? 0
    } else if (typeof product?.currentStock === "number") {
      qty = product.currentStock > 0 ? 1 : 0
    } else if (product) {
      // Catálogo sin inventario por talla configurado: mostrar tallas disponibles
      qty = 1
    }
    return { size, available: qty >= 1 }
  })
}
