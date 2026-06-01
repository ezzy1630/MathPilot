import { describe, expect, it } from 'vitest'
import {
  DIAGNOSTIC_CONFIDENCE_MIN_ATTEMPTS_PER_SKILL,
  DIAGNOSTIC_CONFIDENCE_MIN_SKILLS,
  diagnosticConfidenceMet,
  skillSelectionWeight,
  startDiagnostic,
  submitDiagnosticAnswer,
} from './diagnosticEngine'
import { createInitialState } from './learningEngine'

describe('diagnostic branching', () => {
  it('boosts prerequisite weight after a wrong answer', () => {
    const state = createInitialState('Calculus 1')
    const session = {
      weakSkills: ['chain_rule'],
      strongSkills: [] as string[],
      skillProbes: {},
    }
    const prereqWeight = skillSelectionWeight(state, 'function_composition', session)
    const neutralWeight = skillSelectionWeight(state, 'limits_intro', session)
    expect(prereqWeight).toBeGreaterThan(neutralWeight)
  })

  it('reduces weight after two correct probes on a skill', () => {
    const state = createInitialState('Calculus 1')
    const session = {
      weakSkills: [] as string[],
      strongSkills: ['limits_intro'],
      skillProbes: { limits_intro: { correct: 2, attempts: 2 } },
    }
    const reduced = skillSelectionWeight(state, 'limits_intro', session)
    const baseline = skillSelectionWeight(state, 'limits_intro', {
      weakSkills: [],
      strongSkills: [],
      skillProbes: {},
    })
    expect(reduced).toBeLessThan(baseline)
  })

  it('stops early when confidence threshold is met', () => {
    let state = createInitialState('Calculus 1')
    const { state: withDiag, session } = startDiagnostic(state)
    state = withDiag

    const skillProbes: Record<string, { correct: number; attempts: number }> = {}
    for (const skillId of Object.keys(state.skills).slice(0, DIAGNOSTIC_CONFIDENCE_MIN_SKILLS)) {
      skillProbes[skillId] = {
        correct: DIAGNOSTIC_CONFIDENCE_MIN_ATTEMPTS_PER_SKILL,
        attempts: DIAGNOSTIC_CONFIDENCE_MIN_ATTEMPTS_PER_SKILL,
      }
    }
    expect(diagnosticConfidenceMet({ ...session, skillProbes })).toBe(true)

    const idx = 10
    state = {
      ...state,
      diagnostic: {
        ...state.diagnostic!,
        skillProbes,
        answeredCount: idx,
        currentIndex: idx,
      },
    }
    const problemId = state.diagnostic!.queue[idx]
    const problem = state.problems[problemId]
    state = submitDiagnosticAnswer(state, problemId, problem?.expectedAnswer ?? '', true)

    expect(state.diagnostic?.completed).toBe(true)
    expect(state.diagnostic?.answeredCount).toBeLessThan(session.targetCount)
  })
})
