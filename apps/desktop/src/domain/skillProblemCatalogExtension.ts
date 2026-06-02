import type { PracticeSpec, SkillCatalogEntry } from './skillProblemCatalog'

const diag = (
  title: string,
  prompt: string,
  expectedAnswer: string,
  difficulty: number,
  hints: string[],
  variables?: string[],
  tags?: string[],
) => [{ title, prompt, expectedAnswer, answerType: 'expression' as const, difficulty, hintSequence: hints, variables, tags }]

type PracticeTuple = [string, string, string, number, string[], string[]?, string[]?]

function practiceSet(...items: PracticeTuple[]): PracticeSpec[] {
  return items.map(([title, prompt, expectedAnswer, difficulty, hints, variables, tags]) => ({
    title,
    prompt,
    expectedAnswer,
    answerType: 'expression' as const,
    difficulty,
    mode: 'guided_practice' as const,
    hintSequence: hints,
    variables,
    tags,
  }))
}

/** Catalog entries for skills added in skills_extension.json (spec §6.3). */
export const SKILL_CATALOG_EXTENSION: Record<string, SkillCatalogEntry> = {
  exponents_radicals: {
    skillId: 'exponents_radicals',
    diagnostics: diag('Exponents checkpoint', 'Simplify x^(3/2) · x^(1/2).', 'x^2', 0.3, ['Add exponents when bases match.'], ['x']),
    practice: practiceSet(
      ['Exponent rule', 'Simplify (x^2)^3.', 'x^6', 0.28, ['Multiply exponents.'], ['x'], ['transfer']],
      ['Radical to power', 'Write sqrt(x) as a power of x.', 'x^(1/2)', 0.32, ['Square root is exponent 1/2.'], ['x'], ['transfer']],
      ['Negative exponent', 'Simplify x^(-2) · x^5.', 'x^3', 0.36, ['Add exponents; -2 + 5 = 3.'], ['x'], ['misconception:negative_exponent']],
    ),
  },
  logarithms: {
    skillId: 'logarithms',
    diagnostics: diag('Log checkpoint', 'Solve for x: ln(x) = 2.', 'exp(2)', 0.32, ['Exponentiate both sides.'], ['x']),
    practice: practiceSet(
      ['Log property', 'Write ln(a) + ln(b) as a single log.', 'ln(a*b)', 0.3, ['Use ln(ab) = ln a + ln b.'], undefined, ['misconception:log_of_sum']],
      ['Change of base', 'log_2(8) equals?', '3', 0.34, ['2^3 = 8.'], undefined, ['transfer']],
      ['Solve log equation', 'If log(x) = 1, then x = ?', '10', 0.28, ['Definition of common log.'], ['x'], ['transfer']],
    ),
  },
  exponential_functions: {
    skillId: 'exponential_functions',
    diagnostics: diag('Exponential checkpoint', 'f(x) = 3·2^x. Find f(2).', '12', 0.28, ['Substitute x = 2.'], ['x']),
    practice: practiceSet(
      ['Growth factor', 'A population doubles every hour from 100. After 3 hours?', '800', 0.3, ['Multiply by 2^3.'], undefined, ['transfer']],
      ['Half-life decay', '500 mg decays by factor 1/2 each day. After 2 days?', '125', 0.38, ['Multiply by (1/2)^2.'], undefined, ['transfer']],
      ['Exponential equation', 'Solve 3^x = 81.', '4', 0.42, ['81 = 3^4.'], ['x'], ['misconception:base_confusion']],
    ),
  },
  inverse_functions: {
    skillId: 'inverse_functions',
    diagnostics: diag('Inverse checkpoint', 'If f(x) = 2x + 4, find f⁻¹(x).', 'x/2-2', 0.35, ['Swap x and y, solve for y.'], ['x']),
    practice: practiceSet(
      ['Composition', 'If f(x)=x+1, is f(f⁻¹(x)) equal to x?', 'x', 0.3, ['Inverse undoes f.'], ['x'], ['transfer']],
      ['Domain swap', 'If f(x)=x^2 for x≥0, f⁻¹(x)=?', 'sqrt(x)', 0.4, ['Restrict domain before inverting.'], ['x'], ['misconception:inverse_domain']],
      ['Verify inverse', 'For f(x)=3x-6, f⁻¹(9) equals?', '5', 0.36, ['Solve 3x-6=9 or use inverse rule.'], ['x'], ['transfer']],
    ),
  },
  graph_interpretation: {
    skillId: 'graph_interpretation',
    diagnostics: diag('Graph checkpoint', "A graph rises left to right. Sign of f' on that interval?", 'positive', 0.25, ['Rising ⟹ positive slope.']),
    practice: practiceSet(
      ['Intercept', 'Graph crosses x-axis at x=2. What is a zero of f?', '2', 0.26, ['Zero at x-intercept.'], undefined, ['transfer']],
      ['Increasing interval', "Where graph is steepest upward, |f'| is?", 'largest', 0.34, ['Slope magnitude is steepness.'], undefined, ['misconception:value_vs_rate']],
      ['Value read', 'Graph passes through (0, -1). f(0) = ?', '-1', 0.22, ['Read y at x=0.'], undefined, ['transfer']],
    ),
  },
  transformations: {
    skillId: 'transformations',
    diagnostics: diag('Transform checkpoint', 'f(x)=x^2 shifted right 3 units: g(x)=?', '(x-3)^2', 0.32, ['Replace x with x-3.'], ['x']),
    practice: practiceSet(
      ['Reflection', 'Reflect y=x^2 across x-axis: h(x)=?', '-x^2', 0.3, ['Multiply output by -1.'], ['x'], ['misconception:reflection_order']],
      ['Vertical stretch', 'Graph y=3f(x) stretches vertically by factor?', '3', 0.28, ['Coefficient multiplies outputs.'], undefined, ['transfer']],
      ['Horizontal shift', 'f(x+5) shifts the graph of f which direction?', 'left 5', 0.35, ['x+5 inside ⟹ left.'], ['x'], ['misconception:horizontal_shift']],
    ),
  },
  trig_identities_calc: {
    skillId: 'trig_identities_calc',
    diagnostics: diag('Trig identity checkpoint', 'Simplify sin²x + cos²x.', '1', 0.28, ['Pythagorean identity.'], ['x']),
    practice: practiceSet(
      ['Double angle', 'cos(2x) in terms of cos x only (no +).', '2*cos(x)^2-1', 0.35, ['Use cos(2x)=2cos²x-1.'], ['x'], ['transfer']],
      ['Tan identity', 'tan(x) in terms of sin and cos.', 'sin(x)/cos(x)', 0.32, ['Definition of tangent.'], ['x'], ['transfer']],
      ['Cofunction', 'sin(pi/2 - x) equals?', 'cos(x)', 0.38, ['Cofunction identity.'], ['x'], ['misconception:pythagorean_misuse']],
    ),
  },
  word_problem_translation: {
    skillId: 'word_problem_translation',
    diagnostics: diag('Modeling checkpoint', 'A rectangle has width w and length 2w. Area A in terms of w?', '2*w^2', 0.3, ['A = length × width.'], ['w']),
    practice: practiceSet(
      ['Constraint', 'Perimeter 20 for width w and length 2w. Equation?', '2*w+2*(2*w)=20', 0.32, ['Sum sides.'], ['w']],
      ['Rate wording', 'Water flows at 4 gal/min into a tank. dV/dt = ?', '4', 0.28, ['Rate is derivative of volume.']],
      ['Geometric relation', 'Circle radius r. Circumference C in terms of r?', '2*pi*r', 0.26, ['C = 2πr.'], ['r']],
    ),
  },
  rates_units: {
    skillId: 'rates_units',
    diagnostics: diag('Rates checkpoint', 'A tank drains 5 L/min. Sign of dV/dt?', '-5', 0.28, ['Draining decreases volume.']),
    practice: practiceSet(
      ['Units', 'Speed 3 m/s for 10 s. Distance traveled?', '30', 0.26, ['distance = rate × time.']],
      ['Unit conversion', '60 mph equals how many miles per minute?', '1', 0.34, ['Divide by 60.']],
      ['Related quantity', 'If dx/dt = 2 ft/s, position changes how fast?', '2 ft/s', 0.3, ['Rate of x is dx/dt.']],
    ),
  },
  inverse_trig_derivatives: {
    skillId: 'inverse_trig_derivatives',
    diagnostics: diag(
      'Inverse trig deriv checkpoint',
      'd/dx arcsin(x) = ?',
      '1/sqrt(1-x^2)',
      0.42,
      ['Standard inverse trig derivative.'],
      ['x'],
      ['misconception:chain_rule_inner'],
    ),
    practice: practiceSet(
      [
        'Chain with arcsin',
        'd/dx arcsin(2x) leading factor?',
        '2/sqrt(1-(2*x)^2)',
        0.45,
        ['Chain rule on inner 2x.'],
        ['x'],
        ['misconception:chain_rule_inner'],
      ],
      ['Arctan derivative', 'd/dx arctan(x) = ?', '1/(1+x^2)', 0.4, ['Standard arctan derivative.'], ['x'], ['transfer']],
      ['Arccos derivative', 'd/dx arccos(x) = ?', '-1/sqrt(1-x^2)', 0.44, ['Negative arcsin derivative.'], ['x'], ['transfer']],
    ),
  },
  first_derivative_test: {
    skillId: 'first_derivative_test',
    diagnostics: diag('First deriv test checkpoint', "f' changes + to − at x=1. Local extrema at x=1?", 'max', 0.35, ['Sign change + to − ⟹ local max.']),
    practice: practiceSet(
      ['Sign chart', "f' > 0 on (−1,2). f increasing there?", 'yes', 0.3, ['Positive derivative ⟹ increasing.']],
      ['Min detection', "f' changes − to + at x=0. Extremum type?", 'min', 0.36, ['− to + ⟹ local min.']],
      ['No sign change', "f' = 0 at x=2 but sign does not change. Guaranteed extremum?", 'no', 0.4, ['Need sign change for first deriv test.']],
    ),
  },
  second_derivative_test: {
    skillId: 'second_derivative_test',
    diagnostics: diag('Second deriv test checkpoint', "f''(3) > 0 and f'(3)=0. Local min or max?", 'min', 0.36, ['f′=0 and f″>0 ⟹ local min.']),
    practice: practiceSet(
      ['Concavity link', "f'' < 0 on an interval. Concave up or down?", 'down', 0.3, ['Negative second derivative ⟹ concave down.']],
      ['Max via f double prime', "f'(1)=0 and f''(1)<0. Conclusion?", 'max', 0.38, ['f″<0 ⟹ local max.']],
      ['Inconclusive', "f'(2)=0 and f''(2)=0. Second deriv test?", 'inconclusive', 0.42, ['f″=0 needs another test.']],
    ),
  },
  area_net_change: {
    skillId: 'area_net_change',
    diagnostics: diag('Net change checkpoint', '∫₀² v(t) dt with v>0 gives?', 'displacement', 0.32, ['Integral of velocity is displacement.']),
    practice: practiceSet(
      ['Average value', 'Average of f on [a,b] uses factor 1/(b-a) times ∫?', '1/(b-a)', 0.34, ['Average value formula.']],
      ['Net change formula', "Net change in f from a to b equals ∫ f'(x) dx from a to b?", 'yes', 0.36, ['FTC on derivative.']],
      ['Total distance', 'If v(t) changes sign, total distance requires?', 'split integral', 0.45, ['Integrate absolute velocity or split intervals.']],
    ),
  },
  numerical_integration: {
    skillId: 'numerical_integration',
    diagnostics: diag('Numerical integration checkpoint', 'Trapezoid rule uses what shape areas?', 'trapezoids', 0.3, ['Piecewise linear approx.']),
    practice: practiceSet(
      ['Simpson idea', 'Simpson rule fits what degree polynomials on each subinterval?', 'quadratic', 0.32, ['Parabolic arcs on pairs of subintervals.']],
      ['Midpoint rule', 'Midpoint rule uses sample point at interval?', 'midpoint', 0.28, ['Evaluate at center of each subinterval.']],
      ['Error control', 'More subintervals generally do what to error?', 'decrease', 0.34, ['Finer partition improves accuracy.']],
    ),
  },
  work_applications: {
    skillId: 'work_applications',
    diagnostics: diag('Work checkpoint', 'Constant force 10 N over 2 m. Work W=?', '20', 0.3, ['W = F·d for constant force.']),
    practice: practiceSet(
      ['Variable force', 'Work ∫ F(x) dx represents what?', 'energy transfer', 0.28, ['Integral of force over distance.']],
      ['Spring work', 'Hooke spring F=kx. Work to stretch from 0 to L is ∫ kx dx from 0 to L?', 'yes', 0.38, ['Variable force needs integral.']],
      ['Units check', 'Work in N·m is also called?', 'joule', 0.26, ['SI unit of energy.']],
    ),
  },
  exponential_growth: {
    skillId: 'exponential_growth',
    diagnostics: diag('Growth checkpoint', 'y\' = ky with k>0 models?', 'exponential growth', 0.3, ['Proportional to current amount.']),
    practice: practiceSet(
      ['Logistic', 'Logistic equation slows growth due to?', 'carrying capacity', 0.32, ['Limited resources cap population.']],
      ['Decay model', 'y\' = -ky with k>0 models?', 'exponential decay', 0.34, ['Negative proportional rate.']],
      ['General solution', 'y\'=ky has solution y = ? times e^(kt)', 'C', 0.4, ['Separate and integrate; constant C.']],
    ),
  },
  telescoping_series: {
    skillId: 'telescoping_series',
    diagnostics: diag('Telescoping checkpoint', 'Partial sum of 1/(n(n+1)) telescopes because?', 'consecutive terms cancel', 0.35, ['Rewrite with partial fractions.']),
    practice: practiceSet(
      ['Limit', '∑ 1/(n(n+1)) from n=1 to ∞ equals?', '1', 0.38, ['Most terms cancel; limit of partial sums.']],
      ['Partial fraction form', '1/(n(n+1)) = 1/n − 1/(n+1)?', 'yes', 0.36, ['Telescoping setup.']],
      ['Finite sum', 'Sum 1/(k(k+1)) from k=1 to 4 equals?', '4/5', 0.42, ['Only first and last terms survive.']],
    ),
  },
  root_test: {
    skillId: 'root_test',
    diagnostics: diag('Root test checkpoint', 'Root test uses limit of nth root of |a_n|. If L<1, series?', 'converges', 0.36, ['L<1 ⟹ converges absolutely.']),
    practice: practiceSet(
      ['Compare tests', 'Root test especially handy when terms look like?', '(something)^n', 0.34, ['nth powers simplify under nth root.']],
      ['L equals 1', 'If root test gives L=1, conclusion?', 'inconclusive', 0.38, ['Need another test when L=1.']],
      ['Geometric form', 'For a_n = (3/4)^n, root test limit L = ?', '3/4', 0.4, ['nth root of r^n is |r|.']],
    ),
  },
  absolute_convergence: {
    skillId: 'absolute_convergence',
    diagnostics: diag('Absolute convergence checkpoint', 'If ∑|a_n| converges, original series is?', 'absolutely convergent', 0.32, ['Absolute convergence implies convergence.']),
    practice: practiceSet(
      ['Conditional', 'Alternating series converges but ∑|a_n| diverges: convergence type?', 'conditional', 0.35, ['Conditional vs absolute.']],
      ['Rearrangement', 'Absolutely convergent series can be rearranged without changing?', 'sum', 0.38, ['Rearrangement theorem.']],
      ['Ratio implication', 'If ratio test shows convergence, convergence is?', 'absolute', 0.4, ['Ratio test proves absolute convergence.']],
    ),
  },
  surface_area: {
    skillId: 'surface_area',
    diagnostics: diag('Surface area checkpoint', 'Surface area of revolution uses arc length element and?', 'radius', 0.4, ['2π·(radius)·ds setup.']),
    practice: practiceSet(
      ['Compare volume', 'Surface area formula resembles volume formula but uses?', 'ds instead of dx', 0.38, ['Curved length element.']],
      ['Sphere surface', 'Rotating y=sqrt(R^2-x^2) about x-axis gives shape with surface area involving?', '2*pi*R', 0.45, ['Sphere surface 4πR².'], ['x']],
      ['Shell vs surface', 'Surface area integral measures?', 'lateral area', 0.36, ['Skin of solid, not volume.']],
    ),
  },
  differentials: {
    skillId: 'differentials',
    diagnostics: diag(
      'Differentials checkpoint',
      'For f(x)=x^2 at x=3, the differential dy when dx=0.1 is? (use dy ≈ f\'(3)·dx)',
      '0.6',
      0.36,
      ['dy = f\'(x) dx at the anchor point.'],
      ['x'],
    ),
    practice: practiceSet(
      ['Estimate change', 'f(x)=sqrt(x); at x=4, dx=0.01. dy ≈ ?', '0.0025', 0.38, ['f\'(x)=1/(2sqrt(x)); f\'(4)=1/4.'], ['x'], ['transfer']],
      ['Linear vs differential', 'dy approximates which quantity?', 'Δy', 0.34, ['dy is linear part of change.'], undefined, ['transfer']],
      ['Anchor point', 'Differential dy uses derivative evaluated at?', 'anchor x', 0.32, ['Same x as dx reference.'], undefined, ['misconception:wrong_anchor']],
    ),
  },
  mean_value_theorem: {
    skillId: 'mean_value_theorem',
    diagnostics: diag(
      'MVT checkpoint',
      'On [0,2], f(x)=x^2 satisfies MVT. Find c in (0,2) with f\'(c) equal to average rate of change.',
      '1',
      0.42,
      ['Average rate = (f(2)-f(0))/2 = 2; f\'(c)=2c.'],
      ['x'],
    ),
    practice: practiceSet(
      ['Average rate', 'f(x)=x^3 on [0,3]. Average rate of change = ?', '9', 0.4, ['(27-0)/3.'], ['x'], ['transfer']],
      ['Continuity need', 'MVT requires f to be continuous on?', 'closed interval', 0.34, ['Closed and differentiable inside.'], undefined, ['transfer']],
      ['Instantaneous match', 'MVT guarantees a point c where f\'(c) equals?', 'average rate', 0.36, ['Tangent parallel to secant.'], undefined, ['transfer']],
    ),
  },
  polar_arc_length: {
    skillId: 'polar_arc_length',
    diagnostics: diag('Polar arc length checkpoint', 'Polar arc length uses integrand sqrt(r^2 + (dr/dθ)^2) dθ?', 'yes', 0.4, ['Polar arc element.'], undefined, ['transfer']),
    practice: practiceSet(
      ['Circle arc', 'For r = 5, from θ=0 to π/2, arc length integrand at each θ uses r = ?', '5', 0.38, ['Constant radius in integrand.'], undefined, ['transfer']],
      ['Derivative term', 'If r = 2θ, dr/dθ equals?', '2', 0.42, ['Differentiate with respect to θ.'], ['θ'], ['misconception:polar_ds']],
      ['Bounds', 'Full circle in polar from θ=0 to θ=2π traces arc length equal to?', 'circumference', 0.36, ['Closed curve length.'], undefined, ['transfer']],
    ),
  },
}
