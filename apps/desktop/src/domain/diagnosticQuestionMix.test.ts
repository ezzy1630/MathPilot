import { describe, expect, it } from 'vitest'
import { skillsForCourse } from './courseGraph'
import { diagnosticMixForSkills, inferDiagnosticQuestionKind } from './diagnosticQuestionMix'

describe('diagnosticQuestionMix', () => {
  it('generates choice and error-ID items for key skills', () => {
    const items = diagnosticMixForSkills(['chain_rule', 'extrema'])
    expect(items.length).toBeGreaterThanOrEqual(3)
    expect(items.some((p) => p.answerType === 'choice')).toBe(true)
    expect(items.some((p) => p.source?.includes('error_identification'))).toBe(true)
  })

  it('infers question kind from source', () => {
    const choice = diagnosticMixForSkills(['chain_rule'])[0]
    expect(inferDiagnosticQuestionKind(choice)).toBe('choice')
  })

  it('covers every skill in Calc 1 with at least one mix item', () => {
    const skillIds = skillsForCourse('Calculus 1').map((s) => s.id)
    const items = diagnosticMixForSkills(skillIds)
    const covered = new Set(items.flatMap((p) => p.skillIds))
    const missing = skillIds.filter((id) => !covered.has(id))
    expect(missing, `uncovered mix: ${missing.join(', ')}`).toEqual([])
    expect(items.some((p) => p.answerType === 'choice')).toBe(true)
  })
})
