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

  it('supports custom pace with user overrides', () => {
    const state = startDailySession(
      {
        ...createInitialState('Calculus 1'),
        customPaceAdjustments: {
          difficultyBias: 0.05,
          videoPhaseWeight: 0.8,
          reviewIntensity: 1.4,
          introduceNewMaterial: true,
          problemBudget: 10,
          explanationLevel: 'high',
        },
      },
      'custom',
    )
    expect(state.dailySession?.pace).toBe('custom')
    expect(state.dailySession?.reviewIntensity).toBe(1.4)
    expect(state.dailySession?.explanationLevel).toBe('high')
    expect(state.dailySession?.phases).toContain('retrieval_warmup')
  })

  it('plans full session phases for normal pace', () => {
    const state = startDailySession(createInitialState('Calculus 1'), 'normal')
    expect(state.dailySession?.phases).toEqual(
      expect.arrayContaining(['retrieval_warmup', 'concept_input', 'worked_example', 'guided_practice']),
    )
  })
})
