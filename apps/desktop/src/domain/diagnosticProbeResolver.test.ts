import { describe, expect, it } from 'vitest'
import { promptHash } from './diagnosticBatchPlan'
import { resolveDiagnosticProbeAsync } from './diagnosticProbeResolver'
import { createInitialState } from './learningEngine'

describe('diagnosticProbeResolver', () => {
  it('resolves a probe from the diagnostic mix offline', async () => {
    const state = createInitialState('Calculus 1')
    const resolved = await resolveDiagnosticProbeAsync(
      state,
      {
        skillId: 'chain_rule',
        questionKind: 'choice',
        intent: 'broad_scan',
        rationale: 'Coverage',
        difficultyTarget: 0.35,
      },
      { weakSkills: [], strongSkills: [] },
      42,
      new Set(),
    )
    expect(resolved.result).not.toBeNull()
    expect(resolved.state.problems[resolved.result!.problemId]).toBeTruthy()
    expect(resolved.result!.source).toMatch(/diagnostic_mix|problem_bank|diagnostic_template/)
  })

  it('rejects duplicate prompts in the same session', async () => {
    const state = createInitialState('Calculus 1')
    const mixItems = Object.values(state.problems).filter((p) => p.skillIds.includes('chain_rule'))
    const first = mixItems[0]
    const session = {
      weakSkills: [],
      strongSkills: [],
      shownPromptHashes: first ? [promptHash(first.prompt)] : [],
      shownProblemIds: first ? [first.id] : [],
    }
    const resolved = await resolveDiagnosticProbeAsync(
      state,
      {
        skillId: 'chain_rule',
        questionKind: 'choice',
        intent: 'broad_scan',
        rationale: 'Coverage',
        difficultyTarget: 0.35,
        problem: first
          ? {
              prompt: first.prompt,
              expectedAnswer: first.expectedAnswer,
              answerType: 'choice',
              choices: first.choices,
            }
          : undefined,
      },
      session,
      99,
      new Set(first ? [first.id] : []),
    )
    if (first) {
      expect(resolved.result?.problemId).not.toBe(first.id)
    }
  })
})
