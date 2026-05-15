import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { getClientBrowserTitle, getClientFaviconHref } from './src/config/clientBranding.js'

function clientBrandingPlugin() {
  const title = getClientBrowserTitle()
  const favicon = getClientFaviconHref()

  return {
    name: 'client-branding',
    transformIndexHtml(html) {
      return html
        .replaceAll('%CLIENT_BROWSER_TITLE%', title)
        .replaceAll('%CLIENT_FAVICON_URL%', favicon)
    },
  }
}

export default defineConfig({
  plugins: [clientBrandingPlugin(), react()],
  css: {
    devSourcemap: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})
