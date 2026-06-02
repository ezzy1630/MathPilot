import { describe, expect, it } from 'vitest'
import { chooseNextAction, createInitialState } from '@mathpilot/learning-engine'
import { checkAnswer, checkAnswerAsync } from '@mathpilot/math-engine'

describe('engine package contracts', () => {
  it('desktop can compose next action from learning-engine', () => {
    const state = createInitialState('Calculus 1')
    const action = chooseNextAction(state)
    expect(action.kind).toBeTruthy()
    expect(action.cta.length).toBeGreaterThan(0)
  })

  it('desktop can grade answers through math-engine contract', () => {
    const result = checkAnswer({
      expected: 'x^2',
      actual: 'x*x',
      variables: ['x'],
      skillIds: ['algebra'],
    })
    expect(result.correct).toBe(true)
    expect(result.feedback.length).toBeGreaterThan(0)
    expect(result.method).toBeTypeOf('string')
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })

  it('desktop exposes async grading contract', async () => {
    const result = await checkAnswerAsync({
      expected: 'sin(x)^2 + cos(x)^2',
      actual: '1',
      variables: ['x'],
      skillIds: ['trig'],
    })
    expect(result.correct).toBe(true)
    expect(result.method).toBeTypeOf('string')
    expect(result.feedback.length).toBeGreaterThan(0)
  })
})
