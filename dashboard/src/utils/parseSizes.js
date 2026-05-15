/** "XS, S, M, L" → ["XS", "S", "M", "L"] */
export function parseSizesInput(raw) {
  if (raw == null) return []
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean)
  }
  const s = String(raw).trim()
  if (!s) return []
  return s
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function normalizeSizeKey(size) {
  return String(size ?? "")
    .trim()
    .toUpperCase()
}
