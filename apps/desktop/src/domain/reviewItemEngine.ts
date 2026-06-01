import { generateProblemForSkill } from './problemGenerator'
import { FORMULA_CATALOG } from './formulaRecallCatalog'
import type { ActivityKind, MathPilotState, Problem, ReviewItem } from './types'

export type ReviewItemType =
  | 'procedural'
  | 'concept'
  | 'method_selection'
  | 'graph_interpretation'
  | 'explain_in_words'
  | 'recall'
  | 'transfer'
  | 'mistake_correction'

const GRAPH_SKILLS = new Set(['extrema', 'concavity', 'curve_sketching', 'related_rates'])

const GRAPH_PROMPTS: Record<string, { prompt: string; expected: string; choices: string[] }> = {
  extrema: {
    prompt: "Where is f increasing if f'(x)=3x²−3 is negative on (−1,1)?",
    expected: 'nowhere on (−1,1)',
    choices: ['(−∞,−1)', '(−1,1)', '(1,∞)', 'nowhere on (−1,1)'],
  },
  concavity: {
    prompt: 'If f″(x)=6x, where is f concave up?',
    expected: '(0, ∞)',
    choices: ['(−∞,0)', '(0, ∞)', 'everywhere', 'nowhere'],
  },
  curve_sketching: {
    prompt: 'A sign change in f′ at x=2 most likely indicates…',
    expected: 'local extremum at x=2',
    choices: ['inflection at x=2', 'local extremum at x=2', 'vertical asymptote', 'discontinuity'],
  },
}

const CONCEPT_MC: Record<string, { prompt: string; expected: string; choices: string[] }> = {
  limits_intro: {
    prompt: 'Which statement best describes lim(x→a) f(x)?',
    expected: 'value f(x) approaches as x nears a',
    choices: [
      'value f(x) approaches as x nears a',
      'always equals f(a)',
      'largest value of f on an interval',
      'derivative at a',
    ],
  },
  continuity: {
    prompt: 'A function is continuous at x=a when…',
    expected: 'limit equals f(a)',
    choices: ['limit equals f(a)', 'f(a)=0', "f'(a) exists", 'f is increasing at a'],
  },
  derivative_definition: {
    prompt: 'The derivative at x measures…',
    expected: 'instantaneous rate of change',
    choices: ['instantaneous rate of change', 'average value on [a,b]', 'area under curve', 'limit of a series'],
  },
  ftc: {
    prompt: 'FTC Part 2 connects antiderivatives to…',
    expected: 'definite integrals',
    choices: ['definite integrals', 'limits only', 'series convergence', 'implicit differentiation'],
  },
}

const EXPLAIN_PROMPTS: Record<string, { prompt: string; expected: string }> = {
  chain_rule: {
    prompt: 'In one sentence, why do we multiply by the inner derivative in the chain rule?',
    expected: 'inner rate of change',
  },
  limits_intro: {
    prompt: 'Explain what a limit describes without computing a value.',
    expected: 'approaching',
  },
  ftc: {
    prompt: 'Explain the FTC in words: what does ∫ₐᵇ f′(x) dx represent?',
    expected: 'net change',
  },
}

export interface TypedReviewItem extends ReviewItem {
  reviewType: ReviewItemType
  problemId?: string
}

const METHOD_SELECTION: Record<string, { prompt: string; expected: string; choices: string[] }> = {
  series_test_selection: {
    prompt: 'Which test is most direct for ∑ 1/n^3?',
    expected: 'p-series',
    choices: ['p-series', 'ratio test', 'divergence test', 'comparison test'],
  },
  integration_by_parts: {
    prompt: 'Best first move for ∫ x ln(x) dx?',
    expected: 'integration by parts',
    choices: ['integration by parts', 'u-substitution', 'partial fractions', 'trig sub'],
  },
  u_substitution: {
    prompt: 'Best substitution hint for ∫ 2x cos(x^2) dx?',
    expected: 'u = x^2',
    choices: ['u = x^2', 'u = cos(x)', 'u = 2x', 'parts with u=x'],
  },
}

export function inferReviewType(state: MathPilotState, skillId: string): ReviewItemType {
  const mistakes = Object.values(state.mistakePatterns).filter((m) => m.skillIds.includes(skillId))
  if (mistakes.some((m) => m.count >= 2)) return 'mistake_correction'
  if (GRAPH_SKILLS.has(skillId) || GRAPH_PROMPTS[skillId]) return 'graph_interpretation'
  if (FORMULA_CATALOG.some((f) => f.skillId === skillId)) return 'recall'
  if (EXPLAIN_PROMPTS[skillId]) return 'explain_in_words'
  if (METHOD_SELECTION[skillId]) return 'method_selection'
  if (CONCEPT_MC[skillId]) return 'concept'
  const skill = state.skills[skillId]
  if (skill?.type === 'conceptual') return 'concept'
  if (skill?.area.includes('Applications')) return 'transfer'
  return 'procedural'
}

function transferSkillInSameArea(state: MathPilotState, skillId: string): string {
  const skill = state.skills[skillId]
  if (!skill) return skillId
  const alternate = Object.values(state.skills).find(
    (s) => s.area === skill.area && s.id !== skillId && s.type !== skill.type,
  )
  return alternate?.id ?? skillId
}

export function buildReviewProblem(
  state: MathPilotState,
  skillId: string,
  reviewType: ReviewItemType,
  seed: number,
): { state: MathPilotState; problem?: Problem } {
  if (reviewType === 'recall') {
    const formula = FORMULA_CATALOG.find((f) => f.skillId === skillId) ?? FORMULA_CATALOG[0]
    const id = `review-recall-${skillId}-${seed}`
    const problem: Problem = {
      id,
      title: `Recall: ${state.skills[skillId]?.name ?? skillId}`,
      prompt: formula.prompt,
      skillIds: [skillId],
      difficulty: 0.35,
      mode: 'mixed_review',
      answerType: 'text',
      expectedAnswer: formula.expected,
      hintSequence: ['State the rule in words or symbols.'],
      source: 'review_recall',
      verificationStatus: 'verified',
    }
    return { state: { ...state, problems: { ...state.problems, [id]: problem } }, problem }
  }

  if (reviewType === 'method_selection' && METHOD_SELECTION[skillId]) {
    const spec = METHOD_SELECTION[skillId]
    const id = `review-method-${skillId}-${seed}`
    const problem: Problem = {
      id,
      title: 'Method selection',
      prompt: spec.prompt,
      skillIds: [skillId],
      difficulty: 0.4,
      mode: 'mixed_review',
      answerType: 'choice',
      expectedAnswer: spec.expected,
      choices: spec.choices,
      hintSequence: ['Match the integrand/series form to a standard technique.'],
      source: 'review_method',
      verificationStatus: 'verified',
    }
    return { state: { ...state, problems: { ...state.problems, [id]: problem } }, problem }
  }

  if (reviewType === 'graph_interpretation' && GRAPH_PROMPTS[skillId]) {
    const spec = GRAPH_PROMPTS[skillId]
    const id = `review-graph-${skillId}-${seed}`
    const problem: Problem = {
      id,
      title: 'Graph / sign interpretation',
      prompt: spec.prompt,
      skillIds: [skillId],
      difficulty: 0.45,
      mode: 'mixed_review',
      answerType: 'choice',
      expectedAnswer: spec.expected,
      choices: spec.choices,
      hintSequence: ['Build a sign chart from critical points and test intervals.'],
      source: 'review_graph',
      verificationStatus: 'verified',
    }
    return { state: { ...state, problems: { ...state.problems, [id]: problem } }, problem }
  }

  if (reviewType === 'explain_in_words' && EXPLAIN_PROMPTS[skillId]) {
    const spec = EXPLAIN_PROMPTS[skillId]
    const id = `review-explain-${skillId}-${seed}`
    const problem: Problem = {
      id,
      title: 'Explain in words',
      prompt: spec.prompt,
      skillIds: [skillId],
      difficulty: 0.35,
      mode: 'mixed_review',
      answerType: 'text',
      expectedAnswer: spec.expected,
      hintSequence: ['Focus on meaning, not symbols — retrieval in words strengthens memory.'],
      source: 'review_explain',
      verificationStatus: 'verified',
    }
    return { state: { ...state, problems: { ...state.problems, [id]: problem } }, problem }
  }

  if (reviewType === 'mistake_correction') {
    const tag = Object.values(state.mistakePatterns).find((m) => m.skillIds.includes(skillId))
    const id = `review-mistake-${skillId}-${seed}`
    const problem: Problem = {
      id,
      title: 'Correct the mistake pattern',
      prompt: `You often miss "${tag?.tag ?? 'setup'}" on ${state.skills[skillId]?.name ?? skillId}. What is the first check before computing?`,
      skillIds: [skillId],
      difficulty: 0.4,
      mode: 'mixed_review',
      answerType: 'text',
      expectedAnswer: tag?.tag ?? 'setup',
      hintSequence: ['Name the step where your last errors started.'],
      source: 'review_mistake',
      verificationStatus: 'verified',
    }
    return { state: { ...state, problems: { ...state.problems, [id]: problem } }, problem }
  }

  if (reviewType === 'concept' && CONCEPT_MC[skillId]) {
    const spec = CONCEPT_MC[skillId]
    const id = `review-concept-${skillId}-${seed}`
    const problem: Problem = {
      id,
      title: 'Concept check',
      prompt: spec.prompt,
      skillIds: [skillId],
      difficulty: 0.38,
      mode: 'mixed_review',
      answerType: 'choice',
      expectedAnswer: spec.expected,
      choices: spec.choices,
      hintSequence: ['Eliminate choices that confuse limits, averages, and rates.'],
      source: 'review_concept',
      verificationStatus: 'verified',
    }
    return { state: { ...state, problems: { ...state.problems, [id]: problem } }, problem }
  }

  if (reviewType === 'transfer') {
    const transferSkillId = transferSkillInSameArea(state, skillId)
    const generated = generateProblemForSkill(state, transferSkillId, seed)
    if (!generated) return { state }
    const id = `review-transfer-${skillId}-${seed}`
    const problem: Problem = {
      ...generated.record.problem,
      id,
      title: `Transfer: ${state.skills[transferSkillId]?.name ?? transferSkillId}`,
      skillIds: [skillId, transferSkillId],
      mode: 'mixed_review',
      source: 'review_transfer',
    }
    return {
      state: { ...generated.state, problems: { ...generated.state.problems, [id]: problem } },
      problem,
    }
  }

  const generated = generateProblemForSkill(state, skillId, seed)
  if (!generated) return { state }
  const problem: Problem = {
    ...generated.record.problem,
    mode: 'mixed_review' as ActivityKind,
    source: `review_${reviewType}`,
  }
  return {
    state: { ...generated.state, problems: { ...generated.state.problems, [problem.id]: problem } },
    problem,
  }
}

export function enrichReviewQueue(state: MathPilotState): MathPilotState {
  const queue = state.reviewQueue.map((item) => {
    const reviewType = inferReviewType(state, item.skillId)
    return { ...item, reviewType } as TypedReviewItem
  })
  return { ...state, reviewQueue: queue }
}
