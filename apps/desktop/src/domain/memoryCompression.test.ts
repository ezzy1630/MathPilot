import { describe, expect, it } from 'vitest'
import { applyMemoryCompression } from './memoryCompression'
import { createInitialState } from './learningEngine'

describe('memoryCompression', () => {
  it('writes learning_model patterns when archiving attempts', () => {
    const state = createInitialState('Calculus 1')
    state.attempts = Array.from({ length: 40 }, (_, i) => ({
      id: `a-${i}`,
      problemId: 'p',
      skillIds: ['chain_rule'],
      answer: 'x',
      correct: i % 2 === 0,
      mode: 'guided' as const,
      hintCount: 0,
      seconds: 60,
      mixed: false,
      delayed: false,
      createdAt: new Date().toISOString(),
      masteryDelta: 0.05,
      mistakeTags: i % 3 === 0 ? ['chain_rule:missing_inner_derivative'] : undefined,
    }))
    const next = applyMemoryCompression(state) as typeof state & { _learningModelSummary?: string }
    expect(next.attempts.length).toBe(25)
    expect(next._learningModelSummary).toContain('Learning patterns')
  })
})
