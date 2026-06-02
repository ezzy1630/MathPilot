import { ensureMemoryLoaded, invokeCodexForTask } from './aiAdapter'
import { withCuratorCodexNotice } from './codexConfig'
import { parseMaintenanceCuratorResponse } from './codexParser'
import { buildLearnerSnapshot, topMistakeSkillIds } from './curatorContext'
import { loadSkillsForPrompt } from './skillLoader'
import type { MaintenanceRun } from './maintenance'
import type { CoachInsight, MathPilotState } from './types'

export function shouldRunMaintenanceCurator(state: MathPilotState): boolean {
  if (state.developerModeEnabled) return true
  return state.preferences?.enableMaintenanceCurator !== false
}

export function maintenanceCuratorFallbackSummary(run: MaintenanceRun): string {
  return run.changesMade.join(' ')
}

export function buildDeterministicMaintenanceInsight(
  state: MathPilotState,
  run: MaintenanceRun,
): NonNullable<ReturnType<typeof parseMaintenanceCuratorResponse>> {
  const pressure = topMistakeSkillIds(state, 3)
    .map((id) => state.skills[id]?.name)
    .filter(Boolean)
  const learningBullets = pressure.length
    ? [`Post-maintenance pressure points: ${pressure.join(', ')}.`]
    : ['Maintenance completed; no recurring mistake pressure detected.']

  return {
    changelog_summary: maintenanceCuratorFallbackSummary(run),
    learning_model_bullets: learningBullets,
    durable_notes_bullets: run.warnings.length ? run.warnings.slice(0, 4) : undefined,
  }
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
  patch: { codexSummary: string; warnings?: string[]; coachInsight?: CoachInsight },
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
    coachInsight: patch.coachInsight ?? state.coachInsight,
    changelog: [
      `${new Date().toISOString()}: Maintenance curator summary stored.`,
      ...state.changelog,
    ],
  }
}

function mergeCoachInsight(state: MathPilotState, narrative?: string): CoachInsight | undefined {
  const text = narrative?.trim()
  if (!text) return undefined
  const base = state.coachInsight
  return {
    updatedAt: new Date().toISOString(),
    narrative: text,
    gapBullets: base?.gapBullets ?? [],
    mapHighlightSkillIds: base?.mapHighlightSkillIds ?? topMistakeSkillIds(state, 3),
    source: 'codex',
  }
}

export async function runMaintenanceCurator(state: MathPilotState): Promise<MathPilotState> {
  const run = state.maintenanceRuns?.[0]
  if (!run || !shouldRunMaintenanceCurator(state)) return state

  const deterministic = buildDeterministicMaintenanceInsight(state, run)
  const memory = await ensureMemoryLoaded()
  const skills = await loadSkillsForPrompt('maintenance_curator', run.skillsUpdated.slice(0, 12))
  const learnerSnapshot = buildLearnerSnapshot(state)
  const context = [
    `Trigger: ${run.trigger}`,
    `Jobs: ${run.jobsRun.join(', ')}`,
    `Changes: ${run.changesMade.slice(0, 12).join(' | ')}`,
    run.warnings.length ? `Warnings: ${run.warnings.join(' | ')}` : '',
    `Learner snapshot:\n${learnerSnapshot}`,
  ]
    .filter(Boolean)
    .join('\n')

  const task = [
    'maintenance_curator',
    'Summarize this maintenance run for long-term memory files and a brief coach note.',
    context,
    'Return JSON only with keys: changelog_summary (string), learning_model_bullets (string[]), durable_notes_bullets (string[]), warnings (string[]), coach_narrative (string, optional one-sentence learner-facing note).',
  ].join(' ')

  const { state: logged, result } = await invokeCodexForTask(state, task, {
    memoryLines: memory,
    skillBodies: skills,
    forceNewSession: true,
  })

  if (!result.ok || result.mode !== 'codex_cli') {
    await appendCuratorMemories(deterministic)
    const noticed = withCuratorCodexNotice(logged, 'Maintenance curator', result, true)
    return patchLatestMaintenanceRun(noticed, run.id, {
      codexSummary: deterministic.changelog_summary ?? maintenanceCuratorFallbackSummary(run),
    })
  }

  const parsed = parseMaintenanceCuratorResponse(result.stdout)
  const noticed = withCuratorCodexNotice(logged, 'Maintenance curator', result, Boolean(parsed))
  const payload = parsed ?? deterministic
  await appendCuratorMemories(payload)

  const summary =
    payload.changelog_summary?.trim() ||
    [
      ...(payload.learning_model_bullets ?? []).slice(0, 3),
      ...(payload.durable_notes_bullets ?? []).slice(0, 2),
    ].join(' ') ||
    maintenanceCuratorFallbackSummary(run)

  return patchLatestMaintenanceRun(noticed, run.id, {
    codexSummary: summary,
    warnings: payload.warnings,
    coachInsight: mergeCoachInsight(logged, payload.coach_narrative),
  })
}