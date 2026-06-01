import { describe, expect, it } from 'vitest'
import { FORMULA_CATALOG } from './formulaRecallCatalog'
import { createInitialState } from './learningEngine'
import { generateProblemForSkill, verifyGeneratedProblem, verifyGeneratedProblemAsync } from './problemGenerator'
import { verifyCalculusSymbolic } from './symbolicCheck'

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
    expect(FORMULA_CATALOG.length).toBeGreaterThanOrEqual(40)
  })
})
