import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialState } from './learningEngine'
import { hydrateState } from './hydrateState'
import { loadRelationalLocal, saveRelationalLocal } from './relationalStore'

const memoryStore = new Map<string, string>()

describe('relationalStore', () => {
  beforeEach(() => {
    memoryStore.clear()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => memoryStore.get(k) ?? null,
        setItem: (k: string, v: string) => memoryStore.set(k, v),
        removeItem: (k: string) => memoryStore.delete(k),
        clear: () => memoryStore.clear(),
      },
      configurable: true,
    })
  })

  it('round-trips mastery and review tables in localStorage', () => {
    const state = createInitialState('Calculus 1')
    state.mastery.chain_rule.masteryScore = 0.77
    state.reviewQueue = [
      {
        id: 'r1',
        skillId: 'chain_rule',
        due: '2026-06-01',
        intervalDays: 3,
        priority: 80,
        reason: 'due',
      },
    ]
    saveRelationalLocal(state)
    const partial = loadRelationalLocal()
    const hydrated = hydrateState(partial!)
    expect(hydrated.mastery.chain_rule.masteryScore).toBe(0.77)
    expect(hydrated.reviewQueue).toHaveLength(1)
  })
})
