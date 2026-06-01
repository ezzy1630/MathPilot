import { describe, expect, it } from 'vitest'
import { diagnosticMixForSkills, inferDiagnosticQuestionKind } from './diagnosticQuestionMix'

describe('diagnosticQuestionMix', () => {
  it('generates choice and error-ID items for key skills', () => {
    const items = diagnosticMixForSkills(['chain_rule', 'extrema'])
    expect(items.length).toBeGreaterThanOrEqual(3)
    expect(items.some((p) => p.answerType === 'choice')).toBe(true)
    expect(items.some((p) => p.source?.includes('error_identification'))).toBe(true)
  })

  it('infers question kind from source', () => {
    const choice = diagnosticMixForSkills(['chain_rule'])[0]
    expect(inferDiagnosticQuestionKind(choice)).toBe('choice')
  })
})
