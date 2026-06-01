import { describe, expect, it } from 'vitest'
import { createInitialState } from './learningEngine'
import { searchAppState } from './searchIndex'

describe('searchAppState', () => {
  it('finds skills by name fragment', () => {
    const state = createInitialState('Calculus 1')
    const hits = searchAppState(state, 'chain')
    expect(hits.some((h) => h.kind === 'skill' && h.title.toLowerCase().includes('chain'))).toBe(true)
  })
})
