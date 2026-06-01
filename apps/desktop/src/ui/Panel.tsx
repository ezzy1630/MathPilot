import type { ReactNode } from 'react'

export function Panel({
  children,
  className = '',
  ariaLabel,
}: {
  children: ReactNode
  className?: string
  ariaLabel?: string
}) {
  return (
    <section className={`mp-panel ${className}`.trim()} aria-label={ariaLabel}>
      {children}
    </section>
  )
}
