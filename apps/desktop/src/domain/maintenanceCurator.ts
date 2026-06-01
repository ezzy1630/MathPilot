import { ensureMemoryLoaded, invokeCodexForTask } from './aiAdapter'
import { parseMaintenanceCuratorResponse } from './codexParser'
import { loadSkillsForPrompt } from './skillLoader'
import type { MaintenanceRun } from './maintenance'
import type { MathPilotState } from './types'

export function shouldRunMaintenanceCurator(state: MathPilotState): boolean {
  if (state.developerModeEnabled) return true
  return state.preferences?.enableMaintenanceCurator !== false
}

export function maintenanceCuratorFallbackSummary(run: MaintenanceRun): string {
  return run.changesMade.join(' ')
}

async function appendMemoryFile(filename: string, content: string): Promise<void> {
  if (typeof window === 'undefined' || !(window as Window & { __TAURI__?: unknown }).__TAURI__) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('append_memory_file', { filename, content })
  } catch {
    // best-effort
  }
}

async function appendCuratorMemories(payload: ReturnType<typeof parseMaintenanceCuratorResponse>): Promise<void> {
  if (!payload) return
  const stamp = new Date().toISOString().slice(0, 10)

  if (payload.changelog_summary?.trim()) {
    await appendMemoryFile(
      'changelog.md',
      `\n## Maintenance curator ${stamp}\n${payload.changelog_summary.trim()}\n`,
    )
  }

  const learningLines = payload.learning_model_bullets?.filter(Boolean) ?? []
  if (learningLines.length) {
    await appendMemoryFile(
      'learning_model.md',
      `\n## Maintenance curator ${stamp}\n${learningLines.map((b) => `- ${b}`).join('\n')}\n`,
    )
  }

  const durableLines = payload.durable_notes_bullets?.filter(Boolean) ?? []
  if (durableLines.length) {
    await appendMemoryFile(
      'durable_notes.md',
      `\n## Maintenance curator ${stamp}\n${durableLines.map((b) => `- ${b}`).join('\n')}\n`,
    )
  }
}

function patchLatestMaintenanceRun(
  state: MathPilotState,
  runId: string,
  patch: { codexSummary: string; warnings?: string[] },
): MathPilotState {
  const runs = state.maintenanceRuns ?? []
  if (!runs.length || runs[0].id !== runId) return state

  const updated = {
    ...runs[0],
    codexSummary: patch.codexSummary,
    warnings: patch.warnings?.length ? [...runs[0].warnings, ...patch.warnings] : runs[0].warnings,
  }

  return {
    ...state,
    maintenanceRuns: [updated, ...runs.slice(1)],
    changelog: [
      `${new Date().toISOString()}: Maintenance curator summary stored.`,
      ...state.changelog,
    ],
  }
}

export async function runMaintenanceCurator(state: MathPilotState): Promise<MathPilotState> {
  const run = state.maintenanceRuns?.[0]
  if (!run || !shouldRunMaintenanceCurator(state)) return state

  const fallback = maintenanceCuratorFallbackSummary(run)
  const memory = await ensureMemoryLoaded()
  const skills = await loadSkillsForPrompt('maintenance_curator', run.skillsUpdated.slice(0, 12))
  const context = [
    `Trigger: ${run.trigger}`,
    `Jobs: ${run.jobsRun.join(', ')}`,
    `Changes: ${run.changesMade.slice(0, 12).join(' | ')}`,
    run.warnings.length ? `Warnings: ${run.warnings.join(' | ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const task = [
    'maintenance_curator',
    'Summarize this maintenance run for long-term memory files.',
    context,
    'Return JSON only with keys: changelog_summary (string), learning_model_bullets (string[]), durable_notes_bullets (string[]), warnings (string[]).',
  ].join(' ')

  const { state: logged, result } = await invokeCodexForTask(state, task, {
    memoryLines: memory,
    skillBodies: skills,
    forceNewSession: true,
  })

  if (!result.ok || result.mode !== 'codex_cli') {
    return patchLatestMaintenanceRun(logged, run.id, { codexSummary: fallback })
  }

  const payload = parseMaintenanceCuratorResponse(result.stdout)
  if (!payload) {
    return patchLatestMaintenanceRun(logged, run.id, { codexSummary: fallback })
  }

  await appendCuratorMemories(payload)

  const summary =
    payload.changelog_summary?.trim() ||
    [
      ...(payload.learning_model_bullets ?? []).slice(0, 3),
      ...(payload.durable_notes_bullets ?? []).slice(0, 2),
    ].join(' ') ||
    fallback

  return patchLatestMaintenanceRun(logged, run.id, {
    codexSummary: summary,
    warnings: payload.warnings,
  })
}
