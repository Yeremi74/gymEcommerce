import { Link, useLocation, useNavigate } from "react-router-dom"
import { useState } from "react"
import AppHeader from "../../components/AppHeader/AppHeader"
import GoogleSignInButton from "../../components/GoogleSignInButton/GoogleSignInButton"
import { useAuth } from "../../context/AuthContext"
import { authRequest } from "../../api/authClient"
import styles from "./AuthPage.module.css"

const googleClientId =
  typeof import.meta.env.VITE_GOOGLE_CLIENT_ID === "string"
    ? import.meta.env.VITE_GOOGLE_CLIENT_ID.trim()
    : ""
console.log('googleClientId',googleClientId)
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const redirectTo =
    typeof location.state?.from === "string" &&
    location.state.from.startsWith("/") &&
    !location.state.from.startsWith("//")
      ? location.state.from
      : "/"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setLoading(true)
    try {
      const data = await authRequest("/api/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      })
      login(data)
      navigate(redirectTo === "/login" ? "/" : redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleCredential(response) {
    if (!response?.credential) return
    setError("")
    setLoading(true)
    try {
      const data = await authRequest("/api/auth/google", {
        method: "POST",
        body: { idToken: response.credential },
      })
      login(data)
      navigate(redirectTo === "/login" ? "/" : redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión con Google")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>Iniciar sesión</h1>
          <p className={styles.subtitle}>Accede con tu cuenta para seguir tu pedido y favoritos.</p>
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-email">
                Correo electrónico
              </label>
              <input
                id="login-email"
                className={styles.input}
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-password">
                Contraseña
              </label>
              <input
                id="login-password"
                className={styles.input}
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
              <button className={styles.submit} type="submit" disabled={loading}>
                {loading ? "Entrando…" : "Entrar"}
              </button>
            </form>
            {googleClientId ? (
              <>
                <div className={styles.authDivider} aria-hidden="true">
                  o
                </div>
                <div className={styles.googleBlock}>
                  <GoogleSignInButton
                    clientId={googleClientId}
                    onCredential={handleGoogleCredential}
                    disabled={loading}
                  />
                </div>
              </>
            ) : null}
            <p className={styles.footer}>
            ¿No tienes cuenta?{" "}
            <Link className={styles.footerLink} to="/register">
              Regístrate
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
