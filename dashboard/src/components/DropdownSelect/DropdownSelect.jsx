import { useEffect, useId, useRef, useState } from "react"
import styles from "./DropdownSelect.module.css"

export default function DropdownSelect({
  value,
  onChange,
  options,
  id: idProp,
  disabled,
  className,
}) {
  const generatedId = useId()
  const listId = `${generatedId}-list`
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? ""

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
        setHighlightIndex(-1)
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false)
        setHighlightIndex(-1)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const selectIndex = (index) => {
    const opt = options[index]
    if (!opt) return
    onChange(opt.value)
    setOpen(false)
    setHighlightIndex(-1)
  }

  const handleTriggerKeyDown = (e) => {
    if (disabled) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      if (open && highlightIndex >= 0) {
        selectIndex(highlightIndex)
      } else {
        setOpen((o) => !o)
      }
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setHighlightIndex(0)
      } else {
        setHighlightIndex((i) =>
          i < options.length - 1 ? i + 1 : 0,
        )
      }
      return
    }
    if (e.key === "ArrowUp" && open) {
      e.preventDefault()
      setHighlightIndex((i) =>
        i <= 0 ? options.length - 1 : i - 1,
      )
    }
  }

  const handleListKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      if (highlightIndex >= 0) selectIndex(highlightIndex)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIndex((i) =>
        i < options.length - 1 ? i + 1 : 0,
      )
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIndex((i) =>
        i <= 0 ? options.length - 1 : i - 1,
      )
    }
  }

  const triggerId = idProp ?? `${generatedId}-trigger`

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(" ")}>
      <button
        type="button"
        id={triggerId}
        className={styles.trigger}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => {
          if (disabled) return
          setOpen((o) => !o)
          if (!open) setHighlightIndex(-1)
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{selectedLabel}</span>
        <span className={styles.triggerIcon} aria-hidden>
          <svg
            className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {open ? (
        <div
          id={listId}
          role="listbox"
          tabIndex={-1}
          className={styles.list}
          onKeyDown={handleListKeyDown}
        >
          {options.map((opt, index) => (
            <div
              key={String(opt.value)}
              role="option"
              aria-selected={value === opt.value}
              className={[
                styles.option,
                value === opt.value ? styles.optionSelected : "",
                highlightIndex === index ? styles.optionHighlight : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={() => setHighlightIndex(index)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectIndex(index)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
