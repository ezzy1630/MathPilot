import { describe, expect, it } from 'vitest'
import { applySyllabusUpload, parseSyllabusText } from './syllabusUpload'
import { createInitialState } from './learningEngine'

describe('syllabusUpload', () => {
  it('maps topic keywords to skills', () => {
    const parsed = parseSyllabusText('Week 1: Limits\nWeek 2: Chain rule', 'Calculus 1')
    expect(parsed.items[0].skillIds).toContain('limits_intro')
    expect(parsed.items[1].skillIds).toContain('chain_rule')
  })

  it('updates state on upload', () => {
    const state = createInitialState('Calculus 1')
    const next = applySyllabusUpload(state, 'Week 3: Integration by parts')
    expect(next.syllabus?.items.length).toBeGreaterThan(0)
    expect(next.changelog[0]).toContain('Syllabus uploaded')
  })
})
