import { describe, expect, it } from 'vitest'
import { diagnosticProblemForSkill } from './diagnosticTemplates'

describe('diagnosticTemplates', () => {
  it('does not use placeholder ready answers for chain rule', () => {
    const p = diagnosticProblemForSkill('chain_rule', 0)
    expect(p?.expectedAnswer).not.toBe('ready')
    expect(p?.answerType).toBe('expression')
  })
})
