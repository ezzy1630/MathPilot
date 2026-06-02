import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProblemPrompt } from './ProblemPrompt'

vi.mock('./MathDisplay', () => ({
  MathDisplay: ({
    value,
    className,
    ariaLabel,
  }: {
    value: string
    className?: string
    ariaLabel?: string
  }) => (
    <math-field
      className={className}
      aria-label={ariaLabel}
      readOnly
      data-value={value}
    />
  ),
}))

describe('ProblemPrompt', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('renders plain text for non-math prompts', () => {
    act(() => {
      root.render(<ProblemPrompt prompt="State the chain rule (Leibniz form)." />)
    })
    expect(container.querySelector('math-field')).toBeNull()
    expect(container.textContent).toContain('State the chain rule')
  })

  it('renders a read-only math-field for math-heavy prompts', () => {
    act(() => {
      root.render(<ProblemPrompt prompt="Evaluate lim x→1 of (x^2 - 1)/(x - 1)." />)
    })
    const field = container.querySelector('math-field')
    expect(field).not.toBeNull()
    expect(field?.hasAttribute('readonly') || field?.hasAttribute('readOnly')).toBe(true)
    expect(field?.classList.contains('math-display')).toBe(true)
  })

  it('passes promptLatex through to MathDisplay', () => {
    const latex = '\\lim_{x \\to 1} \\frac{x^2 - 1}{x - 1}'
    act(() => {
      root.render(<ProblemPrompt prompt="Evaluate lim x→1 of (x^2 - 1)/(x - 1)." promptLatex={latex} />)
    })
    expect(container.querySelector('math-field')?.getAttribute('data-value')).toBe(latex)
  })
})
