import { describe, expect, it } from 'vitest'
import { loadProductionProblemBank } from './problemBankLoader'

describe('problemBankLoader', () => {
  it('loads hundreds of catalog-backed problems for Calc 1', () => {
    const bank = loadProductionProblemBank('Calculus 1')
    expect(bank.length).toBeGreaterThan(150)
    expect(bank.some((p) => p.source === 'curated_json')).toBe(true)
    expect(bank.some((p) => p.source === 'catalog_bank')).toBe(true)
  })

  it('curated JSON files contain 100+ items per course', async () => {
    const c1 = await import('@config/problem_bank/calculus_1_curated.json')
    const c2 = await import('@config/problem_bank/calculus_2_curated.json')
    expect(c1.problems.length).toBeGreaterThanOrEqual(100)
    expect(c2.problems.length).toBeGreaterThanOrEqual(100)
  })
})
