import { describe, expect, it } from 'vitest'
import {
  batchSizeForSession,
  computeDeterministicBatchPlan,
  isDuplicateProbe,
  parseCodexBatchPlanResponse,
  promptHash,
} from './diagnosticBatchPlan'
import { createInitialState } from './learningEngine'

describe('diagnosticBatchPlan', () => {
  it('uses smaller batches for continuing diagnostics', () => {
    expect(batchSizeForSession({ weakSkills: [], strongSkills: [], continuing: true })).toBe(4)
    expect(batchSizeForSession({ weakSkills: [], strongSkills: [] })).toBe(6)
  })

  it('builds confirm-weakness probes after misses', () => {
    const state = createInitialState('Calculus 1')
    const plan = computeDeterministicBatchPlan(
      state,
      {
        weakSkills: ['chain_rule'],
        strongSkills: [],
        suspectedWeakSkills: [],
        skillProbes: {},
      },
      1,
    )
    expect(plan.source).toBe('deterministic')
    expect(plan.probes.some((p) => p.skillId === 'chain_rule' && p.intent === 'confirm_weakness')).toBe(true)
  })

  it('detects duplicate prompt hashes', () => {
    const prompt = 'What is d/dx [x^2]?'
    const session = {
      weakSkills: [],
      strongSkills: [],
      shownPromptHashes: [promptHash(prompt)],
    }
    expect(isDuplicateProbe(session, 'chain_rule', 'procedural', prompt)).toBe(true)
  })

  it('parses codex batch JSON with embedded problems', () => {
    const state = createInitialState('Calculus 1')
    const stdout = JSON.stringify({
      batch_rationale: 'Probe chain gaps',
      probes: [
        {
          skill_id: 'chain_rule',
          question_kind: 'choice',
          intent: 'confirm_weakness',
          rationale: 'Check method',
          difficulty_target: 0.4,
          problem: {
            prompt: 'Which rule for sin(x^2)?',
            expected_answer: 'chain rule',
            answer_type: 'choice',
            choices: ['chain rule', 'product rule'],
          },
        },
      ],
    })
    const plan = parseCodexBatchPlanResponse(stdout, state, 2)
    expect(plan?.source).toBe('codex')
    expect(plan?.probes[0]?.problem?.prompt).toContain('sin(x^2)')
  })
})
