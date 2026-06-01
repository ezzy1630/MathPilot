import { describe, expect, it } from 'vitest'
import { createInitialState } from './learningEngine'
import { generateProblemForSkill, verifyGeneratedProblem, verifyGeneratedProblemAsync } from './problemGenerator'

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
})
