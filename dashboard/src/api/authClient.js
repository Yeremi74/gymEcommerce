import { apiUrl } from "../config/apiBase.js"

async function parseJsonResponse(res) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

export async function authRequest(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(apiUrl(path), {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const data = await parseJsonResponse(res)
  if (!res.ok) {
    const message = typeof data.error === "string" ? data.error : "Error de red"
    throw new Error(message)
  }
  return data
}
