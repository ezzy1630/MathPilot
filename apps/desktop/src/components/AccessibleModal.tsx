import { useEffect, useId, useRef, type ReactNode } from 'react'

export function AccessibleModal({
  children,
  onClose,
  title,
  className = '',
  size = 'default',
}: {
  children: ReactNode
  onClose: () => void
  title?: string
  className?: string
  size?: 'default' | 'palette'
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const modalClass = `mp-modal ${size === 'palette' ? 'mp-modal-palette' : ''} ${className}`.trim()

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current
    panel?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !panel) return
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (!focusable.length) {
        e.preventDefault()
        panel.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [onClose])

  return (
    <div
      className="mp-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      onClick={onClose}
    >
      <div className={modalClass} ref={panelRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        {title && (
          <h2 className="mp-modal-title" id={titleId}>
            {title}
          </h2>
        )}
        {size === 'palette' ? <div className="mp-modal-scroll">{children}</div> : children}
      </div>
    </div>
  )
}
