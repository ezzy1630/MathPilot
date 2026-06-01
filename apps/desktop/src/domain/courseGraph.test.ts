import { describe, expect, it } from 'vitest'
import { areasForCourse, skillsForCourse } from './courseGraph'

describe('courseGraph', () => {
  it('loads expanded Calculus 1 skill graph', () => {
    const skills = skillsForCourse('Calculus 1')
    expect(skills.length).toBeGreaterThan(20)
    expect(skills.find((s) => s.id === 'chain_rule')).toBeTruthy()
    expect(skills.find((s) => s.id === 'ftc')).toBeTruthy()
  })

  it('merges Calc 1 bridge skills for Calculus 2', () => {
    const skills = skillsForCourse('Calculus 2')
    expect(skills.find((s) => s.id === 'integration_by_parts')).toBeTruthy()
    expect(skills.find((s) => s.id === 'definite_integrals')).toBeTruthy()
  })

  it('exposes area groupings', () => {
    expect(areasForCourse('Calculus 1')).toContain('Derivatives')
    expect(areasForCourse('Calculus 2')).toContain('Sequences and Series')
  })
})
