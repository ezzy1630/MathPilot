import { describe, expect, it } from 'vitest'
import { advanceDailySession, startDailySession } from './dailySessionEngine'
import { createInitialState } from './learningEngine'

describe('daily session engine', () => {
  it('starts and advances through phases', () => {
    let state = startDailySession(createInitialState('Calculus 1'), 'short')
    expect(state.dailySession?.phases.length).toBeGreaterThan(0)

    const target = state.dailySession!.itemsTargetInPhase
    for (let i = 0; i < target; i += 1) {
      state = advanceDailySession(state)
    }
    expect(state.dailySession?.phaseIndex).toBe(1)
  })
})
