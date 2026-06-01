import { describe, expect, it, beforeEach } from 'vitest'
import { createInitialState } from './learningEngine'
import { loadPersistedState, persistenceRoundTrip, savePersistedState } from './persistence'

const memoryStore = new Map<string, string>()

describe('persistence', () => {
  beforeEach(() => {
    memoryStore.clear()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => memoryStore.get(key) ?? null,
        setItem: (key: string, value: string) => memoryStore.set(key, value),
        removeItem: (key: string) => memoryStore.delete(key),
        clear: () => memoryStore.clear(),
      },
      configurable: true,
    })
  })

  it('round-trips state through local persistence', async () => {
    const state = createInitialState('Calculus 2')
    state.profileName = 'RoundTrip'
    const ok = await persistenceRoundTrip(state)
    expect(ok).toBe(true)
    const loaded = await loadPersistedState('Calculus 2')
    expect(loaded.profileName).toBe('RoundTrip')
    expect(loaded.currentFocus).toBe('Calculus 2')
  })

  it('saves and reloads attempts', async () => {
    const state = createInitialState('Calculus 1')
    state.attempts = [
      {
        id: 'a1',
        problemId: 'diagnostic-chain-setup',
        skillIds: ['chain_rule'],
        answer: 'test',
        correct: true,
        mode: 'diagnostic',
        hintCount: 0,
        seconds: 60,
        mixed: true,
        delayed: false,
        createdAt: new Date().toISOString(),
        masteryDelta: 0.05,
      },
    ]
    await savePersistedState(state)
    const loaded = await loadPersistedState()
    expect(loaded.attempts).toHaveLength(1)
  })
})
