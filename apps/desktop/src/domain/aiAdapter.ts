import { loadAllMemoryForPrompt, loadMemoryFromDisk } from './memoryLoader'

let cachedMemoryLines: string[] | null = null

export async function ensureMemoryLoaded(): Promise<string[]> {
  if (cachedMemoryLines) return cachedMemoryLines
  cachedMemoryLines = await loadMemoryFromDisk()
  return cachedMemoryLines
}
import type { AiCallLog, MathPilotState, Problem } from './types'

export function createPromptPacket(
  state: MathPilotState,
  task: string,
  problem?: Problem,
  userAttempt?: string,
  memoryLines?: string[],
  skillBodies?: string[],
) {
  const skillIds = problem?.skillIds ?? []
  const mastery = skillIds.map((id) => state.mastery[id]).filter(Boolean)
  const mistakes = Object.values(state.mistakePatterns).slice(0, 5)
  const reviewDue = state.reviewQueue.filter((item) => item.due <= new Date().toISOString().slice(0, 10)).slice(0, 5)

  return [
    '# MathPilot Codex Task',
    `Task: ${task}`,
    `Course focus: ${state.currentFocus}`,
    `Session pace: ${state.sessionPace ?? 'normal'}`,
    '',
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

export function logManualPacket(state: MathPilotState, task: string, packet: string): MathPilotState {
  const call: AiCallLog = {
    id: `ai-${Date.now()}-${state.aiCalls.length + 1}`,
    createdAt: new Date().toISOString(),
    task,
    mode: 'manual_packet',
    promptPreview: packet.slice(0, 420),
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
}

export async function invokeCodexCli(packet: string, task: string): Promise<CodexInvokeResult> {
  if (typeof window !== 'undefined' && !(window as Window & { __TAURI__?: unknown }).__TAURI__) {
    return {
      ok: false,
      stdout: '',
      stderr: 'Codex CLI requires the Tauri desktop shell.',
      mode: 'unavailable',
    }
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const result = await invoke<{ stdout: string; stderr: string; ok: boolean }>('invoke_codex', {
      packet,
      task,
    })
    return { ...result, mode: 'codex_cli' }
  } catch (error) {
    return {
      ok: false,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      mode: 'unavailable',
    }
  }
}

export function logCodexCall(state: MathPilotState, task: string, packet: string, result: CodexInvokeResult): MathPilotState {
  const call: AiCallLog = {
    id: `ai-${Date.now()}-${state.aiCalls.length + 1}`,
    createdAt: new Date().toISOString(),
    task,
    mode: result.mode === 'codex_cli' ? 'codex_cli' : 'manual_packet',
    promptPreview: packet.slice(0, 420),
    status: result.ok ? 'received' : 'failed',
  }
  return {
    ...state,
    aiCalls: [call, ...state.aiCalls],
    changelog: [
      `${new Date().toISOString()}: Codex call ${result.ok ? 'completed' : 'failed'} for ${task}.`,
      ...state.changelog,
    ],
  }
}
