import { describe, expect, it } from 'vitest'
import { loadProductionProblemBank } from './problemBankLoader'

describe('problemBankLoader', () => {
  it('loads hundreds of catalog-backed problems for Calc 1', () => {
    const bank = loadProductionProblemBank('Calculus 1')
    expect(bank.length).toBeGreaterThan(150)
    expect(bank.some((p) => p.source === 'curated_json')).toBe(true)
    expect(bank.some((p) => p.source === 'catalog_bank')).toBe(true)
  })
})
