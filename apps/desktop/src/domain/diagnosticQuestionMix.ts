import type { Problem } from './types'

export type DiagnosticQuestionKind = 'procedural' | 'choice' | 'graph' | 'error_identification'

export interface DiagnosticMixSpec {
  skillId: string
  kind: DiagnosticQuestionKind
  title: string
  prompt: string
  expectedAnswer: string
  answerType: 'expression' | 'text' | 'choice'
  choices?: string[]
  difficulty: number
  hintSequence: string[]
}

const MIX: DiagnosticMixSpec[] = [
  {
    skillId: 'chain_rule',
    kind: 'choice',
    title: 'Method selection',
    prompt: 'Which rule applies to d/dx [sin(x²)]?',
    expectedAnswer: 'chain rule',
    answerType: 'choice',
    choices: ['chain rule', 'product rule', 'quotient rule', 'power rule only'],
    difficulty: 0.35,
    hintSequence: ['Look for a function inside another function.'],
  },
  {
    skillId: 'chain_rule',
    kind: 'error_identification',
    title: 'Spot the mistake',
    prompt: 'A student writes d/dx [sin(x²)] = cos(x²). What went wrong?',
    expectedAnswer: 'missing inner derivative',
    answerType: 'text',
    difficulty: 0.4,
    hintSequence: ['Did they multiply by the derivative of the inner function?'],
  },
  {
    skillId: 'limits_intro',
    kind: 'choice',
    title: 'Limit concept',
    prompt: 'What does lim(x→2) f(x) describe?',
    expectedAnswer: 'approaching value',
    answerType: 'choice',
    choices: ['approaching value', 'f(2) always', 'average slope', 'area under curve'],
    difficulty: 0.3,
    hintSequence: ['Limits describe behavior near a point, not necessarily at it.'],
  },
  {
    skillId: 'extrema',
    kind: 'graph',
    title: 'Graph interpretation',
    prompt: "If f′(x) changes from + to − at x=3, what happens at x=3?",
    expectedAnswer: 'local maximum',
    answerType: 'choice',
    choices: ['local maximum', 'local minimum', 'inflection point', 'discontinuity'],
    difficulty: 0.42,
    hintSequence: ['Sign change in the first derivative signals an extremum.'],
  },
  {
    skillId: 'series_test_selection',
    kind: 'choice',
    title: 'Series test',
    prompt: 'Best first test for ∑ 1/n²?',
    expectedAnswer: 'p-series',
    answerType: 'choice',
    choices: ['p-series', 'ratio test', 'alternating series test', 'root test'],
    difficulty: 0.38,
    hintSequence: ['Match the general term form to a standard test.'],
  },
  {
    skillId: 'u_substitution',
    kind: 'error_identification',
    title: 'Setup check',
    prompt: 'A student sets u = x² but leaves ∫ cos(u) du without changing dx. What is missing?',
    expectedAnswer: 'du substitution',
    answerType: 'text',
    difficulty: 0.36,
    hintSequence: ['u-sub requires replacing dx with du (including constants).'],
  },
  {
    skillId: 'related_rates',
    kind: 'graph',
    title: 'Related rates model',
    prompt: 'A balloon radius increases. Which pair is related by differentiation?',
    expectedAnswer: 'dr/dt and dV/dt',
    answerType: 'choice',
    choices: ['dr/dt and dV/dt', 'V and t only', 'A and x', 'none'],
    difficulty: 0.4,
    hintSequence: ['Write V(r(t)) then differentiate with respect to time.'],
  },
  {
    skillId: 'integration_by_parts',
    kind: 'choice',
    title: 'Parts selection',
    prompt: 'For ∫ x e^x dx, which is a good u?',
    expectedAnswer: 'u = x',
    answerType: 'choice',
    choices: ['u = x', 'u = e^x', 'u = 1', 'u = x e^x'],
    difficulty: 0.37,
    hintSequence: ['LIATE: choose u to simplify when differentiated.'],
  },
  {
    skillId: 'derivative_rules_basic',
    kind: 'choice',
    title: 'Power rule',
    prompt: 'What is d/dx [5x^4]?',
    expectedAnswer: '20x^3',
    answerType: 'choice',
    choices: ['20x^3', '5x^3', '20x^4', '4x^3'],
    difficulty: 0.28,
    hintSequence: ['Multiply the exponent down and subtract one from the power.'],
  },
  {
    skillId: 'function_composition',
    kind: 'error_identification',
    title: 'Composition setup',
    prompt: 'A student writes f(g(x)) = f(x)·g(x). What concept did they confuse?',
    expectedAnswer: 'composition',
    answerType: 'text',
    difficulty: 0.32,
    hintSequence: ['Composition nests one output inside another — it is not multiplication.'],
  },
  {
    skillId: 'function_notation',
    kind: 'choice',
    title: 'Function notation',
    prompt: 'If f(x) = 2x + 1, what does f(3) mean?',
    expectedAnswer: 'evaluate at 3',
    answerType: 'choice',
    choices: ['evaluate at 3', 'multiply f by 3', 'derivative at 3', 'inverse of f'],
    difficulty: 0.25,
    hintSequence: ['The input replaces x in the rule.'],
  },
  {
    skillId: 'implicit_differentiation',
    kind: 'graph',
    title: 'Implicit curve',
    prompt: 'For x² + y² = 25, the slope dy/dx at (3, 4) is:',
    expectedAnswer: '-3/4',
    answerType: 'choice',
    choices: ['-3/4', '3/4', '4/3', '0'],
    difficulty: 0.44,
    hintSequence: ['Differentiate both sides with respect to x and solve for dy/dx.'],
  },
  {
    skillId: 'optimization',
    kind: 'choice',
    title: 'Optimization step',
    prompt: 'After writing a constraint equation, what is the usual next step?',
    expectedAnswer: 'express one variable',
    answerType: 'choice',
    choices: ['express one variable', 'integrate immediately', 'take second derivative test only', 'graph only'],
    difficulty: 0.38,
    hintSequence: ['Reduce to a single-variable function before finding critical points.'],
  },
  {
    skillId: 'ftc',
    kind: 'choice',
    title: 'FTC link',
    prompt: 'The Fundamental Theorem connects antiderivatives to:',
    expectedAnswer: 'definite integrals',
    answerType: 'choice',
    choices: ['definite integrals', 'limits only', 'series convergence', 'polar coordinates'],
    difficulty: 0.35,
    hintSequence: ['FTC evaluates definite integrals using antiderivatives.'],
  },
  {
    skillId: 'power_series',
    kind: 'error_identification',
    title: 'Radius reasoning',
    prompt: 'A student says a power series converges for all x because the first terms look small. What is missing?',
    expectedAnswer: 'ratio test',
    answerType: 'text',
    difficulty: 0.41,
    hintSequence: ['You need a test on the general term or ratio of coefficients.'],
  },
]

export function diagnosticMixForSkills(skillIds: string[]): Problem[] {
  const set = new Set(skillIds)
  return MIX.filter((spec) => set.has(spec.skillId)).map((spec, index) => ({
    id: `diag-mix-${spec.skillId}-${spec.kind}-${index}`,
    title: spec.title,
    prompt: spec.prompt,
    skillIds: [spec.skillId],
    difficulty: spec.difficulty,
    mode: 'diagnostic' as const,
    answerType: spec.answerType,
    expectedAnswer: spec.expectedAnswer,
    choices: spec.choices,
    hintSequence: spec.hintSequence,
    verificationStatus: 'verified' as const,
    source: `diagnostic_${spec.kind}`,
  }))
}

export function inferDiagnosticQuestionKind(problem: Problem): DiagnosticQuestionKind {
  if (problem.source?.includes('error_identification')) return 'error_identification'
  if (problem.source?.includes('graph') || problem.source === 'diagnostic_graph') return 'graph'
  if (problem.answerType === 'choice' || problem.source?.includes('choice')) return 'choice'
  return 'procedural'
}
