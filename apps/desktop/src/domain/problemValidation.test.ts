import { describe, expect, it } from 'vitest'
import { validateDiagnosticCandidate } from './problemValidation'
import type { Problem } from './types'

function stubProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: 'test-problem',
    title: 'Test',
    prompt: 'Differentiate x^2.',
    skillIds: ['derivative_rules_basic'],
    difficulty: 0.3,
    mode: 'diagnostic',
    answerType: 'expression',
    expectedAnswer: '2*x',
    hintSequence: [],
    ...overrides,
  }
}

describe('validateDiagnosticCandidate', () => {
  it('accepts valid choice problems', async () => {
    const result = await validateDiagnosticCandidate(
      stubProblem({
        answerType: 'choice',
        expectedAnswer: 'chain rule',
        choices: ['chain rule', 'product rule'],
      }),
    )
    expect(result.ok).toBe(true)
  })

  it('rejects choice problems with too few options', async () => {
    const result = await validateDiagnosticCandidate(
      stubProblem({
        answerType: 'choice',
        expectedAnswer: 'only',
        choices: ['only'],
      }),
    )
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('choice_too_few')
  })
})
