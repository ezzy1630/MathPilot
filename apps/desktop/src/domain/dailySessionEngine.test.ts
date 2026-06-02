import { afterEach, describe, expect, it, vi } from 'vitest'
import { advanceDailySession, phaseItemTarget, startDailySession } from './dailySessionEngine'
import { buildSessionPhaseAction, planSession } from './sessionEngine'
import { createInitialState, recordAttempt } from './learningEngine'
import type { ActivityKind, AttemptInput, MathPilotState } from './types'

function problemForSkill(state: MathPilotState, skillId: string): string {
  return (
    Object.values(state.problems).find((problem) => problem.skillIds.includes(skillId))?.id ??
    Object.values(state.problems)[0]!.id
  )
}

function attemptModeForPhase(phase: ActivityKind): AttemptInput['mode'] {
  if (phase === 'mixed_review' || phase === 'retrieval_warmup' || phase === 'formula_recall') return 'review'
  if (phase === 'independent_practice') return 'independent'
  return 'guided'
}

describe('daily session engine', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

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

  it('keeps multi-day sessions rotating across weak and due skills', () => {
    vi.useFakeTimers()
    let state = {
      ...createInitialState('Calculus 1'),
      onboarded: true,
    }
    const touched = new Map<string, number>()

    for (let day = 0; day < 14; day += 1) {
      vi.setSystemTime(new Date(Date.UTC(2026, 0, 1 + day, 12)))
      state = startDailySession(state, 'normal')

      while (state.dailySession) {
        const phase = state.dailySession.phases[state.dailySession.phaseIndex]
        const action = buildSessionPhaseAction(state, phase)
        const skillId = action.skillIds[0]
        touched.set(skillId, (touched.get(skillId) ?? 0) + 1)

        state = recordAttempt(state, {
          problemId: problemForSkill(state, skillId),
          skillIds: [skillId],
          answer: 'ok',
          correct: day % 5 !== 2,
          mode: attemptModeForPhase(phase),
          hintCount: day % 5 === 2 ? 1 : 0,
          seconds: 72,
          mixed: phase === 'mixed_review' || phase === 'retrieval_warmup',
          delayed: phase === 'mixed_review' || phase === 'retrieval_warmup',
          confidence: day % 5 === 2 ? 2 : 4,
        })
        state = advanceDailySession(state)
      }
    }

    const counts = [...touched.values()].sort((a, b) => a - b)
    const highestCount = counts[counts.length - 1] ?? 0
    const totalTouches = counts.reduce((sum, count) => sum + count, 0)

    expect(touched.size).toBeGreaterThanOrEqual(10)
    expect(highestCount / totalTouches).toBeLessThanOrEqual(0.2)
    expect(state.reviewQueue.filter((item) => state.skills[item.skillId])).not.toHaveLength(0)
    expect(Object.values(state.mastery).some((record) => record.evidenceCount >= 3)).toBe(true)
  }, 15000)
})
