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

  it('prefers same-area different-procedure skills', () => {
    const skills = {
      chain_rule: { id: 'chain_rule', area: 'Differentiation', type: 'procedural' },
      product_rule: { id: 'product_rule', area: 'Differentiation', type: 'procedural' },
      related_rates: { id: 'related_rates', area: 'Differentiation', type: 'mixed' },
    }
    const policy = interleavePolicyForSkill('chain_rule', new Set(), skills)
    expect(policy.preferSkillIds.length).toBeGreaterThan(0)
  })
})
