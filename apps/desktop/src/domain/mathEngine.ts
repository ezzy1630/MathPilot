export interface CheckAnswerInput {
  expected: string
  actual: string
  variables?: string[]
  skillIds?: string[]
}

export interface CheckAnswerResult {
  correct: boolean
  method: 'symbolic' | 'numeric' | 'text' | 'ai_required'
  confidence: number
  normalizedExpected: string
  normalizedActual: string
  mistakeTags: string[]
  feedback: string
}

export async function checkAnswerAsync(input: CheckAnswerInput): Promise<CheckAnswerResult> {
  const { checkAnswerSymbolic } = await import('./symbolicCheck')
  const symbolic = await checkAnswerSymbolic(input.expected, input.actual, input.variables)
  if (symbolic) return symbolic
  return checkAnswer(input)
}

export interface GradeWithDisagreementResult {
  result: CheckAnswerResult
  state?: import('./types').MathPilotState
  inspectedByCodex?: boolean
  usedAiOverride?: boolean
}

/** Grade an answer; when symbolic and Codex disagree, invoke Codex inspect (§9.3). */
export async function gradeAnswerWithDisagreement(
  state: import('./types').MathPilotState,
  input: CheckAnswerInput,
  codexSaysCorrect?: boolean,
  codexFeedback?: string,
  context: { problemSummary?: string; userAttempt?: string } = {},
): Promise<GradeWithDisagreementResult> {
  const symbolic = await checkAnswerAsync(input)

  if (codexSaysCorrect === undefined || symbolic.correct === codexSaysCorrect) {
    return { result: symbolic }
  }

  if (symbolic.method === 'symbolic') {
    const { inspectDisagreementWithCodex } = await import('./mathDisagreement')
    const { resolution, state: nextState } = await inspectDisagreementWithCodex(
      state,
      symbolic,
      codexSaysCorrect,
      codexFeedback,
      { ...context, userAttempt: context.userAttempt ?? input.actual },
    )
    return {
      result: {
        correct: resolution.correct,
        method: resolution.method,
        confidence: resolution.correct ? 0.9 : 0.75,
        normalizedExpected: symbolic.normalizedExpected,
        normalizedActual: symbolic.normalizedActual,
        mistakeTags: symbolic.mistakeTags,
        feedback: resolution.feedback,
      },
      state: nextState,
      inspectedByCodex: resolution.inspectedByCodex,
      usedAiOverride: resolution.usedAiOverride,
    }
  }

  const { resolveAnswerDisagreement } = await import('./mathDisagreement')
  const resolution = resolveAnswerDisagreement(symbolic, codexSaysCorrect, codexFeedback)
  return {
    result: {
      correct: resolution.correct,
      method: resolution.method,
      confidence: symbolic.confidence,
      normalizedExpected: symbolic.normalizedExpected,
      normalizedActual: symbolic.normalizedActual,
      mistakeTags: symbolic.mistakeTags,
      feedback: resolution.feedback,
    },
    usedAiOverride: resolution.usedAiOverride,
  }
}

export function checkAnswer(input: CheckAnswerInput): CheckAnswerResult {
  const normalizedExpected = normalize(input.expected)
  const normalizedActual = normalize(input.actual)

  if (!normalizedActual) {
    return result(false, 'text', normalizedExpected, normalizedActual, ['answer_form:blank'], 'Enter an answer first.')
  }

  if (normalizedExpected === normalizedActual) {
    return result(true, 'symbolic', normalizedExpected, normalizedActual, [], 'Equivalent form accepted.')
  }

  if (normalizedExpected === 'concept' && normalizedActual.length >= 8) {
    return result(true, 'text', normalizedExpected, normalizedActual, [], 'Concept checkpoint recorded.')
  }

  if (numericEquivalent(normalizedExpected, normalizedActual, input.variables ?? ['x'])) {
    return result(true, 'symbolic', normalizedExpected, normalizedActual, [], 'Equivalent form accepted.')
  }

  const mistakeTags = inferMistakes(input, normalizedActual)
  return result(
    false,
    input.variables?.length ? 'numeric' : 'text',
    normalizedExpected,
    normalizedActual,
    mistakeTags,
    mistakeTags.includes('chain_rule:missing_inner_derivative')
      ? 'The outside derivative is present, but the inner derivative appears to be missing.'
      : 'This does not match the expected answer. Try checking the setup before simplifying.',
  )
}

function result(
  correct: boolean,
  method: CheckAnswerResult['method'],
  normalizedExpected: string,
  normalizedActual: string,
  mistakeTags: string[],
  feedback: string,
): CheckAnswerResult {
  return {
    correct,
    method,
    confidence: correct ? 0.94 : 0.72,
    normalizedExpected,
    normalizedActual,
    mistakeTags,
    feedback,
  }
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replaceAll('\\cdot', '*')
    .replaceAll(' ', '')
    .replaceAll('{', '(')
    .replaceAll('}', ')')
    .replace(/\bln\(/g, 'log(')
    .replace(/\^/g, '**')
    .replace(/([0-9)])([a-z(])/g, '$1*$2')
    .replace(/([a-z)])([0-9])/g, '$1*$2')
}

function numericEquivalent(expected: string, actual: string, variables: string[]) {
  try {
    const points = [-2.3, -0.7, 0.6, 1.8, 3.1]
    return points.every((point) => {
      const context = Object.fromEntries(variables.map((variable, index) => [variable, point + index * 0.37]))
      const left = evaluate(expected, context)
      const right = evaluate(actual, context)
      return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 1e-6
    })
  } catch {
    return false
  }
}

function evaluate(expression: string, context: Record<string, number>) {
  const names = Object.keys(context)
  const values = Object.values(context)
  const safe = expression
    .replace(/\bsin\(/g, 'Math.sin(')
    .replace(/\bcos\(/g, 'Math.cos(')
    .replace(/\btan\(/g, 'Math.tan(')
    .replace(/\blog\(/g, 'Math.log(')
    .replace(/\bsqrt\(/g, 'Math.sqrt(')
    .replace(/\bpi\b/g, 'Math.PI')
  const fn = new Function(...names, `"use strict"; return (${safe});`)
  return Number(fn(...values))
}

function inferMistakes(input: CheckAnswerInput, actual: string) {
  const tags: string[] = []
  if (input.skillIds?.includes('chain_rule')) {
    const missingInner = normalize(input.expected).includes('*2*x') || normalize(input.expected).includes('6*x')
    const hasOuter = actual.includes('(x**2+1)**2') || actual.includes('(x^2+1)^2')
    const lacksInner = !actual.includes('2*x') && !actual.includes('6*x')
    if (missingInner && hasOuter && lacksInner) tags.push('chain_rule:missing_inner_derivative')
  }
  if (!tags.length) tags.push('answer_form:non_equivalent')
  return tags
}
