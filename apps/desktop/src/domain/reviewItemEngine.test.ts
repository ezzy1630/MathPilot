import { describe, expect, it } from 'vitest'
import { createInitialState } from './learningEngine'
import { buildReviewProblem, inferReviewType } from './reviewItemEngine'
import { offlineHelpForTask } from './codexOfflineFallback'

describe('reviewItemEngine', () => {
  it('infers recall type for formula skills', () => {
    const state = createInitialState('Calculus 1')
    expect(inferReviewType(state, 'ftc')).toBe('recall')
  })

  it('builds method selection problem with choices', () => {
    const state = createInitialState('Calculus 2')
    const built = buildReviewProblem(state, 'series_test_selection', 'method_selection', 1)
    expect(built.problem?.answerType).toBe('choice')
    expect(built.problem?.choices?.length).toBeGreaterThan(1)
  })

  it('builds concept multiple-choice problems', () => {
    const state = createInitialState('Calculus 1')
    const built = buildReviewProblem(state, 'limits_intro', 'concept', 2)
    expect(built.problem?.answerType).toBe('choice')
    expect(built.problem?.expectedAnswer).toBeTruthy()
  })

  it('builds transfer problems in the same area', () => {
    const state = createInitialState('Calculus 1')
    const built = buildReviewProblem(state, 'related_rates', 'transfer', 3)
    expect(built.problem?.source).toBe('review_transfer')
    expect(built.problem?.skillIds.length).toBeGreaterThan(0)
  })
})

describe('codexOfflineFallback', () => {
  it('returns structured help when Codex unavailable', () => {
    const state = createInitialState('Calculus 1')
    const help = offlineHelpForTask(state, "I'm lost: method", state.problems['diagnostic-chain-setup'])
    expect(help.feedback.length).toBeGreaterThan(20)
  })
})
