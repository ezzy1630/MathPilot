import { describe, expect, it } from 'vitest'
import { checkAnswer } from './checkAnswer'

describe('@mathpilot/math-engine package', () => {
  it('accepts equivalent symbolic answers', () => {
    const result = checkAnswer({
      expected: '2*x',
      actual: 'x+x',
      variables: ['x'],
      skillIds: ['linear'],
    })
    expect(result.correct).toBe(true)
    expect(result.method).toBe('symbolic')
  })

  it('rejects non-equivalent answers with tags', () => {
    const result = checkAnswer({
      expected: '2*x',
      actual: 'x+1',
      variables: ['x'],
      skillIds: ['linear'],
    })
    expect(result.correct).toBe(false)
    expect(result.mistakeTags.length).toBeGreaterThan(0)
  })
})
