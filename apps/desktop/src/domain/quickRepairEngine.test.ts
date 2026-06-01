import { describe, expect, it } from 'vitest'
import { advanceQuickRepair, currentQuickRepairProblem, phaseLabel, startQuickRepair } from './quickRepairEngine'
import { createInitialState } from './learningEngine'

describe('quick repair engine', () => {
  it('walks through phases', () => {
    let state = createInitialState('Calculus 1')
    state = startQuickRepair(state, 'chain_rule')
    expect(state.quickRepair?.phase).toBe('explain')

    state = advanceQuickRepair(state, true)
    expect(state.quickRepair?.phase).toBe('example_1')
    expect(phaseLabel('example_1')).toContain('example')
  })

  it('rotates targeted practice problems instead of repeating the same prompt', () => {
    const base = createInitialState('Calculus 1')
    const withRepairProblems = {
      ...base,
      problems: {
        ...base.problems,
        'repair-chain-a': {
          id: 'repair-chain-a',
          title: 'Repair A',
          prompt: 'Differentiate (x^2+1)^3.',
          skillIds: ['chain_rule'],
          difficulty: 0.35,
          mode: 'quick_repair' as const,
          answerType: 'expression' as const,
          expectedAnswer: '6*x*(x^2+1)^2',
          hintSequence: ['Identify the inner function.'],
        },
        'repair-chain-b': {
          id: 'repair-chain-b',
          title: 'Repair B',
          prompt: 'Differentiate sin(4x).',
          skillIds: ['chain_rule'],
          difficulty: 0.38,
          mode: 'quick_repair' as const,
          answerType: 'expression' as const,
          expectedAnswer: '4*cos(4*x)',
          hintSequence: ['Multiply by the derivative of 4x.'],
        },
      },
    }

    const repair = advanceQuickRepair(
      advanceQuickRepair(
        advanceQuickRepair(startQuickRepair(withRepairProblems, 'chain_rule'), true),
        true,
      ),
      true,
    )

    const first = currentQuickRepairProblem(repair)
    const second = currentQuickRepairProblem({
      ...repair,
      quickRepair: repair.quickRepair && { ...repair.quickRepair, problemsAnswered: 1 },
    })

    expect(first?.id).toBe('repair-chain-a')
    expect(second?.id).toBe('repair-chain-b')
  })
})
