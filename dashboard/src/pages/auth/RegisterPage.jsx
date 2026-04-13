import { Link, useNavigate } from "react-router-dom"
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

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setLoading(true)
    try {
      const data = await authRequest("/api/auth/register", {
        method: "POST",
        body: { name: name.trim(), email: email.trim(), password },
      })
      login(data)
      navigate("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse")
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
      navigate("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse con Google")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>Crear cuenta</h1>
          <p className={styles.subtitle}>Regístrate para comprar más rápido y guardar tus datos.</p>
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="register-name">
                Nombre
              </label>
              <input
                id="register-name"
                className={styles.input}
                type="text"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="register-email">
                Correo electrónico
              </label>
              <input
                id="register-email"
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
              <label className={styles.label} htmlFor="register-password">
                Contraseña
              </label>
              <input
                id="register-password"
                className={styles.input}
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
            </div>
              <button className={styles.submit} type="submit" disabled={loading}>
                {loading ? "Creando cuenta…" : "Registrarme"}
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
            ¿Ya tienes cuenta?{" "}
            <Link className={styles.footerLink} to="/login">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
