import { useEffect, useMemo } from 'react'
import type { MathPilotState } from '../domain/types'

export function ToastStack({
  state,
  onDismiss,
}: {
  state: MathPilotState
  onDismiss: (id: string) => void
}) {
  const toasts = useMemo(() => state.toastQueue ?? [], [state.toastQueue])
  useEffect(() => {
    if (!toasts.length) return
    const timers = toasts.map((t) => window.setTimeout(() => onDismiss(t.id), 3200))
    return () => timers.forEach(clearTimeout)
  }, [toasts, onDismiss])

  if (!toasts.length) return null
  return (
    <div className="mp-toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`mp-toast mp-toast-${t.tone}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
