import { enrichProblems } from '../lib/problemLatex'
import { skillsForCourse } from './courseGraph'
import { loadProductionProblemBank } from './problemBankLoader'
import { expandDiagnosticProblemsForSkills } from './diagnosticTemplates'
import { diagnosticMixForSkills } from './diagnosticQuestionMix'
import type { CourseFocus, Problem, ResourceRecord } from './types'

/** @deprecated Use courseGraph.skillsForCourse — kept for problem metadata only */
export const legacySkills = [
  {
    id: 'function_composition',
    name: 'Function Composition',
    area: 'Prerequisite Readiness',
    course: 'Prerequisite',
    type: 'mixed',
    prerequisites: ['function_notation'],
    supports: ['chain_rule', 'u_substitution'],
    commonMistakes: ['loses the inner expression', 'treats nested expressions as linear'],
    resources: ['ka-composition', 'paul-function-review'],
  },
  {
    id: 'function_notation',
    name: 'Function Notation',
    area: 'Prerequisite Readiness',
    course: 'Prerequisite',
    type: 'conceptual',
    prerequisites: [],
    supports: ['function_composition', 'limits_intro'],
    commonMistakes: ['confuses input value with function output'],
    resources: ['ka-functions'],
  },
  {
    id: 'limits_intro',
    name: 'Limits and Continuity',
    area: 'Limits',
    course: 'Calculus 1',
    type: 'mixed',
    prerequisites: ['function_notation'],
    supports: ['derivative_definition', 'ftc'],
    commonMistakes: ['uses function value instead of approaching behavior'],
    resources: ['3b1b-limits', 'ka-limits'],
  },
  {
    id: 'derivative_rules_basic',
    name: 'Derivative Rules',
    area: 'Derivatives',
    course: 'Calculus 1',
    type: 'procedural',
    prerequisites: ['limits_intro'],
    supports: ['chain_rule', 'implicit_differentiation', 'related_rates'],
    commonMistakes: ['drops constants', 'misapplies power rule'],
    resources: ['oct-derivatives', 'ka-derivative-rules'],
  },
  {
    id: 'chain_rule',
    name: 'Chain Rule',
    area: 'Derivatives',
    course: 'Calculus 1',
    type: 'mixed',
    prerequisites: ['derivative_rules_basic', 'function_composition'],
    supports: ['implicit_differentiation', 'related_rates', 'optimization', 'u_substitution'],
    commonMistakes: [
      'differentiates the outer function but forgets the inner derivative',
      'fails to identify composition structure',
    ],
    resources: ['ka-chain-rule', 'oct-chain-rule'],
  },
  {
    id: 'related_rates',
    name: 'Related Rates Setup',
    area: 'Applications',
    course: 'Calculus 1',
    type: 'mixed',
    prerequisites: ['chain_rule', 'implicit_differentiation'],
    supports: ['optimization'],
    commonMistakes: ['differentiates before writing a relationship equation', 'drops units'],
    resources: ['prof-leonard-related-rates', 'paul-related-rates'],
  },
  {
    id: 'u_substitution',
    name: 'Basic u-Substitution',
    area: 'Integration',
    course: 'Calculus 1',
    type: 'mixed',
    prerequisites: ['chain_rule'],
    supports: ['integration_by_parts', 'trig_substitution'],
    commonMistakes: ['chooses u but does not transform dx', 'misses constant factors'],
    resources: ['oct-usub', 'ka-usub'],
  },
  {
    id: 'integration_by_parts',
    name: 'Integration by Parts',
    area: 'Integration Techniques',
    course: 'Calculus 2',
    type: 'procedural',
    prerequisites: ['u_substitution'],
    supports: ['improper_integrals', 'series_intro'],
    commonMistakes: ['poor u choice', 'sign error in tabular setup'],
    resources: ['prof-leonard-parts', 'paul-parts'],
  },
  {
    id: 'series_test_selection',
    name: 'Series Test Selection',
    area: 'Sequences and Series',
    course: 'Calculus 2',
    type: 'mixed',
    prerequisites: ['limits_intro'],
    supports: ['power_series'],
    commonMistakes: ['uses ratio test when comparison is cleaner', 'treats inconclusive as divergent'],
    resources: ['prof-leonard-series', 'paul-series'],
  },
]

export const problems: Problem[] = enrichProblems([
  {
    id: 'diagnostic-chain-setup',
    title: 'Diagnostic: Chain Rule Setup',
    prompt: 'Differentiate f(x) = (x^2 + 1)^3.',
    skillIds: ['chain_rule'],
    difficulty: 0.44,
    mode: 'diagnostic',
    answerType: 'expression',
    expectedAnswer: '6*x*(x^2+1)^2',
    hintSequence: ['Identify the outside function first.', 'The inner derivative of x^2 + 1 is 2x.'],
    workedExample: [
      'Treat (x^2 + 1)^3 as outer cube applied to an inner expression.',
      'Differentiate the outer: 3(x^2 + 1)^2.',
      'Multiply by the derivative of the inner: 2x.',
      'Final answer: 6x(x^2 + 1)^2.',
    ],
  },
  {
    id: 'repair-composition',
    title: 'Quick Repair: Composition',
    prompt: 'For h(x) = g(2x - 5), what is the inner expression?',
    skillIds: ['function_composition'],
    difficulty: 0.24,
    mode: 'quick_repair',
    answerType: 'text',
    expectedAnswer: '2x - 5',
    hintSequence: ['The inner expression is what gets passed into g.'],
    workedExample: ['In g(2x - 5), the outer function is g and the inner input is 2x - 5.'],
  },
  {
    id: 'review-chain-mixed',
    title: 'Mixed Review: Chain Rule',
    prompt: 'Differentiate y = sin(4x^2).',
    skillIds: ['chain_rule', 'derivative_rules_basic'],
    difficulty: 0.52,
    mode: 'mixed_review',
    answerType: 'expression',
    expectedAnswer: '8*x*cos(4*x^2)',
    hintSequence: ['The outside function is sine.', 'Now multiply by the derivative of 4x^2.'],
    workedExample: ['d/dx sin(u) = cos(u)u prime.', 'Here u = 4x^2, so u prime = 8x.'],
  },
  {
    id: 'calc2-series-selection',
    title: 'Diagnostic: Series Test',
    prompt: 'For sum n=1 to infinity of 1/n^2, which test directly proves convergence?',
    skillIds: ['series_test_selection'],
    difficulty: 0.48,
    mode: 'diagnostic',
    answerType: 'text',
    expectedAnswer: 'p-series',
    hintSequence: ['Compare the series to the standard 1/n^p family.'],
    workedExample: ['This is a p-series with p = 2. Since p > 1, it converges.'],
  },
])

export const resources: ResourceRecord[] = [
  {
    id: 'ka-chain-rule',
    title: 'Chain rule introduction',
    source: 'Khan Academy',
    url: 'https://www.khanacademy.org/math/differential-calculus/dc-chain',
    skillIds: ['chain_rule'],
    duration: '12 min',
    format: 'video',
    effectivenessScore: 0.72,
    notes: 'Good for method and short checks.',
  },
  {
    id: 'oct-chain-rule',
    title: 'Chain Rule - The Organic Chemistry Tutor',
    source: 'Organic Chemistry Tutor',
    url: 'https://www.youtube.com/results?search_query=organic+chemistry+tutor+chain+rule',
    skillIds: ['chain_rule'],
    duration: '18 min',
    format: 'video',
    effectivenessScore: 0.78,
    notes: 'Procedural practice, useful after the concept is clear.',
  },
  {
    id: '3b1b-limits',
    title: 'Essence of Calculus: Limits',
    source: '3Blue1Brown',
    url: 'https://www.3blue1brown.com/topics/calculus',
    skillIds: ['limits_intro'],
    duration: '15 min',
    format: 'video',
    effectivenessScore: 0.7,
    notes: 'Visual intuition; pair with active practice.',
  },
  {
    id: 'prof-leonard-parts',
    title: 'Integration by Parts',
    source: 'Professor Leonard',
    url: 'https://www.youtube.com/results?search_query=professor+leonard+integration+by+parts',
    skillIds: ['integration_by_parts'],
    duration: '45 min',
    format: 'video',
    effectivenessScore: 0.74,
    notes: 'Deep explanation for Calc 2 technique work.',
  },
]

export function expandDiagnosticProblems(course: CourseFocus): Problem[] {
  const courseSkills = skillsForCourse(course)
  const skillIds = courseSkills.map((s) => s.id)
  const base = expandDiagnosticProblemsForSkills(skillIds)
  const mix = diagnosticMixForSkills(skillIds)
  const ids = new Set(base.map((p) => p.id))
  return [...base, ...mix.filter((p) => !ids.has(p.id))]
}

const allProblemsCache: Partial<Record<CourseFocus, Problem[]>> = {}

export function allProblems(course: CourseFocus): Problem[] {
  const cached = allProblemsCache[course]
  if (cached) return cached

  const ids = new Set(problems.map((p) => p.id))
  const merged = [...problems]
  for (const generated of expandDiagnosticProblems(course)) {
    if (!ids.has(generated.id)) {
      ids.add(generated.id)
      merged.push(generated)
    }
  }
  for (const bank of loadProductionProblemBank(course)) {
    if (!ids.has(bank.id)) {
      ids.add(bank.id)
      merged.push(bank)
    }
  }
  const all = enrichProblems(merged)
  allProblemsCache[course] = all
  return all
}
