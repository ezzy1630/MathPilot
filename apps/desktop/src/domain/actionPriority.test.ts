import { describe, expect, it } from 'vitest'
import { prioritizedWeakMastery, topMistakeRepairSkill } from './actionPriority'
import { createInitialState } from './learningEngine'

describe('actionPriority', () => {
  it('ranks weak skills with recent failures and mistake patterns higher', () => {
    const state = createInitialState('Calculus 1')
    state.mastery.chain_rule.recentFailures = 4
    state.mastery.chain_rule.masteryScore = 0.42
    state.mastery.limits_intro.masteryScore = 0.38
    state.mistakePatterns = {
      chain_miss: {
        tag: 'chain_miss',
        skillIds: ['chain_rule'],
        count: 5,
        lastSeen: new Date().toISOString(),
        note: 'test',
      },
    }

    const ordered = prioritizedWeakMastery(state, 2)
    expect(ordered[0].skillId).toBe('chain_rule')
  })

  it('surfaces skills with recurring mistake patterns for repair', () => {
    const state = createInitialState('Calculus 1')
    state.mistakePatterns = {
      inner_deriv: {
        tag: 'inner_deriv',
        skillIds: ['chain_rule'],
        count: 4,
        lastSeen: new Date().toISOString(),
        note: 'test',
      },
    }
    expect(topMistakeRepairSkill(state)).toBe('chain_rule')
  })
})
