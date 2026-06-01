import { describe, expect, it } from 'vitest'
import {
  builtInGraphKindForSkill,
  builtInGraphPropsForProblem,
  partialSumGeometric,
} from './graphPresets'
import type { Problem } from './types'

function problem(skillIds: string[]): Problem {
  return {
    id: 'test',
    title: 'Test',
    prompt: 'Test prompt',
    skillIds,
    answerType: 'expression',
    mode: 'guided_practice',
    difficulty: 1,
    expectedAnswer: '0',
    hintSequence: [],
  }
}

describe('graphPresets', () => {
  it('maps series and polar skills to built-in graph kinds', () => {
    expect(builtInGraphKindForSkill('series_intro')).toBe('series_partial_sums')
    expect(builtInGraphKindForSkill('geometric_series')).toBe('series_partial_sums')
    expect(builtInGraphKindForSkill('polar_coordinates')).toBe('polar')
    expect(builtInGraphKindForSkill('polar_area')).toBe('polar')
    expect(builtInGraphKindForSkill('parametric_equations')).toBe('parametric')
    expect(builtInGraphKindForSkill('related_rates')).toBe('related_rates_diagram')
  })

  it('builds skill-specific props for new graph kinds', () => {
    const series = builtInGraphPropsForProblem(problem(['geometric_series']))
    expect(series?.kind).toBe('series_partial_sums')
    expect(series?.seriesRatio).toBe(0.5)

    const polar = builtInGraphPropsForProblem(problem(['polar_coordinates']))
    expect(polar?.kind).toBe('polar')
    expect(polar?.polarR?.(0)).toBe(2)

    const param = builtInGraphPropsForProblem(problem(['parametric_equations']))
    expect(param?.kind).toBe('parametric')
    expect(param?.parametricX?.(0)).toBe(1)

    const rates = builtInGraphPropsForProblem(problem(['related_rates']))
    expect(rates?.kind).toBe('related_rates_diagram')
  })

  it('computes geometric partial sums', () => {
    expect(partialSumGeometric(1, 0.5)).toBeCloseTo(0.5)
    expect(partialSumGeometric(3, 0.5)).toBeCloseTo(0.875)
  })
})
