import type { ReactNode } from 'react'

export function Card({ children, className = '', elevated = true }: { children: ReactNode; className?: string; elevated?: boolean }) {
  return <div className={`mp-card ${elevated ? 'mp-card-elevated' : ''} ${className}`.trim()}>{children}</div>
}

export function CardHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <header className="mp-card-header">
      {eyebrow && <p className="mp-eyebrow">{eyebrow}</p>}
      <h2 className="mp-card-title">{title}</h2>
      {subtitle && <p className="mp-card-subtitle">{subtitle}</p>}
    </header>
  )
}
