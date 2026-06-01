import { describe, expect, it } from 'vitest'
import { startDailySession } from './dailySessionEngine'
import { createInitialState } from './learningEngine'
import { resolveProblemForAction } from './sessionPlanner'

describe('sessionPlanner', () => {
  it('resolves or generates a problem for a skill', () => {
    const state = createInitialState('Calculus 1')
    const { problemId } = resolveProblemForAction(state, ['chain_rule'], 'guided_practice')
    expect(problemId).toBeTruthy()
  })

  it('selects review-type problems during mixed review phase', () => {
    const state = startDailySession(createInitialState('Calculus 1'), 'normal')
    const { state: nextState, problemId } = resolveProblemForAction(state, ['chain_rule'], 'mixed_review')
    expect(problemId).toBeTruthy()
    const problem = nextState.problems[problemId!]
    expect(problem?.mode === 'mixed_review' || problem?.source?.startsWith('review_')).toBeTruthy()
  })
})
