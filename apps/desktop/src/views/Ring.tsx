import type { CSSProperties } from 'react'

export function Ring({ label, value }: { label: string; value: number }) {
  return (
    <div className="ring" style={{ '--p': value } as CSSProperties}>
      <span>{value}%</span>
      <small>{label}</small>
    </div>
  )
}
