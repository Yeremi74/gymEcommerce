import { useEffect, useRef } from "react"
import styles from "./GoogleSignInButton.module.css"

export default function GoogleSignInButton({ clientId, onCredential, disabled }) {
  const divRef = useRef(null)
  const cbRef = useRef(onCredential)
  cbRef.current = onCredential

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    const timer = setInterval(() => {
      if (cancelled) return
      if (!window.google?.accounts?.id) return
      clearInterval(timer)
      const el = divRef.current
      if (!el || cancelled) return
      el.innerHTML = ""
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          cbRef.current?.(response)
        },
        locale: "es",
      })
      window.google.accounts.id.renderButton(el, {
        theme: "outline",
        size: "large",
        width: 360,
        text: "continue_with",
        locale: "es",
      })
    }, 50)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [clientId])

  if (!clientId) return null

  return (
    <div
      className={`${styles.wrap} ${disabled ? styles.wrapDisabled : ""}`}
      ref={divRef}
    />
  )
}
