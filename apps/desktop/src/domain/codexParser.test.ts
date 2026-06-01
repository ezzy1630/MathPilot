import { describe, expect, it } from 'vitest'
import { applyCodexResponse } from './codexParser'
import { createInitialState } from './learningEngine'

describe('codexParser state_updates', () => {
  it('applies skills_to_decrease and skills_to_review', () => {
    const state = createInitialState('Calculus 1')
    const before = state.mastery.chain_rule.masteryScore
    const next = applyCodexResponse(state, {
      state_updates: {
        skills_to_decrease: ['chain_rule'],
        skills_to_review: ['u_substitution'],
      },
    })
    expect(next.mastery.chain_rule.masteryScore).toBeLessThan(before)
    expect(next.mastery.u_substitution.masteryState).toBe('Needs Review')
  })

  it('applies skills_to_increase list', () => {
    const state = createInitialState('Calculus 1')
    const before = state.mastery.limits_intro.masteryScore
    const next = applyCodexResponse(state, {
      state_updates: {
        skills_to_increase: [{ skill_id: 'limits_intro', delta: 0.1 }],
      },
    })
    expect(next.mastery.limits_intro.masteryScore).toBeGreaterThan(before)
  })
})
