/** Convierte texto de precio a formato de catálogo ($12.34). */
export function parseProductPrice(raw) {
  const s = String(raw ?? "")
    .trim()
    .replace(/^\$/, "")
    .replace(/\s/g, "")
    .replace(",", ".")
  if (!s) {
    return { error: "Indica el precio del producto." }
  }
  const n = parseFloat(s)
  if (!Number.isFinite(n) || n <= 0) {
    return { error: "El precio debe ser un número mayor a 0." }
  }
  return { value: `$${n.toFixed(2)}` }
}
