import { clientConfig } from "./clientConfig.js"

export function applyClientTheme() {
  const root = document.documentElement
  root.style.setProperty("--accent", clientConfig.accent)
  root.style.setProperty("--accentInk", clientConfig.accentInk)

  if (typeof clientConfig.browserTitle === "string" && clientConfig.browserTitle.trim()) {
    document.title = clientConfig.browserTitle.trim()
  }

  const iconHref =
    typeof clientConfig.faviconUrl === "string" && clientConfig.faviconUrl.trim()
      ? clientConfig.faviconUrl.trim()
      : typeof clientConfig.logoUrl === "string" && clientConfig.logoUrl.trim()
        ? clientConfig.logoUrl.trim()
        : ""

  if (iconHref) {
    let link = document.querySelector('link[rel="icon"]')
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }
    link.href = iconHref
  }
}
