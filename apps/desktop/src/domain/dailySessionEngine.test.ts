import { describe, expect, it } from 'vitest'
import { advanceDailySession, phaseItemTarget, startDailySession } from './dailySessionEngine'
import { planSession } from './sessionEngine'
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

  it('applies pace presets to review intensity and difficulty bias', () => {
    const deep = startDailySession(createInitialState('Calculus 1'), 'deep')
    const lowEnergy = startDailySession(createInitialState('Calculus 1'), 'low_energy')

    expect(deep.dailySession?.reviewIntensity).toBeGreaterThan(lowEnergy.dailySession?.reviewIntensity ?? 0)
    expect(deep.dailySession?.difficultyBias).toBeGreaterThan(lowEnergy.dailySession?.difficultyBias ?? -1)

    const deepPlan = planSession('deep')
    const deepReviewTarget = phaseItemTarget('mixed_review', deepPlan, { difficultyBias: 0.12, videoPhaseWeight: 1.2, reviewIntensity: 1.3, introduceNewMaterial: true })
    const lowReviewTarget = phaseItemTarget('mixed_review', planSession('low_energy'), { difficultyBias: -0.12, videoPhaseWeight: 1.4, reviewIntensity: 0.6, introduceNewMaterial: false })
    expect(deepReviewTarget).toBeGreaterThanOrEqual(lowReviewTarget)
  })
})
