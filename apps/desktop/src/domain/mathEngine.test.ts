import { describe, expect, it } from 'vitest'
import { checkAnswer } from './mathEngine'

describe('math engine', () => {
  it('accepts algebraically equivalent derivative answers', () => {
    const result = checkAnswer({
      expected: '6*x*(x^2+1)^2',
      actual: '3*(x^2+1)^2*2*x',
      variables: ['x'],
    })

    expect(result.correct).toBe(true)
    expect(result.method).toBe('symbolic')
  })

  it('returns useful feedback for a likely chain rule miss', () => {
    const result = checkAnswer({
      expected: '6*x*(x^2+1)^2',
      actual: '3*(x^2+1)^2',
      variables: ['x'],
      skillIds: ['chain_rule'],
    })

    expect(result.correct).toBe(false)
    expect(result.mistakeTags).toContain('chain_rule:missing_inner_derivative')
  })
})
