import { createPromptPacket, invokeCodexCli, logCodexCall, resolveCodexSession } from './aiAdapter'
import { codexTimeoutSecsForTask } from './codexConfig'
import { codexInspectConfidenceAllowsOverride } from './codexTrust'
import { parseCodexInspectResponse } from './codexParser'
import type { CheckAnswerResult } from './mathEngine'
import type { MathPilotState } from './types'

export interface DisagreementResolution {
  correct: boolean
  feedback: string
  method: CheckAnswerResult['method']
  usedAiOverride: boolean
  inspectedByCodex?: boolean
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

export type { CodexInspectPayload } from './codexParser'

/**
 * Ask Codex to inspect when symbolic and prior Codex judgment disagree.
 * Falls back to deterministic policy when CLI is unavailable.
 */
export async function inspectDisagreementWithCodex(
  state: MathPilotState,
  symbolic: CheckAnswerResult,
  codexSaysCorrect: boolean,
  codexFeedback: string | undefined,
  context: { problemSummary?: string; userAttempt?: string } = {},
): Promise<{ resolution: DisagreementResolution; state: MathPilotState }> {
  return resolveWithCodexInspect(state, symbolic, codexSaysCorrect, codexFeedback, context)
}

export async function resolveWithCodexInspect(
  state: MathPilotState,
  symbolic: CheckAnswerResult,
  codexSaysCorrect: boolean,
  codexFeedback: string | undefined,
  context: { problemSummary?: string; userAttempt?: string } = {},
): Promise<{ resolution: DisagreementResolution; state: MathPilotState }> {
  if (symbolic.correct === codexSaysCorrect) {
    return {
      resolution: resolveAnswerDisagreement(symbolic, codexSaysCorrect, codexFeedback),
      state,
    }
  }

  const { sessionId, resume, state: sessionState } = resolveCodexSession(state, 'disagreement_inspect')
  const inspectPacket = [
    createPromptPacket(sessionState, 'disagreement_inspect', undefined, context.userAttempt, undefined, undefined, {
      sessionId,
      resume,
    }),
    '',
    '## Disagreement inspect',
    JSON.stringify(
      {
        symbolic_result: {
          correct: symbolic.correct,
          method: symbolic.method,
          feedback: symbolic.feedback,
          normalized_expected: symbolic.normalizedExpected,
          normalized_actual: symbolic.normalizedActual,
        },
        codex_prior: { correct: codexSaysCorrect, feedback: codexFeedback },
        problem_summary: context.problemSummary ?? 'active problem',
      },
      null,
      2,
    ),
    '',
    'Return JSON only: { "resolution": "symbolic" | "codex", "correct": boolean, "feedback_to_user": string, "confidence": 0-1 }',
  ].join('\n')

  const result = await invokeCodexCli(inspectPacket, 'disagreement_inspect', sessionId, {
    timeoutSecs: codexTimeoutSecsForTask('disagreement_inspect', sessionState.preferences),
  })
  const logged = logCodexCall(sessionState, 'disagreement_inspect', inspectPacket, result)
  const parsed = parseCodexInspectResponse(result.stdout)

  if (!result.ok || result.cancelled || result.timedOut || !parsed?.resolution) {
    return {
      resolution: resolveAnswerDisagreement(symbolic, codexSaysCorrect, codexFeedback),
      state: logged,
    }
  }

  const preferSymbolic =
    parsed.resolution === 'symbolic' || parsed.resolution === 'symbolic_preferred'
  const codexOverride =
    parsed.resolution === 'codex' && codexInspectConfidenceAllowsOverride(parsed.confidence)
  const correct = preferSymbolic
    ? symbolic.correct
    : codexOverride
      ? (parsed.correct ?? codexSaysCorrect)
      : symbolic.correct
  const feedback =
    parsed.feedback_to_user ??
    (preferSymbolic || !codexOverride ? symbolic.feedback : codexFeedback ?? symbolic.feedback)

  return {
    resolution: {
      correct,
      feedback,
      method: preferSymbolic || !codexOverride ? symbolic.method : 'ai_required',
      usedAiOverride: codexOverride && correct !== symbolic.correct,
      inspectedByCodex: true,
    },
    state: logged,
  }
}
