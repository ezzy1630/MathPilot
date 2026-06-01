import type { FormulaPrompt } from './formulaRecall'

/** Full formula/theorem recall bank keyed to skills in the course graph. */
export const FORMULA_CATALOG: FormulaPrompt[] = [
  { id: 'fr-chain', skillId: 'chain_rule', prompt: 'State the chain rule (Leibniz form).', expected: "d/dx f(g(x)) = f'(g(x)) g'(x)" },
  { id: 'fr-product', skillId: 'product_rule', prompt: 'State the product rule.', expected: '(uv)\' = u\'v + uv\'' },
  { id: 'fr-quotient', skillId: 'quotient_rule', prompt: 'State the quotient rule.', expected: '(u/v)\' = (u\'v - uv\')/v^2' },
  { id: 'fr-parts', skillId: 'integration_by_parts', prompt: 'State integration by parts.', expected: '∫ u dv = uv - ∫ v du' },
  { id: 'fr-ftc', skillId: 'ftc', prompt: 'State FTC Part 1 (derivative of accumulation).', expected: 'd/dx ∫_a^x f(t) dt = f(x)' },
  { id: 'fr-lhopital', skillId: 'lhopital', prompt: 'When can you apply L\'Hopital\'s rule?', expected: '0/0 or ∞/∞ indeterminate forms' },
  { id: 'fr-geom-series', skillId: 'geometric_series', prompt: 'Sum of convergent geometric series ∑ ar^n.', expected: 'a/(1-r) when |r|<1' },
  { id: 'fr-ratio', skillId: 'ratio_test', prompt: 'Ratio test conclusion when L < 1.', expected: 'series converges' },
  { id: 'fr-taylor', skillId: 'taylor_series', prompt: 'General Taylor series centered at a.', expected: '∑ f^(n)(a)/n! (x-a)^n' },
  { id: 'fr-def-deriv', skillId: 'derivative_definition', prompt: 'Limit definition of f\'(x).', expected: 'lim h→0 (f(x+h)-f(x))/h' },
  { id: 'fr-usub', skillId: 'u_substitution', prompt: 'Core idea of u-substitution.', expected: '∫ f(g(x))g\'(x) dx = ∫ f(u) du' },
  { id: 'fr-polar-area', skillId: 'polar_area', prompt: 'Polar area element.', expected: 'dA = (1/2) r^2 dθ' },
]

export function formulasForSkill(skillId: string): FormulaPrompt[] {
  return FORMULA_CATALOG.filter((f) => f.skillId === skillId)
}

export function allFormulaSkillIds(): string[] {
  return [...new Set(FORMULA_CATALOG.map((f) => f.skillId))]
}
