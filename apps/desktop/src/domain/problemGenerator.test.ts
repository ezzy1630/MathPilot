import { describe, expect, it, vi } from 'vitest'
import { FORMULA_CATALOG } from './formulaRecallCatalog'
import { createInitialState } from './learningEngine'
import {
  generateProblemForSkill,
  generateProblemViaCodexAsync,
  parseCodexProblemPayload,
  verifyGeneratedProblem,
  verifyGeneratedProblemAsync,
} from './problemGenerator'
import {
  activeProblems,
  markProblemDeprecated,
  markProblemUnverifiedUsed,
  promoteProblemToVerified,
  verifiedProblems,
} from './problemBank'
import { verifyCalculusSymbolic } from './symbolicCheck'

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

describe('problemGenerator', () => {
  it('verifies template answers against themselves', () => {
    const v = verifyGeneratedProblem({
      skillId: 'chain_rule',
      title: 't',
      prompt: 'p',
      expectedAnswer: '24*x*(3*x^2+1)^3',
      mode: 'guided_practice',
      difficulty: 0.5,
      answerType: 'expression',
      hintSequence: ['hint'],
      variables: ['x'],
    })
    expect(v.symbolic).toBe('passed')
  })

  it('adds generated problem with verification metadata', () => {
    const state = createInitialState('Calculus 1')
    const result = generateProblemForSkill(state, 'chain_rule', 42)
    expect(result).not.toBeNull()
    expect(result!.record.problem.verificationStatus).toBe('verified')
    expect(result!.record.codexMetadata?.requiresShowWork).toBeDefined()
    expect(result!.state.problems[result!.record.problem.id]).toBeTruthy()
  })

  it('async verification uses symbolic check path', async () => {
    const v = await verifyGeneratedProblemAsync({
      skillId: 'chain_rule',
      title: 't',
      prompt: 'p',
      expectedAnswer: '24*x*(3*x^2+1)^3',
      mode: 'guided_practice',
      difficulty: 0.5,
      answerType: 'expression',
      hintSequence: ['hint'],
      variables: ['x'],
    })
    expect(['passed', 'failed']).toContain(v.symbolic)
  })

  it('verifies derivative prompts via numeric calculus check', async () => {
    const result = await verifyCalculusSymbolic({
      expression: 'x^3',
      expected: '3*x^2',
      mode: 'derivative',
      variables: ['x'],
    })
    expect(result).toBe('passed')
  })

  it('formula recall catalog meets spec minimum', () => {
    expect(FORMULA_CATALOG.length).toBeGreaterThanOrEqual(60)
  })

  it('parses codex JSON payloads', () => {
    const payload = parseCodexProblemPayload(
      '{"prompt":"Differentiate x^2","expected_answer":"2*x","difficulty":0.4}',
    )
    expect(payload?.prompt).toContain('Differentiate')
    expect(payload?.expectedAnswer).toBe('2*x')
  })

  it('generateProblemViaCodexAsync saves verified codex output when developer mode on', async () => {
    let state = createInitialState('Calculus 1')
    state = { ...state, developerModeEnabled: true }
    const result = await generateProblemViaCodexAsync(state, 'chain_rule', 7)
    expect(result).not.toBeNull()
    expect(result!.record.problem.source).toBe('codex_generated')
    expect(result!.record.codexMetadata?.source).toBe('codex_generated')
    expect(result!.state.problems[result!.record.problem.id]).toBeTruthy()
  })

  it('skips codex generation when explicitly disabled', async () => {
    const state = {
      ...createInitialState('Calculus 1'),
      preferences: {
        ...createInitialState('Calculus 1').preferences!,
        enableCodexProblemGen: false,
      },
    }
    const result = await generateProblemViaCodexAsync(state, 'chain_rule', 1)
    expect(result).toBeNull()
  })

  it('allows codex generation by default', async () => {
    const state = createInitialState('Calculus 1')
    const result = await generateProblemViaCodexAsync(state, 'chain_rule', 2)
    expect(result).not.toBeNull()
    expect(result!.record.problem.source).toBe('codex_generated')
  })

  it('promote and deprecate problem bank workflow', () => {
    let state = createInitialState('Calculus 1')
    const generated = generateProblemForSkill(state, 'chain_rule', 99)
    expect(generated).not.toBeNull()
    state = generated!.state
    const id = generated!.record.problem.id

    state = promoteProblemToVerified(state, id)
    expect(state.problems[id].verificationStatus).toBe('verified')
    expect(verifiedProblems(state).some((p) => p.id === id)).toBe(true)

    state = markProblemUnverifiedUsed(state, id)
    expect(state.problems[id].verificationStatus).toBe('unverified_used')

    state = markProblemDeprecated(state, id, 'bad answer key')
    expect(state.problems[id].deprecated).toBe(true)
    expect(state.problems[id].verificationStatus).toBe('deprecated')
    expect(activeProblems(state).some((p) => p.id === id)).toBe(false)
  })
})
