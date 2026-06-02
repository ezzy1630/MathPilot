import { describe, expect, it } from 'vitest'
import { codexTimeoutSecsForTask, codexFailureUserMessage } from './codexConfig'

describe('codexConfig', () => {
  it('uses shorter timeouts for tutor hints', () => {
    expect(codexTimeoutSecsForTask('hint chain_rule')).toBe(45)
    expect(codexTimeoutSecsForTask('homework_analysis')).toBe(180)
    expect(codexTimeoutSecsForTask('code_self_improvement')).toBe(300)
  })

  it('respects preference overrides within bounds', () => {
    expect(
      codexTimeoutSecsForTask('hint', { codexTimeoutHintSecs: 60 }),
    ).toBe(60)
    expect(
      codexTimeoutSecsForTask('hint', { codexTimeoutHintSecs: 5 }),
    ).toBe(45)
  })

  it('formats user-facing curator failure messages', () => {
    expect(codexFailureUserMessage('timed_out', 'Maintenance curator')).toContain('timed out')
  })
})
