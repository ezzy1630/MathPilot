import { describe, expect, it } from 'vitest'
import { applyCodexResponse, parseDiagnosticCuratorResponse } from './codexParser'
import { createInitialState } from './learningEngine'

describe('parseDiagnosticCuratorResponse', () => {
  it('parses curator JSON schema', () => {
    const payload = parseDiagnosticCuratorResponse(
      JSON.stringify({
        knowledge_gaps: ['chain rule inner derivative'],
        coach_narrative: 'Focus on composition before chain rule drills.',
        learning_model_bullets: ['Setup errors cluster on chain rule'],
        map_highlight_skill_ids: ['function_composition', 'chain_rule'],
      }),
    )
    expect(payload?.coach_narrative).toContain('composition')
    expect(payload?.knowledge_gaps).toHaveLength(1)
    expect(payload?.map_highlight_skill_ids).toContain('chain_rule')
  })
})

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
