import type { FormulaPrompt } from './formulaRecall'

/** Full formula/theorem recall bank keyed to skills in the course graph (spec §12). */
export const FORMULA_CATALOG: FormulaPrompt[] = [
  { id: 'fr-chain', skillId: 'chain_rule', prompt: 'State the chain rule (Leibniz form).', expected: "d/dx f(g(x)) = f'(g(x)) g'(x)" },
  { id: 'fr-product', skillId: 'product_rule', prompt: 'State the product rule.', expected: '(uv)\' = u\'v + uv\'' },
  { id: 'fr-quotient', skillId: 'quotient_rule', prompt: 'State the quotient rule.', expected: '(u/v)\' = (u\'v - uv\')/v^2' },
  { id: 'fr-parts', skillId: 'integration_by_parts', prompt: 'State integration by parts.', expected: '∫ u dv = uv - ∫ v du' },
  { id: 'fr-ftc1', skillId: 'ftc', prompt: 'State FTC Part 1 (derivative of accumulation).', expected: 'd/dx ∫_a^x f(t) dt = f(x)' },
  { id: 'fr-ftc2', skillId: 'ftc', prompt: 'State FTC Part 2 (evaluate definite integral).', expected: '∫_a^b f(x) dx = F(b) - F(a)' },
  { id: 'fr-lhopital', skillId: 'lhopital', prompt: 'When can you apply L\'Hopital\'s rule?', expected: '0/0 or ∞/∞ indeterminate forms' },
  { id: 'fr-geom-series', skillId: 'geometric_series', prompt: 'Sum of convergent geometric series ∑ ar^n.', expected: 'a/(1-r) when |r|<1' },
  { id: 'fr-ratio', skillId: 'ratio_test', prompt: 'Ratio test conclusion when L < 1.', expected: 'series converges' },
  { id: 'fr-root', skillId: 'root_test', prompt: 'Root test: if lim |a_n|^(1/n) < 1, then?', expected: 'series converges' },
  { id: 'fr-taylor', skillId: 'taylor_series', prompt: 'General Taylor series centered at a.', expected: '∑ f^(n)(a)/n! (x-a)^n' },
  { id: 'fr-def-deriv', skillId: 'derivative_definition', prompt: 'Limit definition of f\'(x).', expected: 'lim h→0 (f(x+h)-f(x))/h' },
  { id: 'fr-usub', skillId: 'u_substitution', prompt: 'Core idea of u-substitution.', expected: '∫ f(g(x))g\'(x) dx = ∫ f(u) du' },
  { id: 'fr-polar-area', skillId: 'polar_area', prompt: 'Polar area element.', expected: 'dA = (1/2) r^2 dθ' },
  { id: 'fr-trig-deriv-sin', skillId: 'derivatives_trig', prompt: 'Derivative of sin(x).', expected: 'cos(x)' },
  { id: 'fr-trig-deriv-cos', skillId: 'derivatives_trig', prompt: 'Derivative of cos(x).', expected: '-sin(x)' },
  { id: 'fr-exp-deriv', skillId: 'derivatives_exp_log', prompt: 'Derivative of e^x.', expected: 'e^x' },
  { id: 'fr-ln-deriv', skillId: 'derivatives_exp_log', prompt: 'Derivative of ln(x).', expected: '1/x' },
  { id: 'fr-implicit', skillId: 'implicit_differentiation', prompt: 'Implicit differentiation: differentiate both sides with respect to?', expected: 'x' },
  { id: 'fr-related-rates', skillId: 'related_rates', prompt: 'Related rates: after equation, differentiate with respect to?', expected: 'time t' },
  { id: 'fr-riemann', skillId: 'riemann_sums', prompt: 'Riemann sum approximates?', expected: 'definite integral / area' },
  { id: 'fr-def-int', skillId: 'definite_integrals', prompt: '∫_a^b f(x) dx represents signed?', expected: 'area under curve' },
  { id: 'fr-antideriv', skillId: 'antiderivatives', prompt: 'Antiderivative F satisfies F\' = ?', expected: 'f' },
  { id: 'fr-trig-int', skillId: 'trig_integrals', prompt: '∫ sin(x) dx = ?', expected: '-cos(x)+C' },
  { id: 'fr-trig-sub', skillId: 'trig_substitution', prompt: 'Trig sub often used when integrand has √(a²−x²) — set x = ?', expected: 'a sin(theta)' },
  { id: 'fr-partial-frac', skillId: 'partial_fractions', prompt: 'Partial fractions applies to rational functions after?', expected: 'factor denominator' },
  { id: 'fr-improper', skillId: 'improper_integrals', prompt: 'Improper integral replaces infinite bound with?', expected: 'limit of proper integral' },
  { id: 'fr-volume-disk', skillId: 'volumes_of_revolution', prompt: 'Disk method volume uses ∫ π (radius)² ?', expected: 'dx or dy' },
  { id: 'fr-arc-length', skillId: 'arc_length', prompt: 'Arc length element ds = ?', expected: 'sqrt(1+(dy/dx)^2) dx' },
  { id: 'fr-divergence', skillId: 'divergence_test', prompt: 'Divergence test: if lim a_n ≠ 0, series?', expected: 'diverges' },
  { id: 'fr-integral-test', skillId: 'integral_test', prompt: 'Integral test requires f positive, continuous, and?', expected: 'decreasing' },
  { id: 'fr-alt-series', skillId: 'alternating_series', prompt: 'Alternating series test needs terms decreasing to?', expected: '0' },
  { id: 'fr-abs-conv', skillId: 'absolute_convergence', prompt: 'Absolute convergence means ∑|a_n| ?', expected: 'converges' },
  { id: 'fr-power-radius', skillId: 'power_series', prompt: 'Radius R: series converges for |x-a| ?', expected: '< R' },
  { id: 'fr-taylor-error', skillId: 'taylor_error', prompt: 'Taylor remainder often bounded using?', expected: 'Lagrange form / max derivative' },
  { id: 'fr-parametric', skillId: 'parametric_equations', prompt: 'Parametric slope dy/dx = ?', expected: '(dy/dt)/(dx/dt)' },
  { id: 'fr-squeeze', skillId: 'squeeze_theorem', prompt: 'Squeeze theorem needs g(x) ≤ f(x) ≤ h(x) and limits of g,h equal?', expected: 'same L' },
  { id: 'fr-continuity', skillId: 'continuity', prompt: 'f continuous at a requires f(a), lim f(x), and?', expected: 'limit equals f(a)' },
  { id: 'fr-optimization', skillId: 'optimization', prompt: 'Optimization on closed interval: check critical points and?', expected: 'endpoints' },
  { id: 'fr-first-deriv-test', skillId: 'first_derivative_test', prompt: 'First derivative test uses sign changes of?', expected: "f'" },
  { id: 'fr-second-deriv-test', skillId: 'second_derivative_test', prompt: 'Second derivative test at critical point c uses sign of?', expected: "f''(c)" },
  { id: 'fr-pythag', skillId: 'trig_identities_calc', prompt: 'Pythagorean identity.', expected: 'sin^2 x + cos^2 x = 1' },
  { id: 'fr-log-rules', skillId: 'logarithms', prompt: 'ln(ab) = ?', expected: 'ln a + ln b' },
  { id: 'fr-exp-rules', skillId: 'exponents_radicals', prompt: 'a^m · a^n = ?', expected: 'a^(m+n)' },
  { id: 'fr-ibp-choice', skillId: 'integration_by_parts', prompt: 'LIATE guides choice of?', expected: 'u in integration by parts' },
  { id: 'fr-series-compare', skillId: 'comparison_tests', prompt: 'Direct comparison requires smaller series to?', expected: 'converge for convergence conclusion' },
  { id: 'fr-separable-de', skillId: 'separable_de', prompt: 'Separable DE: separate variables then?', expected: 'integrate both sides' },
]

export function formulasForSkill(skillId: string): FormulaPrompt[] {
  return FORMULA_CATALOG.filter((f) => f.skillId === skillId)
}

export function allFormulaSkillIds(): string[] {
  return [...new Set(FORMULA_CATALOG.map((f) => f.skillId))]
}
