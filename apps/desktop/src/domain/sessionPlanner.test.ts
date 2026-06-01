import { describe, expect, it } from 'vitest'
import { createInitialState } from './learningEngine'
import { resolveProblemForAction } from './sessionPlanner'

describe('sessionPlanner', () => {
  it('resolves or generates a problem for a skill', () => {
    const state = createInitialState('Calculus 1')
    const { problemId } = resolveProblemForAction(state, ['chain_rule'], 'guided_practice')
    expect(problemId).toBeTruthy()
  })
})
