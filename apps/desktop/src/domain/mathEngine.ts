export type { CheckAnswerInput, CheckAnswerResult } from '@mathpilot/math-engine'
export { checkAnswer, checkAnswerAsync } from '@mathpilot/math-engine'

/** Grade an answer; when symbolic and Codex disagree, invoke Codex inspect (§9.3). */
export async function gradeAnswerWithDisagreement(
  state: import('./types').MathPilotState,
  input: import('@mathpilot/math-engine').CheckAnswerInput,
  codexSaysCorrect?: boolean,
  codexFeedback?: string,
  context: { problemSummary?: string; userAttempt?: string } = {},
): Promise<GradeWithDisagreementResult> {
  const { checkAnswerAsync } = await import('@mathpilot/math-engine')
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

export interface GradeWithDisagreementResult {
  result: import('@mathpilot/math-engine').CheckAnswerResult
  state?: import('./types').MathPilotState
  inspectedByCodex?: boolean
  usedAiOverride?: boolean
}
