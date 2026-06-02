import type { CodexInvokeResult } from './aiAdapter'
import type { MathPilotState } from './types'

export type CodexTimeoutTier = 'hint' | 'homework' | 'curator' | 'generation' | 'code' | 'default'

const DEFAULTS: Record<CodexTimeoutTier, number> = {
  hint: 45,
  homework: 180,
  curator: 120,
  generation: 120,
  code: 300,
  default: 90,
}

function taskTier(task: string): CodexTimeoutTier {
  const lower = task.toLowerCase()
  if (lower.includes('ping')) return 'hint'
  if (lower.includes('homework') || lower.includes('photo')) return 'homework'
  if (
    lower.includes('curator') ||
    lower.includes('maintenance') ||
    lower.includes('cluster') ||
    lower.includes('diagnostic_curator')
  ) {
    return 'curator'
  }
  if (lower.includes('code') || lower.includes('self_improve')) return 'code'
  if (
    lower.includes('generate') ||
    lower.includes('diagnostic_batch') ||
    lower.includes('diagnostic_planner')
  ) {
    return 'generation'
  }
  if (
    lower.includes('hint') ||
    lower.includes('explain') ||
    lower.includes('teach') ||
    lower.includes('tutor') ||
    lower.includes('disagreement') ||
    lower.includes('grade')
  ) {
    return 'hint'
  }
  if (lower.includes('resource') || lower.includes('video')) return 'curator'
  return 'default'
}

export type CodexTimeoutPrefs = {
  codexTimeoutHintSecs?: number
  codexTimeoutHomeworkSecs?: number
  codexTimeoutCuratorSecs?: number
  codexTimeoutGenerationSecs?: number
  codexTimeoutCodeSecs?: number
  codexTimeoutDefaultSecs?: number
}

export function codexTimeoutSecsForTask(
  task: string,
  preferences?: MathPilotState['preferences'] | CodexTimeoutPrefs,
): number {
  const tier = taskTier(task)
  const prefOverride =
    tier === 'hint'
      ? preferences?.codexTimeoutHintSecs
      : tier === 'homework'
        ? preferences?.codexTimeoutHomeworkSecs
        : tier === 'curator'
          ? preferences?.codexTimeoutCuratorSecs
          : tier === 'generation'
            ? preferences?.codexTimeoutGenerationSecs
            : tier === 'code'
              ? preferences?.codexTimeoutCodeSecs
              : preferences?.codexTimeoutDefaultSecs
  if (typeof prefOverride === 'number' && prefOverride >= 15 && prefOverride <= 600) {
    return prefOverride
  }
  return DEFAULTS[tier]
}

export type CodexFailureKind = 'cancelled' | 'timed_out' | 'unavailable' | 'malformed' | null

export function codexFailureKind(
  result: CodexInvokeResult,
  parsedOk = true,
): CodexFailureKind {
  if (result.cancelled) return 'cancelled'
  if (result.timedOut) return 'timed_out'
  if (!result.ok || result.mode !== 'codex_cli') return 'unavailable'
  if (!parsedOk) return 'malformed'
  return null
}

export function codexFailureUserMessage(kind: CodexFailureKind, context: string): string | null {
  if (!kind) return null
  switch (kind) {
    case 'cancelled':
      return `${context} cancelled.`
    case 'timed_out':
      return `${context} timed out — using local fallback.`
    case 'unavailable':
      return `${context}: Codex unavailable — using local fallback.`
    case 'malformed':
      return `${context}: could not parse Codex JSON — using local fallback.`
    default:
      return null
  }
}

function appendToast(
  state: MathPilotState,
  message: string,
  tone: 'success' | 'info' | 'warning' = 'info',
): MathPilotState {
  const id = `toast-${Date.now()}`
  return {
    ...state,
    toastQueue: [...(state.toastQueue ?? []), { id, message, tone }].slice(-4),
  }
}

/** Changelog + optional toast when a background curator Codex call fails. */
export function withCuratorCodexNotice(
  state: MathPilotState,
  contextLabel: string,
  result: CodexInvokeResult,
  parsedOk = true,
): MathPilotState {
  const kind = codexFailureKind(result, parsedOk)
  const message = codexFailureUserMessage(kind, contextLabel)
  if (!message) return state
  const line = `${new Date().toISOString()}: ${message}`
  let next: MathPilotState = {
    ...state,
    changelog: [line, ...state.changelog],
  }
  if (kind === 'timed_out' || kind === 'cancelled') {
    next = appendToast(next, message, 'warning')
  } else if (kind === 'malformed' || kind === 'unavailable') {
    next = appendToast(next, message, 'info')
  }
  return next
}
