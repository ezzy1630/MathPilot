import { describe, expect, it } from 'vitest'
import { requiresShowWork } from './showWorkPolicy'
import { createInitialState } from './learningEngine'

describe('showWorkPolicy', () => {
  it('requires show work for application skills', () => {
    const state = createInitialState('Calculus 1')
    const problem = Object.values(state.problems).find((p) => p.skillIds.includes('related_rates'))
    expect(problem).toBeTruthy()
    if (!problem) return
    expect(requiresShowWork(state, problem)).toBe(true)
  })

  it('respects explicit problem flag', () => {
    const state = createInitialState('Calculus 1')
    const problem = Object.values(state.problems)[0]
    expect(requiresShowWork(state, { ...problem, requiresShowWork: true })).toBe(true)
  })
})
