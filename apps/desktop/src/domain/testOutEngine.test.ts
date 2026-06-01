import { describe, expect, it } from 'vitest'
import { createInitialState } from './learningEngine'
import { startTestOut, submitTestOutAnswer } from './testOutEngine'

describe('testOutEngine', () => {
  it('builds a question queue for prerequisite test-out', () => {
    const state = createInitialState('Calculus 1')
    const { session } = startTestOut(state, 'chain_rule')
    expect(session.queue.length).toBeGreaterThan(0)
    expect(session.skillId).toBe('chain_rule')
  })

  it('tracks correct answers through the session', () => {
    let state = createInitialState('Calculus 1')
    const { state: withTest } = startTestOut(state, 'chain_rule')
    state = withTest
    while (state.testOut && !state.testOut.completed) {
      state = submitTestOutAnswer(state, true)
    }
    expect(state.testOut?.completed).toBe(true)
    expect(state.testOutResult).toBe('passed')
  })
})
