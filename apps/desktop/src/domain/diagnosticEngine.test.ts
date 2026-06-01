import { describe, expect, it } from 'vitest'
import { DIAGNOSTIC_TARGET_QUESTIONS, startDiagnostic, submitDiagnosticAnswer } from './diagnosticEngine'
import { createInitialState } from './learningEngine'

describe('diagnostic engine', () => {
  it('builds an adaptive queue near the target length', () => {
    const state = createInitialState('Calculus 1')
    const { session } = startDiagnostic(state)
    expect(session.queue.length).toBeGreaterThanOrEqual(8)
    expect(session.targetCount).toBe(DIAGNOSTIC_TARGET_QUESTIONS)
  })

  it('reprioritizes queue after every third answer', () => {
    let state = createInitialState('Calculus 1')
    const { state: withDiag, session } = startDiagnostic(state)
    state = withDiag
    const initialQueue = [...session.queue]

    for (let i = 0; i < 3; i += 1) {
      const problemId = state.diagnostic!.queue[i]
      const problem = state.problems[problemId]
      state = submitDiagnosticAnswer(state, problemId, problem?.expectedAnswer ?? '', false)
    }

    expect(state.diagnostic?.queue.slice(0, 3)).toEqual(initialQueue.slice(0, 3))
    expect(state.diagnostic?.queue.length).toBeGreaterThanOrEqual(session.targetCount - 1)
  })

  it('produces a summary after completing the diagnostic', () => {
    let state = createInitialState('Calculus 1')
    const { state: withDiag, session } = startDiagnostic(state)
    state = withDiag

    for (let i = 0; i < session.targetCount; i += 1) {
      const problemId = state.diagnostic!.queue[i]
      const problem = state.problems[problemId]
      const answer = problem?.expectedAnswer ?? ''
      state = submitDiagnosticAnswer(state, problemId, answer, i % 3 !== 0)
    }

    expect(state.diagnostic?.completed).toBe(true)
    expect(state.diagnostic?.summary?.recommendedNext).toBeTruthy()
    expect(state.diagnostic?.summary?.weak.length).toBeGreaterThanOrEqual(0)
  })
})
