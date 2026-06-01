import { describe, expect, it } from 'vitest'
import { buildSkillPatchMarkdown } from './skillPatcher'

describe('skillPatcher', () => {
  it('builds patch markdown with skill id and recommendation', () => {
    const md = buildSkillPatchMarkdown('chain_rule', 'Add chain-rule pitfall checklist.')
    expect(md).toContain('# Patch preview for chain_rule')
    expect(md).toContain('Add chain-rule pitfall checklist.')
    expect(md).toContain('## Suggested additions')
  })
})
