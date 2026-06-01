import { describe, expect, it } from 'vitest'
import { applyTestOutResult, checkPrerequisiteGate, logOverride } from './sessionEngine'
import { chooseNextAction, createInitialState } from './learningEngine'

describe('session engine', () => {
  it('detects prerequisite gate for weak upstream skill', () => {
    const state = createInitialState('Calculus 1')
    state.mastery.derivative_rules_basic.masteryScore = 0.5
    state.mastery.function_composition.masteryScore = 0.2
    state.mastery.chain_rule.masteryScore = 0.5
    const gate = checkPrerequisiteGate(state, 'chain_rule')
    expect(gate.blocked).toBe(true)
    expect(gate.weakSkillId).toBe('function_composition')
  })

  it('routes to repair after failed test-out', () => {
    const state = createInitialState('Calculus 1')
    const { action } = applyTestOutResult(state, 'chain_rule', false)
    expect(action.kind).toBe('quick_repair')
  })

  it('allows continuation after passed test-out', () => {
    const state = createInitialState('Calculus 1')
    const { action } = applyTestOutResult(state, 'chain_rule', true)
    expect(action.kind).toBe('independent_practice')
  })

  it('prefers due review in next action planning', () => {
    const state = createInitialState('Calculus 1')
    state.reviewQueue = [
      {
        id: 'r1',
        skillId: 'chain_rule',
        due: '2020-01-01',
        intervalDays: 1,
        priority: 90,
        reason: 'Due now',
      },
    ]
    const action = chooseNextAction(state)
    expect(action.kind).toBe('mixed_review')
  })

  it('logs override without blocking state', () => {
    const state = createInitialState('Calculus 1')
    const next = logOverride(state, 'chain_rule', 'user chose to continue')
    expect(next.overrides?.length).toBe(1)
  })
})
