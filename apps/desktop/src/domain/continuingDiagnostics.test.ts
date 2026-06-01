import { describe, expect, it } from 'vitest'
import { createInitialState, recordAttempt } from './learningEngine'
import {
  evaluateContinuingDiagnostic,
  shouldTriggerContinuingDiagnostic,
} from './continuingDiagnostics'

describe('continuingDiagnostics', () => {
  it('sets continuingDiagnosticPending on repeated mistake patterns (count >= 3)', () => {
    const base = createInitialState('Calculus 1')
    const state = {
      ...base,
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
    }
    expect(shouldTriggerContinuingDiagnostic(state)?.kind).toBe('mistake_pattern')

    const next = evaluateContinuingDiagnostic(state, {
      problemId: 'guided-chain-1',
      skillIds: ['chain_rule'],
      answer: 'wrong',
      correct: false,
      mode: 'guided',
      hintCount: 0,
      seconds: 90,
      mixed: false,
      delayed: false,
      mistakeTags: ['chain_rule:missing_inner_derivative'],
    })
    expect(next.continuingDiagnosticPending).toBe(true)
  })

  it('flags overconfident wrong answers from a single attempt', () => {
    const state = { ...createInitialState('Calculus 1'), onboarded: true }
    const next = evaluateContinuingDiagnostic(state, {
      problemId: 'guided-chain-1',
      skillIds: ['chain_rule'],
      answer: 'wrong',
      correct: false,
      mode: 'guided',
      hintCount: 0,
      seconds: 90,
      mixed: false,
      delayed: false,
      confidence: 5,
    })
    expect(next.continuingDiagnosticPending).toBe(true)
  })

  it('sets pending after recordAttempt when review failures accumulate', () => {
    let state = { ...createInitialState('Calculus 1'), onboarded: true }
    state = recordAttempt(state, {
      problemId: 'review-chain-mixed',
      skillIds: ['chain_rule'],
      answer: 'wrong',
      correct: false,
      mode: 'review',
      hintCount: 0,
      seconds: 90,
      mixed: true,
      delayed: true,
    })
    expect(state.continuingDiagnosticPending).toBeFalsy()

    state = recordAttempt(state, {
      problemId: 'review-chain-mixed',
      skillIds: ['chain_rule'],
      answer: 'wrong',
      correct: false,
      mode: 'review',
      hintCount: 0,
      seconds: 90,
      mixed: true,
      delayed: true,
    })
    expect(state.continuingDiagnosticPending).toBe(true)
  })

  it('does not double-count the current review attempt when re-evaluated after recordAttempt', () => {
    let state = { ...createInitialState('Calculus 1'), onboarded: true }
    const reviewAttempt = {
      problemId: 'review-chain-mixed',
      skillIds: ['chain_rule'],
      answer: 'wrong',
      correct: false,
      mode: 'review' as const,
      hintCount: 0,
      seconds: 90,
      mixed: true,
      delayed: true,
    }

    state = recordAttempt(state, reviewAttempt)
    expect(state.continuingDiagnosticPending).toBeFalsy()

    const reevaluated = evaluateContinuingDiagnostic(state, state.attempts[0]!)
    expect(reevaluated.continuingDiagnosticPending).toBeFalsy()

    state = recordAttempt(state, reviewAttempt)
    expect(state.continuingDiagnosticPending).toBe(true)
  })
})
