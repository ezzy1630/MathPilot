import { describe, expect, it } from 'vitest'
import { MATHPILOT_INLINE_SHORTCUTS, mergeMathInlineShortcuts } from './mathInlineShortcuts'

describe('mathInlineShortcuts', () => {
  it('defines sqrt and common calculus shortcuts', () => {
    expect(MATHPILOT_INLINE_SHORTCUTS.sqrt).toBe('\\sqrt{#0}')
    expect(MATHPILOT_INLINE_SHORTCUTS.lim).toBe('\\lim_{#0}')
    expect(MATHPILOT_INLINE_SHORTCUTS.infty).toBe('\\infty')
  })

  it('merges without dropping defaults', () => {
    const merged = mergeMathInlineShortcuts({ half: '\\frac{1}{2}' })
    expect(merged.half).toBe('\\frac{1}{2}')
    expect(merged.sqrt).toBe('\\sqrt{#0}')
  })
})
