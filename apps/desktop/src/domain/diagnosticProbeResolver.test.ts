import { describe, expect, it } from 'vitest'
import { promptHash } from './diagnosticBatchPlan'
import { resolveDiagnosticProbeAsync } from './diagnosticProbeResolver'
import { diagnosticProblemForSkill } from './diagnosticTemplates'
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

  it('keeps generated fallback problems finalized as diagnostic items', async () => {
    const state = createInitialState('Calculus 1')
    const duplicatedTemplate = diagnosticProblemForSkill('chain_rule', 11)
    const resolved = await resolveDiagnosticProbeAsync(
      state,
      {
        skillId: 'chain_rule',
        questionKind: 'procedural',
        intent: 'broad_scan',
        rationale: 'Cover generated fallback',
        difficultyTarget: 0.45,
      },
      {
        weakSkills: [],
        strongSkills: [],
        shownProblemIds: duplicatedTemplate ? [duplicatedTemplate.id] : [],
        shownPromptHashes: duplicatedTemplate ? [promptHash(duplicatedTemplate.prompt)] : [],
      },
      11,
      new Set(duplicatedTemplate ? [duplicatedTemplate.id] : []),
    )

    expect(resolved.result?.source).toBe('template_engine')
    const problem = resolved.result ? resolved.state.problems[resolved.result.problemId] : undefined
    expect(problem?.mode).toBe('diagnostic')
    expect(problem?.verificationStatus).toBe(resolved.result?.validation.ok ? 'verified' : 'unverified_used')
  })
})
