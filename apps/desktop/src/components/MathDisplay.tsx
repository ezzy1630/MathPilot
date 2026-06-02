import { useEffect, useRef, useState } from 'react'
import 'mathlive'
import { MathfieldElement } from 'mathlive'

MathfieldElement.fontsDirectory = '/mathlive-fonts'

export interface MathDisplayProps {
  value: string
  className?: string
  /** Screen-reader label; defaults to the raw LaTeX value. */
  ariaLabel?: string
  /** Defer mounting MathLive until the field is near the viewport (default true). */
  lazy?: boolean
}

export function MathDisplay({ value, className, ariaLabel, lazy = true }: MathDisplayProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const fieldRef = useRef<MathfieldElement | null>(null)
  const [mounted, setMounted] = useState(!lazy)

  useEffect(() => {
    if (!lazy || mounted) return
    const node = wrapperRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMounted(true)
          observer.disconnect()
        }
      },
      { rootMargin: '120px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [lazy, mounted])

  useEffect(() => {
    if (!mounted) return
    const field = fieldRef.current
    if (!field) return
    if (field.value !== value) {
      field.setValue(value, { silenceNotifications: true })
    }
  }, [value, mounted])

  const displayClass = className ?? 'math-display'

  return (
    <div ref={wrapperRef} className="math-display-wrap">
      {mounted ? (
        <math-field
          ref={fieldRef}
          className={displayClass}
          aria-label={ariaLabel ?? 'Problem statement'}
          read-only
          default-mode="math"
        />
      ) : (
        <span className={`${displayClass} math-display-placeholder`} aria-hidden />
      )}
    </div>
  )
}
