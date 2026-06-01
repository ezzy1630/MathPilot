import { describe, expect, it } from 'vitest'
import { interleavePolicyForSkill, shouldInterleaveSimilarSkills } from './interleavingPolicy'

describe('interleavingPolicy', () => {
  it('groups chain rule with related rates and implicit differentiation', () => {
    expect(shouldInterleaveSimilarSkills('chain_rule')).toBe(true)
    const policy = interleavePolicyForSkill('chain_rule', new Set())
    expect(policy.preferSkillIds).toEqual(
      expect.arrayContaining(['related_rates', 'implicit_differentiation']),
    )
  })

  it('avoids recently practiced cluster mates when possible', () => {
    const policy = interleavePolicyForSkill('chain_rule', new Set(['related_rates']))
    expect(policy.preferSkillIds).toContain('implicit_differentiation')
    expect(policy.preferSkillIds).not.toContain('related_rates')
  })
})
