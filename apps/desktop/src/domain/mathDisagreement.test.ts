import { describe, expect, it } from 'vitest'
import { resolveAnswerDisagreement } from './mathDisagreement'

describe('resolveAnswerDisagreement', () => {
  it('prefers symbolic when Codex disagrees on a correct symbolic check', () => {
    const resolved = resolveAnswerDisagreement(
      { correct: true, feedback: 'Correct.', method: 'symbolic', mistakeTags: [], confidence: 1, normalizedExpected: '1', normalizedActual: '1' },
      false,
      'Codex thought wrong',
    )
    expect(resolved.correct).toBe(true)
    expect(resolved.usedAiOverride).toBe(false)
  })

  it('accepts Codex when symbolic is inconclusive', () => {
    const resolved = resolveAnswerDisagreement(
      { correct: false, feedback: 'Unclear.', method: 'text', mistakeTags: [], confidence: 0.4, normalizedExpected: 'x', normalizedActual: 'y' },
      true,
      'Equivalent form.',
    )
    expect(resolved.correct).toBe(true)
    expect(resolved.usedAiOverride).toBe(true)
  })
})
