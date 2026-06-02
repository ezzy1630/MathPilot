import { describe, expect, it } from 'vitest'
import type { Problem } from '../domain/types'
import { enrichProblemWithLatex, enrichProblemsRecord } from './problemLatex'

const baseProblem: Problem = {
  id: 'p1',
  title: 'Limit',
  prompt: 'Evaluate lim x→1 of (x^2 - 1)/(x - 1).',
  skillIds: ['limits_intro'],
  difficulty: 0.4,
  mode: 'guided_practice',
  answerType: 'expression',
  expectedAnswer: '2',
  hintSequence: ['Factor the numerator.'],
  choices: ['2', '0', 'DNE'],
  workedExample: ['Factor x^2 - 1.'],
}

describe('problemLatex', () => {
  it('derives latex fields from plain text', () => {
    const enriched = enrichProblemWithLatex(baseProblem)
    expect(enriched.promptLatex).toContain('\\lim_{x \\to 1}')
    expect(enriched.hintSequenceLatex?.[0]).toContain('Factor')
    expect(enriched.choiceLatex?.[0]).toBeTruthy()
    expect(enriched.workedExampleLatex?.[0]).toContain('Factor')
  })

  it('preserves explicit latex fields', () => {
    const enriched = enrichProblemWithLatex({
      ...baseProblem,
      promptLatex: '\\text{Custom prompt}',
    })
    expect(enriched.promptLatex).toBe('\\text{Custom prompt}')
  })

  it('enriches problem records in bulk', () => {
    const record = enrichProblemsRecord({ p1: baseProblem })
    expect(record.p1.promptLatex).toContain('\\lim_{x \\to 1}')
  })
})
