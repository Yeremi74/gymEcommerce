import { clientConfig } from "./clientConfig.js"
import { getClientBrowserTitle, getClientFaviconHref } from "./clientBranding.js"

export function applyClientTheme() {
  const root = document.documentElement
  root.style.setProperty("--accent", clientConfig.accent)
  root.style.setProperty("--accentInk", clientConfig.accentInk)

  document.title = getClientBrowserTitle()

  const iconHref = getClientFaviconHref()
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
