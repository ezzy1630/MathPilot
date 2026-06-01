import type { SkillCatalogEntry } from './skillProblemCatalog'

const diag = (
  title: string,
  prompt: string,
  expectedAnswer: string,
  difficulty: number,
  hints: string[],
  variables?: string[],
) => [{ title, prompt, expectedAnswer, answerType: 'expression' as const, difficulty, hintSequence: hints, variables }]

const practice = (
  title: string,
  prompt: string,
  expectedAnswer: string,
  difficulty: number,
  hints: string[],
  variables?: string[],
) => [
  {
    title,
    prompt,
    expectedAnswer,
    answerType: 'expression' as const,
    difficulty,
    mode: 'guided_practice' as const,
    hintSequence: hints,
    variables,
  },
]

/** Catalog entries for skills added in skills_extension.json (spec §6.3). */
export const SKILL_CATALOG_EXTENSION: Record<string, SkillCatalogEntry> = {
  exponents_radicals: {
    skillId: 'exponents_radicals',
    diagnostics: diag('Exponents checkpoint', 'Simplify x^(3/2) · x^(1/2).', 'x^2', 0.3, ['Add exponents when bases match.'], ['x']),
    practice: practice('Exponent rule', 'Simplify (x^2)^3.', 'x^6', 0.28, ['Multiply exponents.'], ['x']),
  },
  logarithms: {
    skillId: 'logarithms',
    diagnostics: diag('Log checkpoint', 'Solve for x: ln(x) = 2.', 'exp(2)', 0.32, ['Exponentiate both sides.'], ['x']),
    practice: practice('Log property', 'Write ln(a) + ln(b) as a single log.', 'ln(a*b)', 0.3, ['Use ln(ab) = ln a + ln b.']),
  },
  exponential_functions: {
    skillId: 'exponential_functions',
    diagnostics: diag('Exponential checkpoint', 'f(x) = 3·2^x. Find f(2).', '12', 0.28, ['Substitute x = 2.'], ['x']),
    practice: practice('Growth factor', 'A population doubles every hour from 100. After 3 hours?', '800', 0.3, ['Multiply by 2^3.']),
  },
  inverse_functions: {
    skillId: 'inverse_functions',
    diagnostics: diag('Inverse checkpoint', 'If f(x) = 2x + 4, find f⁻¹(x).', 'x/2-2', 0.35, ['Swap x and y, solve for y.'], ['x']),
    practice: practice('Composition', 'If f(x)=x+1, is f(f⁻¹(x)) equal to x?', 'x', 0.3, ['Inverse undoes f.'], ['x']),
  },
  graph_interpretation: {
    skillId: 'graph_interpretation',
    diagnostics: diag('Graph checkpoint', 'A graph rises left to right. Sign of f\' on that interval?', 'positive', 0.25, ['Rising ⟹ positive slope.']),
    practice: practice('Intercept', 'Graph crosses x-axis at x=2. What is a zero of f?', '2', 0.26, ['Zero at x-intercept.']),
  },
  transformations: {
    skillId: 'transformations',
    diagnostics: diag('Transform checkpoint', 'f(x)=x^2 shifted right 3 units: g(x)=?', '(x-3)^2', 0.32, ['Replace x with x-3.'], ['x']),
    practice: practice('Reflection', 'Reflect y=x^2 across x-axis: h(x)=?', '-x^2', 0.3, ['Multiply output by -1.'], ['x']),
  },
  trig_identities_calc: {
    skillId: 'trig_identities_calc',
    diagnostics: diag('Trig identity checkpoint', 'Simplify sin²x + cos²x.', '1', 0.28, ['Pythagorean identity.'], ['x']),
    practice: practice('Double angle', 'cos(2x) in terms of cos x only (no +).', '2*cos(x)^2-1', 0.35, ['Use cos(2x)=2cos²x-1.'], ['x']),
  },
  word_problem_translation: {
    skillId: 'word_problem_translation',
    diagnostics: diag('Modeling checkpoint', 'A rectangle has width w and length 2w. Area A in terms of w?', '2*w^2', 0.3, ['A = length × width.'], ['w']),
    practice: practice('Constraint', 'Perimeter 20 for width w and length 2w. Equation?', '2*w+2*(2*w)=20', 0.32, ['Sum sides.'], ['w']),
  },
  rates_units: {
    skillId: 'rates_units',
    diagnostics: diag('Rates checkpoint', 'A tank drains 5 L/min. Sign of dV/dt?', '-5', 0.28, ['Draining decreases volume.']),
    practice: practice('Units', 'Speed 3 m/s for 10 s. Distance traveled?', '30', 0.26, ['distance = rate × time.']),
  },
  inverse_trig_derivatives: {
    skillId: 'inverse_trig_derivatives',
    diagnostics: diag('Inverse trig deriv checkpoint', 'd/dx arcsin(x) = ?', '1/sqrt(1-x^2)', 0.42, ['Standard inverse trig derivative.'], ['x']),
    practice: practice('Chain with arcsin', 'd/dx arcsin(2x) leading factor?', '2/sqrt(1-(2*x)^2)', 0.45, ['Chain rule on inner 2x.'], ['x']),
  },
  first_derivative_test: {
    skillId: 'first_derivative_test',
    diagnostics: diag('First deriv test checkpoint', "f' changes + to − at x=1. Local extrema at x=1?", 'max', 0.35, ['Sign change + to − ⟹ local max.']),
    practice: practice('Sign chart', "f' > 0 on (−1,2). f increasing there?", 'yes', 0.3, ['Positive derivative ⟹ increasing.']),
  },
  second_derivative_test: {
    skillId: 'second_derivative_test',
    diagnostics: diag('Second deriv test checkpoint', "f''(3) > 0 and f'(3)=0. Local min or max?", 'min', 0.36, ['f′=0 and f″>0 ⟹ local min.']),
    practice: practice('Concavity link', "f'' < 0 on an interval. Concave up or down?", 'down', 0.3, ['Negative second derivative ⟹ concave down.']),
  },
  area_net_change: {
    skillId: 'area_net_change',
    diagnostics: diag('Net change checkpoint', '∫₀² v(t) dt with v>0 gives?', 'total distance forward', 0.32, ['Integral of velocity is displacement.']),
    practice: practice('Average value', 'Average of f on [a,b] uses factor 1/(b-a) times ∫?', '1/(b-a)', 0.34, ['Average value formula.']),
  },
  numerical_integration: {
    skillId: 'numerical_integration',
    diagnostics: diag('Numerical integration checkpoint', 'Trapezoid rule uses what shape areas?', 'trapezoids', 0.3, ['Piecewise linear approx.']),
    practice: practice('Simpson idea', 'Simpson rule fits what degree polynomials on each subinterval?', 'quadratic', 0.32, ['Parabolic arcs on pairs of subintervals.']),
  },
  work_applications: {
    skillId: 'work_applications',
    diagnostics: diag('Work checkpoint', 'Constant force 10 N over 2 m. Work W=?', '20', 0.3, ['W = F·d for constant force.']),
    practice: practice('Variable force', 'Work ∫ F(x) dx represents what?', 'energy transfer', 0.28, ['Integral of force over distance.']),
  },
  exponential_growth: {
    skillId: 'exponential_growth',
    diagnostics: diag('Growth checkpoint', 'y\' = ky with k>0 models?', 'exponential growth', 0.3, ['Proportional to current amount.']),
    practice: practice('Logistic', 'Logistic equation slows growth due to?', 'carrying capacity', 0.32, ['Limited resources cap population.']),
  },
  telescoping_series: {
    skillId: 'telescoping_series',
    diagnostics: diag('Telescoping checkpoint', 'Partial sum of 1/(n(n+1)) telescopes because?', 'consecutive terms cancel', 0.35, ['Rewrite with partial fractions.']),
    practice: practice('Limit', '∑ 1/(n(n+1)) from n=1 to ∞ equals?', '1', 0.38, ['Most terms cancel; limit of partial sums.']),
  },
  root_test: {
    skillId: 'root_test',
    diagnostics: diag('Root test checkpoint', 'Root test uses limit of nth root of |a_n|. If L<1, series?', 'converges', 0.36, ['L<1 ⟹ converges absolutely.']),
    practice: practice('Compare tests', 'Root test especially handy when terms look like?', '(something)^n', 0.34, ['nth powers simplify under nth root.']),
  },
  absolute_convergence: {
    skillId: 'absolute_convergence',
    diagnostics: diag('Absolute convergence checkpoint', 'If ∑|a_n| converges, original series is?', 'absolutely convergent', 0.32, ['Absolute convergence implies convergence.']),
    practice: practice('Conditional', 'Alternating series converges but ∑|a_n| diverges: convergence type?', 'conditional', 0.35, ['Conditional vs absolute.']),
  },
  surface_area: {
    skillId: 'surface_area',
    diagnostics: diag('Surface area checkpoint', 'Surface area of revolution uses arc length element and?', 'radius', 0.4, ['2π·(radius)·ds setup.']),
    practice: practice('Compare volume', 'Surface area formula resembles volume formula but uses?', 'ds instead of dx', 0.38, ['Curved length element.']),
  },
}
