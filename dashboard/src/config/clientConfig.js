/**
 * Personalización por cliente (white-label).
 * Editá solo este archivo para cada despliegue: se empaqueta con Vite y no requiere peticiones extra.
 *
 * - logoUrl / faviconUrl: archivos en la carpeta `public/` del dashboard (ej. poné `mi-logo.svg` en `public/` y usá `/mi-logo.svg`).
 * - accent / accentInk: color corporativo y texto sobre ese color (botones, CTAs, foco).
 */
export const clientConfig = {
  siteName: "Forge Moda",
  /** Ruta pública al logo (recomendado: PNG o SVG en `dashboard/public/`) */
  logoUrl: "/favicon.svg",
  /** Icono de pestaña; si no lo definís, se usa logoUrl */
  faviconUrl: "/favicon.svg",
  tagline: "Streetwear curado. Menos ruido, más calle.",
  accent: "#c8f530",
  accentInk: "#1a1c0c",
  /** Título de la pestaña del navegador */
  browserTitle: "Forge Moda — Streetwear",
}
