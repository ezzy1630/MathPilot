import { useMemo, type ElementType } from 'react'
import { looksLikeMath, promptToLatex } from '../lib/promptToLatex'
import { MathDisplay } from './MathDisplay'

interface MathTextProps {
  text: string
  latex?: string
  className?: string
  /** Smaller typesetting for lists, choices, and inline contexts. */
  compact?: boolean
  as?: ElementType
  ariaLabel?: string
  /** Defer MathLive mount until near viewport (default true). */
  lazy?: boolean
}

export function MathText({
  text,
  latex,
  className,
  compact = false,
  as: Component = 'div',
  ariaLabel,
  lazy = true,
}: MathTextProps) {
  const shouldTypeset = useMemo(() => looksLikeMath(text), [text])
  const value = useMemo(() => promptToLatex(text) || latex || text, [latex, text])

  if (!shouldTypeset) {
    return <Component className={className}>{text}</Component>
  }

  const displayClass = compact ? 'math-display math-display-compact' : 'math-display'

  return (
    <Component className={className}>
      <MathDisplay
        value={value}
        className={displayClass}
        ariaLabel={ariaLabel ?? text}
        lazy={lazy}
      />
    </Component>
  )
}
