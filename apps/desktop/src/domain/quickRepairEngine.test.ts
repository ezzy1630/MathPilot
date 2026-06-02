import { describe, expect, it } from 'vitest'
import {
  advanceQuickRepair,
  buildQuickRepairPracticeQueue,
  currentQuickRepairProblem,
  phaseLabel,
  startQuickRepair,
} from './quickRepairEngine'
import { createInitialState } from './learningEngine'
import { resetMergedCatalogCache } from './mergedCatalog'

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

  it('uses worked examples from production bank for chain rule', () => {
    resetMergedCatalogCache()
    const state = createInitialState('Calculus 1')
    const repair = advanceQuickRepair(startQuickRepair(state, 'chain_rule'), true)
    const example = currentQuickRepairProblem(repair)
    expect(example?.workedExample?.length).toBeGreaterThan(0)
  })

  it('builds four distinct targeted practice problems when available', () => {
    const base = createInitialState('Calculus 1')
    const problems = {
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
      'repair-chain-c': {
        id: 'repair-chain-c',
        title: 'Repair C',
        prompt: 'Differentiate e^(3x).',
        skillIds: ['chain_rule'],
        difficulty: 0.32,
        mode: 'quick_repair' as const,
        answerType: 'expression' as const,
        expectedAnswer: '3*e^(3*x)',
        hintSequence: ['Use the chain rule on e^(3x).'],
      },
      'repair-chain-d': {
        id: 'repair-chain-d',
        title: 'Repair D',
        prompt: 'Differentiate ln(x^2+1).',
        skillIds: ['chain_rule'],
        difficulty: 0.4,
        mode: 'quick_repair' as const,
        answerType: 'expression' as const,
        expectedAnswer: '2*x/(x^2+1)',
        hintSequence: ['Differentiate the inside first.'],
      },
      'repair-chain-dup': {
        id: 'repair-chain-dup',
        title: 'Duplicate prompt',
        prompt: 'Differentiate sin(4x).',
        skillIds: ['chain_rule'],
        difficulty: 0.39,
        mode: 'quick_repair' as const,
        answerType: 'expression' as const,
        expectedAnswer: '4*cos(4*x)',
        hintSequence: ['Duplicate should be skipped.'],
      },
    }

    const queue = buildQuickRepairPracticeQueue({ ...base, problems }, 'chain_rule')
    expect(queue).toHaveLength(4)
    expect(new Set(queue).size).toBe(4)
    expect(queue).not.toContain('repair-chain-dup')
  })
})
