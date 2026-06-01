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
    expect(snap.masteryImprovementTrend).toMatchObject({
      recent7dAvg: expect.any(Number),
      prior7dAvg: expect.any(Number),
      direction: expect.stringMatching(/^(up|down|flat)$/),
    })
  })

  it('ranks resources and mistake patterns', () => {
    const state = createInitialState('Calculus 1')
    const snap = buildAnalyticsSnapshot(state)
    expect(Array.isArray(snap.resourceEffectivenessTop)).toBe(true)
    expect(Array.isArray(snap.mistakePatternTop)).toBe(true)
  })
})
