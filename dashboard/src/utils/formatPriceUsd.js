export function formatPriceUsd(raw) {
  if (raw == null) return ""
  const s = String(raw).trim()
  if (!s) return ""
  if (s.startsWith("$")) return s
  return `$${s}`
}
