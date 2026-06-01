import { describe, expect, it } from 'vitest'
import { chooseNextAction, createInitialState } from './index'

describe('@mathpilot/learning-engine package', () => {
  it('exports chooseNextAction from domain barrel', () => {
    const state = createInitialState('Calculus 1')
    const action = chooseNextAction(state)
    expect(action.title.length).toBeGreaterThan(0)
    expect(action.cta.length).toBeGreaterThan(0)
  })

  it('initial state includes expanded resource catalog', () => {
    const state = createInitialState('Calculus 1')
    expect(Object.keys(state.resources).length).toBeGreaterThan(10)
    expect(state.resources['ka-composition']).toBeTruthy()
  })
})
