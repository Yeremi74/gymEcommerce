import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { authRequest } from "../api/authClient"

const STORAGE_KEY = "gym_ecommerce_auth"

const AuthContext = createContext(null)

function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.token !== "string" || !parsed.user) return null
    return { token: parsed.token, user: parsed.user }
  } catch {
    return null
  }
}

function writeStoredSession(session) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!session) {
      setReady(true)
      return
    }
    let cancelled = false
    authRequest("/api/auth/me", { token: session.token })
      .then((data) => {
        if (cancelled) return
        const next = { token: session.token, user: data.user }
        setSession(next)
        writeStoredSession(next)
      })
      .catch(() => {
        if (cancelled) return
        writeStoredSession(null)
        setSession(null)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback((payload) => {
    const next = { token: payload.token, user: payload.user }
    writeStoredSession(next)
    setSession(next)
  }, [])

  const logout = useCallback(() => {
    writeStoredSession(null)
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      ready,
      login,
      logout,
    }),
    [session, ready, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}
