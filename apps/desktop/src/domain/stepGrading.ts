import { checkAnswer, checkAnswerAsync } from './mathEngine'

const INTERMEDIATE_HINTS: Record<string, string[]> = {
  chain_rule: ['outer', 'inner', '2*x*cos(x^2)'],
  u_substitution: ['u', 'du', 'integrate'],
  integration_by_parts: ['u', 'dv', 'uv'],
  related_rates: ['differentiate', 'dr/dt', 'equation'],
  product_rule: ['u', 'v', 'u\'v+uv\''],
  quotient_rule: ['u', 'v', '(u\'v-uv\')/v^2'],
  implicit_differentiation: ['differentiate both sides', 'dy/dx', 'solve'],
  optimization: ['constraint', 'f\'(x)=0', 'endpoints'],
  partial_fractions: ['factor denominator', 'A/(x-a)', 'cover'],
  series_test_selection: ['term form', 'test name', 'conclusion'],
  limits_intro: ['substitute', 'factor', 'limit value'],
  definite_integrals: ['antiderivative', 'F(b)-F(a)', 'evaluate'],
}

function expectedForStep(skillId: string | undefined, stepIndex: number, finalExpected: string): string {
  const hints = skillId ? INTERMEDIATE_HINTS[skillId] : undefined
  if (hints && hints[stepIndex]) return hints[stepIndex]
  if (stepIndex === 0) return finalExpected.split(/[=→]/)[0]?.trim() || finalExpected
  return finalExpected
}

export function gradeSteps(
  steps: string[],
  expectedFinal: string,
  skillIds?: string[],
): { stepFeedback: string[]; allCorrect: boolean } {
  const feedback: string[] = []
  let allCorrect = true
  const skillId = skillIds?.[0]
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i]?.trim()
    if (!step) {
      feedback.push(`Step ${i + 1}: empty — write the first line of your setup.`)
      allCorrect = false
      continue
    }
    const expected =
      i === steps.length - 1 ? expectedFinal : expectedForStep(skillId, i, expectedFinal)
    const result = checkAnswer({
      expected,
      actual: step,
      skillIds,
      variables: ['x', 'n', 'u'],
    })
    if (i === steps.length - 1) {
      feedback.push(result.correct ? `Step ${i + 1}: matches target` : `Step ${i + 1}: check algebra on final line`)
      if (!result.correct) allCorrect = false
    } else if (result.correct) {
      feedback.push(`Step ${i + 1}: setup looks reasonable`)
    } else {
      feedback.push(`Step ${i + 1}: verify notation — expected something like "${expected}"`)
      allCorrect = false
    }
  }
  return { stepFeedback: feedback, allCorrect }
}

export async function gradeStepsAsync(
  steps: string[],
  expectedFinal: string,
  skillIds?: string[],
): Promise<{ stepFeedback: string[]; allCorrect: boolean }> {
  const feedback: string[] = []
  let allCorrect = true
  const skillId = skillIds?.[0]
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i]?.trim()
    if (!step) {
      feedback.push(`Step ${i + 1}: empty`)
      allCorrect = false
      continue
    }
    const expected =
      i === steps.length - 1 ? expectedFinal : expectedForStep(skillId, i, expectedFinal)
    const result = await checkAnswerAsync({
      expected,
      actual: step,
      skillIds,
      variables: ['x', 'n', 'u'],
    })
    const line =
      i === steps.length - 1
        ? result.correct
          ? `Step ${i + 1}: matches target (${result.method})`
          : `Step ${i + 1}: check algebra (${result.method})`
        : result.correct
          ? `Step ${i + 1}: valid intermediate step`
          : `Step ${i + 1}: revisit setup before simplifying`
    feedback.push(line)
    if (!result.correct) allCorrect = false
  }
  return { stepFeedback: feedback, allCorrect }
}
