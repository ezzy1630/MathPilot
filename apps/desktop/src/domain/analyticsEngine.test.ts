import { describe, expect, it } from 'vitest'
import { buildAnalyticsSnapshot } from './analyticsEngine'
import { createInitialState, recordAttempt } from './learningEngine'

describe('analyticsEngine', () => {
  it('builds trend and weak skill bars from attempts', () => {
    let state = createInitialState('Calculus 1')
    state = recordAttempt(state, {
      problemId: Object.values(state.problems)[0].id,
      skillIds: ['chain_rule'],
      answer: 'wrong',
      correct: false,
      mode: 'guided',
      hintCount: 0,
      seconds: 60,
      mixed: false,
      delayed: false,
    })
    const snap = buildAnalyticsSnapshot(state)
    expect(snap.weakestSkills.length).toBeGreaterThan(0)
    expect(snap.attemptAccuracy).toBe(0)
  })
})
