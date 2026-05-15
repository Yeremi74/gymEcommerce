import { clientConfig } from "./clientConfig.js"

export function getClientBrowserTitle() {
  if (typeof clientConfig.browserTitle === "string" && clientConfig.browserTitle.trim()) {
    return clientConfig.browserTitle.trim()
  }
  if (typeof clientConfig.siteName === "string" && clientConfig.siteName.trim()) {
    return clientConfig.siteName.trim()
  }
  return "Dashboard"
}

export function getClientFaviconHref() {
  if (typeof clientConfig.faviconUrl === "string" && clientConfig.faviconUrl.trim()) {
    return clientConfig.faviconUrl.trim()
  }
  if (typeof clientConfig.logoUrl === "string" && clientConfig.logoUrl.trim()) {
    return clientConfig.logoUrl.trim()
  }
  return "/favicon.svg"
}
