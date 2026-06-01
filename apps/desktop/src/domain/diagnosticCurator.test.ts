import { describe, expect, it } from 'vitest'
import { buildCoachInsightFallback } from './diagnosticCurator'
import { createInitialState } from './learningEngine'
import { startDiagnostic } from './diagnosticEngine'

describe('diagnosticCurator fallback', () => {
  it('builds coach insight from diagnostic summary fields', () => {
    let state = createInitialState('Calculus 1')
    const { state: withDiag } = startDiagnostic(state)
    state = withDiag
    state = {
      ...state,
      diagnostic: {
        ...state.diagnostic!,
        completed: true,
        weakSkills: ['function_composition'],
        strongSkills: ['limits_intro'],
        summary: {
          strong: ['Limits'],
          weak: ['Function composition'],
          recommendedNext: 'Quick repair: Function composition',
          recommendedSkillIds: ['function_composition'],
        },
      },
    }

    const insight = buildCoachInsightFallback(state)
    expect(insight.source).toBe('deterministic')
    expect(insight.narrative).toContain('Quick repair')
    expect(insight.gapBullets.some((b) => b.includes('Function composition') || b.includes('Gap:'))).toBe(true)
    expect(insight.mapHighlightSkillIds).toContain('function_composition')
  })

  it('uses weak mastery when no diagnostic weakSkills', () => {
    const state = createInitialState('Calculus 1')
    state.mastery.function_composition.masteryScore = 0.15
    const insight = buildCoachInsightFallback(state)
    expect(insight.mapHighlightSkillIds.length).toBeGreaterThan(0)
    expect(insight.narrative.length).toBeGreaterThan(10)
  })
})
