import { describe, expect, it, vi } from 'vitest'
import { createInitialState } from './learningEngine'
import { startDiagnostic, submitDiagnosticAnswer } from './diagnosticEngine'
import { refreshDiagnosticPlanAsync } from './diagnosticPlanner'

vi.mock('./aiAdapter', () => ({
  invokeCodexForTask: vi.fn(async (state: ReturnType<typeof createInitialState>) => ({
    state,
    packet: '',
    result: {
      ok: false,
      stdout: '',
      stderr: 'offline',
      mode: 'unavailable',
      timedOut: false,
    },
  })),
}))

describe('diagnostic planner integration', () => {
  it('uses codex batch when available', async () => {
    const { invokeCodexForTask } = await import('./aiAdapter')
    vi.mocked(invokeCodexForTask).mockImplementationOnce(async (state) => ({
      state,
      packet: '',
      result: {
        ok: true,
        stdout: JSON.stringify({
          batch_rationale: 'Live probes',
          probes: [
            {
              skill_id: 'chain_rule',
              question_kind: 'choice',
              intent: 'confirm_weakness',
              rationale: 'Check method',
              difficulty_target: 0.4,
              problem: {
                prompt: 'Which rule applies to d/dx [sin(x^2)]?',
                expected_answer: 'chain rule',
                answer_type: 'choice',
                choices: ['chain rule', 'product rule', 'quotient rule'],
              },
            },
          ],
        }),
        stderr: '',
        mode: 'codex_cli',
        timedOut: false,
      },
    }))

    let state = createInitialState('Calculus 1')
    state = startDiagnostic(state).state
    for (let i = 0; i < 3; i += 1) {
      const problemId = state.diagnostic!.queue[i]
      const problem = state.problems[problemId]
      state = submitDiagnosticAnswer(state, problemId, problem?.expectedAnswer ?? '', false)
    }
    const planned = await refreshDiagnosticPlanAsync(state)
    expect(planned.diagnostic?.lastPlanSource).toBe('codex')
    expect(planned.diagnostic?.planHistory?.[0]?.source).toBe('codex')
  })

  it('completes offline batch refresh at answer milestone', async () => {
    let state = createInitialState('Calculus 1')
    const { state: withDiag } = startDiagnostic(state)
    state = withDiag

    for (let i = 0; i < 3; i += 1) {
      const problemId = state.diagnostic!.queue[i]
      const problem = state.problems[problemId]
      state = submitDiagnosticAnswer(state, problemId, problem?.expectedAnswer ?? '', i % 2 === 0)
    }

    const planned = await refreshDiagnosticPlanAsync(state)
    expect(planned.diagnostic?.planHistory?.length).toBe(1)
    expect(planned.diagnostic?.lastPlanSource).toBe('deterministic')
    expect(planned.diagnostic!.queue.length).toBeGreaterThanOrEqual(planned.diagnostic!.currentIndex)
    expect(planned.changelog.some((line) => line.includes('offline'))).toBe(true)
  })

  it('advances nine answers with Codex unavailable at each batch', async () => {
    let state = createInitialState('Calculus 1')
    state = startDiagnostic(state).state

    for (let i = 0; i < 9; i += 1) {
      if (state.diagnostic!.currentIndex >= state.diagnostic!.queue.length) break
      const problemId = state.diagnostic!.queue[state.diagnostic!.currentIndex]
      const problem = state.problems[problemId]
      state = submitDiagnosticAnswer(state, problemId, problem?.expectedAnswer ?? '', true)
      if (state.diagnostic && state.diagnostic.answeredCount % 3 === 0 && !state.diagnostic.completed) {
        state = await refreshDiagnosticPlanAsync(state)
      }
    }

    expect(state.diagnostic?.answeredCount).toBe(9)
    expect(state.diagnostic?.planHistory?.length).toBeGreaterThanOrEqual(2)
    expect(state.diagnostic?.completed).toBe(false)
  })
})
