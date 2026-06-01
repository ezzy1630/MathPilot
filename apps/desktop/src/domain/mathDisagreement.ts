import type { CheckAnswerResult } from './mathEngine'

export interface DisagreementResolution {
  correct: boolean
  feedback: string
  method: CheckAnswerResult['method']
  usedAiOverride: boolean
}

/** When SymPy/checker and Codex disagree, prefer symbolic unless Codex gives high-confidence correct. */
export function resolveAnswerDisagreement(
  symbolic: CheckAnswerResult,
  codexSaysCorrect: boolean | undefined,
  codexFeedback?: string,
): DisagreementResolution {
  if (codexSaysCorrect === undefined || symbolic.correct === codexSaysCorrect) {
    return {
      correct: symbolic.correct,
      feedback: symbolic.feedback,
      method: symbolic.method,
      usedAiOverride: false,
    }
  }

  if (symbolic.method === 'symbolic' && symbolic.correct) {
    return {
      correct: true,
      feedback: `${symbolic.feedback} (Symbolic check confirmed; AI disagreement ignored.)`,
      method: 'symbolic',
      usedAiOverride: false,
    }
  }

  if (codexSaysCorrect && symbolic.method !== 'symbolic') {
    return {
      correct: true,
      feedback: codexFeedback ?? 'Accepted via AI review — verify with your instructor if unsure.',
      method: 'ai_required',
      usedAiOverride: true,
    }
  }

  return {
    correct: symbolic.correct,
    feedback: symbolic.feedback,
    method: symbolic.method,
    usedAiOverride: false,
  }
}
