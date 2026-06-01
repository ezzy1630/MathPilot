import { loadAllMemoryForPrompt, loadMemoryFromDisk } from './memoryLoader'
import { sha256HexSync } from './promptHash'
import type { AiCallLog, MathPilotState, Problem } from './types'

let cachedMemoryLines: string[] | null = null

export async function ensureMemoryLoaded(): Promise<string[]> {
  if (cachedMemoryLines) return cachedMemoryLines
  cachedMemoryLines = await loadMemoryFromDisk()
  return cachedMemoryLines
}

/** Task families that resume the last Codex session id for continuity. */
const CONTINUITY_TASK_PREFIXES = [
  'hint',
  'explain',
  'teach',
  'tutor',
  'homework',
  'grade',
  'check',
  'grading',
  'quick_repair',
  'disagreement',
]

export type CodexSessionKind =
  | 'tutor'
  | 'grading'
  | 'question_generation'
  | 'resource_search'
  | 'maintenance'
  | 'code_improvement'

export function codexSessionKindForTask(task: string): CodexSessionKind {
  const lower = task.toLowerCase()
  if (lower.includes('maintenance') || lower === 'ping' || lower.includes('curator')) return 'maintenance'
  if (lower.includes('resource') || lower.includes('video')) return 'resource_search'
  if (lower.includes('generate') && lower.includes('problem')) return 'question_generation'
  if (lower.includes('code') || lower.includes('self_improve')) return 'code_improvement'
  if (
    lower.includes('homework') ||
    lower.includes('grade') ||
    lower.includes('grading') ||
    lower.includes('mistake') ||
    lower.includes('diagnose')
  ) {
    return 'grading'
  }
  return 'tutor'
}

export function buildCodexSessionId(
  kind: CodexSessionKind,
  task: string,
  problem?: Problem,
  homeworkId?: string,
): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 48) || 'general'

  switch (kind) {
    case 'tutor': {
      const topic = problem?.skillIds?.[0] ?? slug(task)
      return `tutor_session_${topic}`
    }
    case 'grading':
      return homeworkId
        ? `grading_session_${slug(homeworkId)}`
        : `grading_session_${slug(problem?.id ?? task)}`
    case 'question_generation': {
      const skill = problem?.skillIds?.[0] ?? slug(task)
      return `question_generation_session_${skill}`
    }
    case 'resource_search':
      return `resource_search_session_${slug(problem?.skillIds?.[0] ?? task)}`
    case 'maintenance':
      return 'maintenance_session'
    case 'code_improvement':
      return 'code_improvement_session'
    default:
      return `tutor_session_${slug(task)}`
  }
}

export function taskUsesSessionContinuity(task: string): boolean {
  const lower = task.toLowerCase()
  return CONTINUITY_TASK_PREFIXES.some((p) => lower.includes(p))
}

export function resolveCodexSession(
  state: MathPilotState,
  task: string,
  problem?: Problem,
  homeworkId?: string,
  forceNew = false,
): { sessionId: string; resume: boolean; state: MathPilotState } {
  const kind = codexSessionKindForTask(task)
  const sessionKey = `${kind}:${task.split(/\s+/)[0]?.toLowerCase() ?? 'task'}`
  const canonicalKey =
    kind === 'grading'
      ? 'grading_session'
      : kind === 'question_generation'
        ? 'question_generation_session'
        : kind === 'tutor'
          ? 'tutor_session'
          : kind === 'resource_search'
            ? 'resource_search_session'
            : kind === 'maintenance'
              ? 'maintenance_session'
              : kind === 'code_improvement'
                ? 'code_improvement_session'
                : sessionKey
  const sessionId = buildCodexSessionId(kind, task, problem, homeworkId)
  const existing = state.codexSessions?.[canonicalKey] ?? state.codexSessions?.[sessionKey]
  const resume = !forceNew && taskUsesSessionContinuity(task) && Boolean(existing?.sessionId)
  const effectiveId = resume && existing ? existing.sessionId : sessionId
  const next: MathPilotState = {
    ...state,
    codexSessions: {
      ...state.codexSessions,
      [sessionKey]: { sessionId: effectiveId, updatedAt: new Date().toISOString() },
      [canonicalKey]: { sessionId: effectiveId, updatedAt: new Date().toISOString() },
    },
  }
  return { sessionId: effectiveId, resume, state: next }
}

export function createPromptPacket(
  state: MathPilotState,
  task: string,
  problem?: Problem,
  userAttempt?: string,
  memoryLines?: string[],
  skillBodies?: string[],
  sessionMeta?: { sessionId: string; resume: boolean },
) {
  const skillIds = problem?.skillIds ?? []
  const mastery = skillIds.map((id) => state.mastery[id]).filter(Boolean)
  const mistakes = Object.values(state.mistakePatterns).slice(0, 5)
  const reviewDue = state.reviewQueue.filter((item) => item.due <= new Date().toISOString().slice(0, 10)).slice(0, 5)
  const sessionBlock = sessionMeta
    ? [
        '## Codex session',
        `Session-Id: ${sessionMeta.sessionId}`,
        `Resume: ${sessionMeta.resume ? 'true' : 'false'}`,
        '',
      ]
    : []

  return [
    '# MathPilot Codex Task',
    `Task: ${task}`,
    `Course focus: ${state.currentFocus}`,
    `Session pace: ${state.sessionPace ?? 'normal'}`,
    '',
    ...sessionBlock,
    '## Memory',
    ...(memoryLines ?? loadAllMemoryForPrompt()),
    '',
    '## Skill instructions (full bodies)',
    ...(skillBodies?.length ? skillBodies : ['(Skill files unavailable — use general calculus tutoring.)']),
    '',
    '## Mastery state',
    JSON.stringify(mastery, null, 2),
    '',
    '## Mistake patterns',
    JSON.stringify(mistakes, null, 2),
    '',
    '## Review due',
    JSON.stringify(reviewDue, null, 2),
    '',
    '## Active problem',
    problem ? JSON.stringify(problem, null, 2) : 'No active problem.',
    '',
    '## User attempt',
    userAttempt || 'No attempt provided.',
    '',
    'Return JSON: feedback_to_user, mistake_tags, state_updates, recommended_next_action.',
  ].join('\n')
}

export function wrapPacketForChatGPT(packet: string): string {
  return [
    'You are MathPilot’s calculus tutor assistant. Follow the task and return valid JSON only.',
    '',
    '--- MathPilot packet ---',
    packet,
    '--- End packet ---',
    '',
    'Respond with a single JSON object matching the schema requested in the packet.',
  ].join('\n')
}

export function wrapPacketForGemini(packet: string): string {
  return [
    'Role: MathPilot calculus coach. Output: one JSON object, no markdown fences.',
    '',
    'CONTEXT:',
    packet,
    '',
    'Required keys: feedback_to_user, mistake_tags, state_updates, recommended_next_action.',
  ].join('\n')
}

function previewAndHash(packet: string): { promptPreview: string; promptHash: string } {
  const sanitized = stripSecretsFromLog(packet)
  const promptPreview = sanitized.slice(0, 420)
  return { promptPreview, promptHash: sha256HexSync(promptPreview) }
}

/** Remove likely secrets before persisting ai_calls prompt previews. */
export function stripSecretsFromLog(text: string): string {
  return text
    .replace(/(?:api[_-]?key|token|secret|password|authorization)\s*[:=]\s*\S+/gi, '[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/sk-[A-Za-z0-9]{8,}/g, 'sk-[redacted]')
}

export function logManualPacket(state: MathPilotState, task: string, packet: string): MathPilotState {
  const { promptPreview, promptHash } = previewAndHash(packet)
  const call: AiCallLog = {
    id: `ai-${Date.now()}-${state.aiCalls.length + 1}`,
    createdAt: new Date().toISOString(),
    task,
    mode: 'manual_packet',
    promptPreview,
    promptHash,
    status: 'drafted',
  }
  return {
    ...state,
    aiCalls: [call, ...state.aiCalls],
    changelog: [`${new Date().toISOString()}: Manual AI packet drafted for ${task}.`, ...state.changelog],
  }
}

export interface CodexInvokeResult {
  ok: boolean
  stdout: string
  stderr: string
  mode: 'codex_cli' | 'unavailable'
  sessionId?: string
  timedOut?: boolean
  cancelled?: boolean
  callId?: string
}

const DEFAULT_CODEX_TIMEOUT_SECS = 120
let activeCodexCallId: string | null = null

export function currentCodexCallId(): string | null {
  return activeCodexCallId
}

export function createCodexCallId(): string {
  return `codex-${Date.now()}`
}

export async function cancelCodexCli(callId?: string): Promise<boolean> {
  if (typeof window === 'undefined' || !(window as Window & { __TAURI__?: unknown }).__TAURI__) {
    return false
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const cancelled = await invoke<boolean>('cancel_codex', { callId: callId ?? activeCodexCallId })
    if (cancelled) activeCodexCallId = null
    return cancelled
  } catch {
    return false
  }
}

export async function invokeCodexCli(
  packet: string,
  task: string,
  sessionId?: string,
  options: { timeoutSecs?: number; callId?: string } = {},
): Promise<CodexInvokeResult> {
  if (typeof window !== 'undefined' && !(window as Window & { __TAURI__?: unknown }).__TAURI__) {
    return {
      ok: false,
      stdout: '',
      stderr: 'Codex CLI requires the Tauri desktop shell.',
      mode: 'unavailable',
      sessionId,
    }
  }

  const callId = options.callId ?? createCodexCallId()
  activeCodexCallId = callId

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke<{
      stdout: string
      stderr: string
      ok: boolean
      timed_out: boolean
      cancelled: boolean
    }>('invoke_codex', {
      packet,
      task,
      sessionId: sessionId ?? null,
      timeoutSecs: options.timeoutSecs ?? DEFAULT_CODEX_TIMEOUT_SECS,
      callId,
    })
    activeCodexCallId = null
    return {
      ...result,
      timedOut: result.timed_out,
      cancelled: result.cancelled,
      mode: 'codex_cli',
      sessionId,
      callId,
    }
  } catch (error) {
    activeCodexCallId = null
    return {
      ok: false,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      mode: 'unavailable',
      sessionId,
      callId,
    }
  }
}

export function logCodexCall(
  state: MathPilotState,
  task: string,
  packet: string,
  result: CodexInvokeResult,
): MathPilotState {
  const { promptPreview, promptHash } = previewAndHash(packet)
  const responsePreview = stripSecretsFromLog(result.stdout).slice(0, 420)
  const stderrPreview = stripSecretsFromLog(result.stderr).slice(0, 420)
  const call = {
    id: `ai-${Date.now()}-${state.aiCalls.length + 1}`,
    createdAt: new Date().toISOString(),
    task,
    mode: result.mode === 'codex_cli' ? 'codex_cli' : 'manual_packet',
    promptPreview,
    promptHash,
    status: result.ok ? 'received' : 'failed',
    responsePreview,
    stderrPreview,
    sessionId: result.sessionId,
  } as MathPilotState['aiCalls'][number]
  return {
    ...state,
    aiCalls: [call, ...state.aiCalls],
    changelog: [
      `${new Date().toISOString()}: Codex call ${result.ok ? 'completed' : 'failed'} for ${task}${result.sessionId ? ` (${result.sessionId})` : ''}.`,
      ...state.changelog,
    ],
  }
}

/** Build packet with session continuity and invoke Codex CLI. */
export async function invokeCodexForTask(
  state: MathPilotState,
  task: string,
  options: {
    problem?: Problem
    userAttempt?: string
    memoryLines?: string[]
    skillBodies?: string[]
    homeworkId?: string
    forceNewSession?: boolean
    callId?: string
  } = {},
): Promise<{ state: MathPilotState; packet: string; result: CodexInvokeResult }> {
  const memory = options.memoryLines ?? (await ensureMemoryLoaded())
  const skills =
    options.skillBodies ??
    (await import('./skillLoader').then((m) => m.loadSkillsForPrompt(task, options.problem?.skillIds ?? [])))
  const { sessionId, resume, state: withSession } = resolveCodexSession(
    state,
    task,
    options.problem,
    options.homeworkId,
    options.forceNewSession,
  )
  const packet = createPromptPacket(withSession, task, options.problem, options.userAttempt, memory, skills, {
    sessionId,
    resume,
  })
  const callId = options.callId ?? createCodexCallId()
  const result = await invokeCodexCli(packet, task, sessionId, { callId })
  const logged = logCodexCall(withSession, task, packet, result)
  return { state: logged, packet, result }
}
