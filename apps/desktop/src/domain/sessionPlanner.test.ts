import { describe, expect, it, vi } from 'vitest'
import { advanceDailySession, startDailySession } from './dailySessionEngine'
import { createInitialState } from './learningEngine'
import { resolveProblemForAction, resolveProblemForActionAsync } from './sessionPlanner'

vi.mock('./aiAdapter', () => ({
  invokeCodexForTask: vi.fn(async (state: ReturnType<typeof createInitialState>) => ({
    state,
    result: {
      ok: true,
      stdout: JSON.stringify({
        prompt: 'Differentiate x^3',
        expectedAnswer: '3*x^2',
        difficulty: 0.45,
      }),
      stderr: '',
      mode: 'codex_cli',
    },
  })),
}))

describe('sessionPlanner', () => {
  it('resolves or generates a problem for a skill', () => {
    const state = createInitialState('Calculus 1')
    const { problemId } = resolveProblemForAction(state, ['chain_rule'], 'guided_practice')
    expect(problemId).toBeTruthy()
  })

  it('selects review-type problems during mixed review phase', () => {
    const state = startDailySession(createInitialState('Calculus 1'), 'normal')
    const { state: nextState, problemId } = resolveProblemForAction(state, ['chain_rule'], 'mixed_review')
    expect(problemId).toBeTruthy()
    const problem = nextState.problems[problemId!]
    expect(problem?.mode === 'mixed_review' || problem?.source?.startsWith('review_')).toBeTruthy()
  })

  it('builds formula recall problems during formula_recall phase', () => {
    let state = startDailySession(createInitialState('Calculus 1'), 'deep')
    while (state.dailySession && state.dailySession.phases[state.dailySession.phaseIndex] !== 'formula_recall') {
      const target = state.dailySession.itemsTargetInPhase
      for (let i = 0; i < target; i += 1) {
        state = advanceDailySession(state)
      }
      if (!state.dailySession) break
    }
    if (state.dailySession?.phases[state.dailySession.phaseIndex] === 'formula_recall') {
      const { state: nextState, problemId } = resolveProblemForAction(state, ['chain_rule'], 'formula_recall')
      expect(problemId).toBeTruthy()
      expect(nextState.problems[problemId!]?.source).toBe('formula_recall_session')
    }
  })

  it('uses codex generation for new skills when enableCodexProblemGen is on', async () => {
    let state = createInitialState('Calculus 1')
    state = {
      ...state,
      developerModeEnabled: true,
      preferences: {
        ...state.preferences!,
        enableCodexProblemGen: true,
      },
    }
    state.problems = {}
    const { state: nextState, problemId } = await resolveProblemForActionAsync(
      state,
      ['chain_rule'],
      'guided_practice',
    )
    expect(problemId).toBeTruthy()
    expect(nextState.problems[problemId!]?.source).toBe('codex_generated')
  })
})
