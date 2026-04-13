const raw = import.meta.env.VITE_API_BASE ?? ""

export const apiBase = typeof raw === "string" ? raw.replace(/\/$/, "") : ""

export function apiUrl(path) {
  const segment = path.startsWith("/") ? path : `/${path}`
  return apiBase ? `${apiBase}${segment}` : segment
}

export function resolveAssetUrl(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return pathOrUrl
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl
  }
  if (apiBase && pathOrUrl.startsWith("/uploads")) {
    return `${apiBase}${pathOrUrl}`
  }
  return pathOrUrl
}
