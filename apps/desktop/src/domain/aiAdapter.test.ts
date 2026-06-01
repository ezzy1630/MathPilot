import { describe, expect, it } from 'vitest'
import { createPromptPacket } from './aiAdapter'
import { createInitialState } from './learningEngine'

describe('ai adapter', () => {
  it('includes skill, memory, problem, and review context', () => {
    const state = createInitialState('Calculus 1')
    state.reviewQueue = [
      {
        id: 'r',
        skillId: 'chain_rule',
        due: '2020-01-01',
        intervalDays: 1,
        priority: 80,
        reason: 'due',
      },
    ]
    const packet = createPromptPacket(state, 'hint', state.problems['diagnostic-chain-setup'], '6x(x^2+1)^2', undefined, [
      '## skills/teaching/teach_chain_rule.md\nChain rule teaching content.',
    ])
    expect(packet).toContain('## Memory')
    expect(packet).toContain('Skill instructions')
    expect(packet).toContain('teach_chain_rule')
    expect(packet).toContain('Review due')
    expect(packet).toContain('chain_rule')
    expect(packet).toContain('6x(x^2+1)^2')
  })
})
