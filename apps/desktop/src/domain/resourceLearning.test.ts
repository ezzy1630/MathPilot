import { describe, expect, it } from 'vitest'
import { applyPostResourceAttempt } from './resourceLearning'
import { recordAttempt, createInitialState } from './learningEngine'

describe('resourceLearning', () => {
  it('links post-resource attempts via resourceId', () => {
    const state = createInitialState('Calculus 1')
    const resourceId = 'ka-chain-rule'
    state.activeVideo = { resourceId, skillIds: ['chain_rule'], startedAt: new Date().toISOString() }
    const before = state.resources[resourceId].effectivenessScore
    const next = applyPostResourceAttempt(state, {
      problemId: 'p1',
      skillIds: ['chain_rule'],
      answer: '2x',
      correct: true,
      mode: 'guided',
      hintCount: 0,
      seconds: 90,
      mixed: false,
      delayed: false,
    })
    expect(next.resources[resourceId].effectivenessScore).toBeGreaterThan(before)
    expect(next.resourceEvents?.length).toBeGreaterThan(0)
  })
})

describe('learningEngine post-resource', () => {
  it('updates resource effectiveness when attempt carries resourceId', () => {
    const state = createInitialState('Calculus 1')
    const resourceId = 'ka-chain-rule'
    const before = state.resources[resourceId].effectivenessScore
    const next = recordAttempt(state, {
      problemId: 'p1',
      skillIds: ['chain_rule'],
      answer: '2x',
      correct: true,
      mode: 'guided',
      hintCount: 0,
      seconds: 90,
      mixed: false,
      delayed: false,
      resourceId,
    })
    expect(next.resources[resourceId].effectivenessScore).toBeGreaterThan(before)
  })
})
