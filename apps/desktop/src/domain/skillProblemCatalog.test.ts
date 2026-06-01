import { describe, expect, it } from 'vitest'
import calc1Graph from '../../../../config/course_graphs/calculus_1.json'
import calc2Graph from '../../../../config/course_graphs/calculus_2.json'
import skillsExtension from '../../../../config/course_graphs/skills_extension.json'
import { skillsForCourse } from './courseGraph'
import { diagnosticProblemForSkill, expandDiagnosticProblemsForSkills } from './diagnosticTemplates'
import { generateProblemForSkill } from './problemGenerator'
import { catalogSkillIds, hasCatalogEntry, SKILL_CATALOG } from './skillProblemCatalog'
import { SKILL_CATALOG_EXTENSION } from './skillProblemCatalogExtension'
import { expandDiagnosticProblems } from './seedData'
import { createInitialState } from './learningEngine'

function allGraphSkillIds(): string[] {
  const ids = new Set<string>()
  for (const s of calc1Graph.skills) ids.add(s.id)
  for (const s of calc2Graph.skills) ids.add(s.id)
  for (const s of (skillsExtension as { skills: { id: string }[] }).skills) ids.add(s.id)
  return [...ids]
}

describe('skillProblemCatalog', () => {
  it('covers every skill in the course graphs', () => {
    const graphIds = allGraphSkillIds()
    const missing = graphIds.filter((id) => !hasCatalogEntry(id))
    expect(missing, `missing catalog entries: ${missing.join(', ')}`).toEqual([])
    expect(catalogSkillIds().length).toBeGreaterThanOrEqual(60)
  })

  it('never uses placeholder concept or ready answers', () => {
    for (const entry of Object.values(SKILL_CATALOG)) {
      for (const spec of [...entry.diagnostics, ...entry.practice]) {
        expect(spec.expectedAnswer).not.toBe('concept')
        expect(spec.expectedAnswer).not.toBe('ready')
        expect(spec.prompt.length).toBeGreaterThan(10)
      }
    }
  })

  it('extension skills include at least three practice variants', () => {
    for (const entry of Object.values(SKILL_CATALOG_EXTENSION)) {
      expect(entry.practice.length, entry.skillId).toBeGreaterThanOrEqual(3)
      for (const spec of entry.practice) {
        expect(spec.difficulty).toBeGreaterThanOrEqual(0.2)
        expect(spec.difficulty).toBeLessThanOrEqual(0.8)
      }
    }
  })
})

describe('diagnosticTemplates', () => {
  it('does not use placeholder ready answers for chain rule', () => {
    const p = diagnosticProblemForSkill('chain_rule', 0)
    expect(p?.expectedAnswer).not.toBe('ready')
    expect(p?.answerType).toBe('expression')
  })

  it('produces real diagnostics for every Calc 1 skill', () => {
    const skillIds = skillsForCourse('Calculus 1').map((s) => s.id)
    const problems = expandDiagnosticProblemsForSkills(skillIds)
    const covered = new Set(problems.flatMap((p) => p.skillIds))
    const missing = skillIds.filter((id) => !covered.has(id))
    expect(missing, `uncovered: ${missing.join(', ')}`).toEqual([])
    expect(problems.every((p) => p.expectedAnswer !== 'concept')).toBe(true)
  })

  it('seedData expandDiagnosticProblems has no concept fallbacks', () => {
    for (const course of ['Calculus 1', 'Calculus 2'] as const) {
      const problems = expandDiagnosticProblems(course)
      expect(problems.every((p) => p.expectedAnswer !== 'concept')).toBe(true)
    }
  })
})

describe('problemGenerator', () => {
  it('generates practice problems for lhopital and squeeze_theorem', () => {
    let state = createInitialState('Calculus 1')
    for (const skillId of ['lhopital', 'squeeze_theorem', 'newtons_method', 'ftc', 'inverse_trig_derivatives', 'telescoping_series']) {
      const result = generateProblemForSkill(state, skillId, 42)
      expect(result, skillId).not.toBeNull()
      state = result!.state
      expect(result!.record.problem.expectedAnswer).not.toBe('concept')
    }
  })
})
