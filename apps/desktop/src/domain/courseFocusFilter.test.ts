import { describe, expect, it } from 'vitest'
import { filterProblemsByCourseFocus, isSkillActiveForPractice } from './courseFocusFilter'
import { createInitialState } from './learningEngine'
import type { Problem } from './types'

describe('course focus filter', () => {
  it('excludes off-course extension skills from random practice', () => {
    const state = createInitialState('Calculus 1')
    expect(isSkillActiveForPractice(state, 'telescoping_series')).toBe(false)
    expect(isSkillActiveForPractice(state, 'limits_intro')).toBe(true)
  })

  it('allows prerequisite skills during repair', () => {
    const state = createInitialState('Calculus 1')
    expect(
      isSkillActiveForPractice(state, 'function_composition', {
        repairSkillId: 'chain_rule',
        prerequisiteRepair: true,
      }),
    ).toBe(true)
  })

  it('filters problem pools by focus', () => {
    const state = createInitialState('Calculus 1')
    const problems: Problem[] = [
      {
        id: 'p-c2',
        title: 'C2 only',
        prompt: 'x',
        skillIds: ['telescoping_series'],
        difficulty: 0.5,
        mode: 'independent_practice',
        answerType: 'expression',
        expectedAnswer: '1',
        hintSequence: [],
      },
      {
        id: 'p-c1',
        title: 'C1',
        prompt: 'x',
        skillIds: ['limits_intro'],
        difficulty: 0.5,
        mode: 'independent_practice',
        answerType: 'expression',
        expectedAnswer: '1',
        hintSequence: [],
      },
    ]
    const filtered = filterProblemsByCourseFocus(state, problems)
    expect(filtered.map((p) => p.id)).toEqual(['p-c1'])
  })
})
