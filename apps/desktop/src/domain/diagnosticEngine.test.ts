import { describe, expect, it } from 'vitest'
import {
  MINI_DIAGNOSTIC_MAX,
  MINI_DIAGNOSTIC_MIN,
  shouldTriggerContinuingDiagnostic,
  startContinuingDiagnostic,
  DIAGNOSTIC_TARGET_QUESTIONS,
  startDiagnostic,
  submitDiagnosticAnswer,
} from './diagnosticEngine'
import { createInitialState } from './learningEngine'

describe('diagnostic engine', () => {
  it('builds an adaptive queue near the target length', () => {
    const state = createInitialState('Calculus 1')
    const { session } = startDiagnostic(state)
    expect(session.queue.length).toBeGreaterThanOrEqual(8)
    expect(session.targetCount).toBe(DIAGNOSTIC_TARGET_QUESTIONS)
  })

  it('preserves answered queue prefix until batch planner runs', () => {
    let state = createInitialState('Calculus 1')
    const { state: withDiag, session } = startDiagnostic(state)
    state = withDiag
    const initialQueue = [...session.queue]

    for (let i = 0; i < 3; i += 1) {
      const problemId = state.diagnostic!.queue[i]
      const problem = state.problems[problemId]
      state = submitDiagnosticAnswer(state, problemId, problem?.expectedAnswer ?? '', true)
    }

    expect(state.diagnostic?.queue.slice(0, 3)).toEqual(initialQueue.slice(0, 3))
    expect(state.diagnostic?.answeredCount).toBe(3)
  })

  it('promotes suspected weak to weak after second miss', () => {
    let state = createInitialState('Calculus 1')
    state = startDiagnostic(state).state
    const problemId = state.diagnostic!.queue[0]
    const problem = state.problems[problemId]!
    const skillId = problem.skillIds[0]

    state = submitDiagnosticAnswer(state, problemId, 'wrong', false)
    expect(state.diagnostic?.suspectedWeakSkills).toContain(skillId)
    expect(state.diagnostic?.weakSkills).not.toContain(skillId)

    const nextId = state.diagnostic!.queue[state.diagnostic!.currentIndex]
    const nextProblem = state.problems[nextId]!
    if (nextProblem.skillIds.includes(skillId)) {
      state = submitDiagnosticAnswer(state, nextId, 'wrong', false)
      expect(state.diagnostic?.weakSkills).toContain(skillId)
    }
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

  it('triggers continuing diagnostic on repeated mistake patterns', () => {
    const state = createInitialState('Calculus 1')
    const trigger = shouldTriggerContinuingDiagnostic({
      ...state,
      onboarded: true,
      mistakePatterns: {
        'chain_rule:missing_inner_derivative': {
          tag: 'chain_rule:missing_inner_derivative',
          skillIds: ['chain_rule'],
          count: 3,
          lastSeen: '2026-06-01',
          note: 'Missing inner derivative',
        },
      },
    })
    expect(trigger?.kind).toBe('mistake_pattern')
    expect(trigger?.skillIds).toContain('chain_rule')
  })

  it('starts a mini continuing diagnostic with 8-12 questions', () => {
    const state = createInitialState('Calculus 1')
    const { session } = startContinuingDiagnostic(
      {
        ...state,
        onboarded: true,
        mistakePatterns: {
          'chain_rule:missing_inner_derivative': {
            tag: 'chain_rule:missing_inner_derivative',
            skillIds: ['chain_rule'],
            count: 2,
            lastSeen: '2026-06-01',
            note: 'Missing inner derivative',
          },
        },
      },
      ['chain_rule'],
    )
    expect(session.continuing).toBe(true)
    expect(session.queue.length).toBeGreaterThanOrEqual(MINI_DIAGNOSTIC_MIN)
    expect(session.queue.length).toBeLessThanOrEqual(MINI_DIAGNOSTIC_MAX)
  })
})
