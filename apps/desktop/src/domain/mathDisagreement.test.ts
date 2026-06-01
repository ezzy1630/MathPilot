import { describe, expect, it } from 'vitest'
import { resolveAnswerDisagreement, inspectDisagreementWithCodex } from './mathDisagreement'
import { gradeAnswerWithDisagreement } from './mathEngine'
import { createInitialState } from './learningEngine'

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

  it('falls back when Codex inspect is unavailable', async () => {
    const state = createInitialState('Calculus 1')
    const { resolution } = await inspectDisagreementWithCodex(
      state,
      { correct: true, feedback: 'Correct.', method: 'symbolic', mistakeTags: [], confidence: 1, normalizedExpected: '1', normalizedActual: '1' },
      false,
      'Wrong',
    )
    expect(resolution.correct).toBe(true)
    expect(resolution.usedAiOverride).toBe(false)
  })

  it('gradeAnswerWithDisagreement uses inspect path for symbolic disagreement', async () => {
    const state = createInitialState('Calculus 1')
    const graded = await gradeAnswerWithDisagreement(
      state,
      { expected: '2*x', actual: '2*x', variables: ['x'] },
      false,
      'Codex says wrong',
    )
    expect(graded.result.correct).toBe(true)
    expect(graded.result.method).toBe('symbolic')
  })
})
