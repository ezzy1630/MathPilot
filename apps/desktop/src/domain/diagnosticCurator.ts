import { ensureMemoryLoaded, invokeCodexForTask } from './aiAdapter'
import { parseDiagnosticCuratorResponse, type DiagnosticCuratorPayload } from './codexParser'
import { buildDiagnosticSummary } from './diagnosticEngine'
import { loadSkillsForPrompt } from './skillLoader'
import type { CoachInsight, MathPilotState } from './types'

function diagnosticContext(state: MathPilotState): {
  weakIds: string[]
  strongIds: string[]
  summaryText: string
} {
  const diagnostic = state.diagnostic
  const weakIds = diagnostic?.weakSkills?.length
    ? diagnostic.weakSkills
    : Object.entries(state.mastery)
        .filter(([, m]) => m.masteryScore < 0.4)
        .sort((a, b) => a[1].masteryScore - b[1].masteryScore)
        .slice(0, 8)
        .map(([id]) => id)
  const strongIds = diagnostic?.strongSkills?.length
    ? diagnostic.strongSkills
    : Object.entries(state.mastery)
        .filter(([, m]) => m.masteryScore >= 0.55)
        .sort((a, b) => b[1].masteryScore - a[1].masteryScore)
        .slice(0, 8)
        .map(([id]) => id)

  const summary = buildDiagnosticSummary(state, weakIds, strongIds)
  const summaryText = [
    `Strong: ${summary.strong.join(', ') || '—'}`,
    `Weak: ${summary.weak.join(', ') || '—'}`,
    `Recommended: ${summary.recommendedNext}`,
  ].join(' · ')

  return { weakIds, strongIds, summaryText }
}

export function buildCoachInsightFallback(state: MathPilotState): CoachInsight {
  const { weakIds, strongIds } = diagnosticContext(state)
  const summary = buildDiagnosticSummary(state, weakIds, strongIds)
  const gapBullets = summary.weak.length
    ? summary.weak.map((name) => `Gap: ${name}`)
    : weakIds
        .map((id) => state.skills[id]?.name)
        .filter(Boolean)
        .slice(0, 5)
        .map((name) => `Gap: ${name}`)

  return {
    updatedAt: new Date().toISOString(),
    narrative: `${summary.recommendedNext}. Strong areas include ${summary.strong.slice(0, 3).join(', ') || 'foundational skills'}; prioritize ${summary.weak.slice(0, 3).join(', ') || 'calibration'}.`,
    gapBullets,
    mapHighlightSkillIds: summary.recommendedSkillIds.length
      ? summary.recommendedSkillIds
      : weakIds.slice(0, 5),
    source: 'deterministic',
  }
}

function coachInsightFromPayload(payload: DiagnosticCuratorPayload): CoachInsight | null {
  const narrative = payload.coach_narrative?.trim()
  if (!narrative) return null

  const gaps = payload.knowledge_gaps?.filter(Boolean) ?? []
  const gapBullets =
    gaps.length > 0
      ? gaps
      : (payload.learning_model_bullets?.filter(Boolean) ?? [])

  return {
    updatedAt: new Date().toISOString(),
    narrative,
    gapBullets,
    mapHighlightSkillIds: payload.map_highlight_skill_ids?.filter(Boolean) ?? [],
    source: 'codex',
  }
}

async function appendCuratorMemory(_state: MathPilotState, insight: CoachInsight, bullets: string[]): Promise<void> {
  if (typeof window === 'undefined' || !(window as Window & { __TAURI__?: unknown }).__TAURI__) return

  const lines = [
    `\n## Coach insight ${insight.updatedAt.slice(0, 10)} (${insight.source})`,
    insight.narrative,
    ...insight.gapBullets.map((b) => `- ${b}`),
    ...(bullets.length ? ['', 'Learning model:', ...bullets.map((b) => `- ${b}`)] : []),
  ].join('\n')

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('append_memory_file', { filename: 'learning_model.md', content: lines })
  } catch {
    // best-effort
  }
}

export function applyCoachInsight(state: MathPilotState, insight: CoachInsight): MathPilotState {
  const highlight =
    insight.mapHighlightSkillIds.length > 0 ? insight.mapHighlightSkillIds : state.mapHighlightSkillIds

  return {
    ...state,
    coachInsight: insight,
    mapHighlightSkillIds: highlight,
    changelog: [
      `${insight.updatedAt}: Coach insight updated (${insight.source}).`,
      ...state.changelog,
    ],
  }
}

async function invokeCuratorCodex(state: MathPilotState): Promise<{
  state: MathPilotState
  payload: DiagnosticCuratorPayload | null
}> {
  const { weakIds, strongIds, summaryText } = diagnosticContext(state)
  const memory = await ensureMemoryLoaded()
  const skills = await loadSkillsForPrompt('diagnostic_curator', [...weakIds, ...strongIds].slice(0, 12))
  const task = [
    'diagnostic_curator',
    'Summarize the learner profile after diagnostic completion.',
    summaryText,
    'Return JSON only with keys: knowledge_gaps (string[]), coach_narrative (string), learning_model_bullets (string[]), map_highlight_skill_ids (string[]).',
  ].join(' ')

  const { state: logged, result } = await invokeCodexForTask(state, task, {
    memoryLines: memory,
    skillBodies: skills,
    forceNewSession: true,
  })

  if (!result.ok || result.mode !== 'codex_cli') {
    return { state: logged, payload: null }
  }

  const payload = parseDiagnosticCuratorResponse(result.stdout)
  return { state: logged, payload }
}

export async function runDiagnosticCurator(state: MathPilotState): Promise<MathPilotState> {
  const { state: afterCall, payload } = await invokeCuratorCodex(state)
  const parsed = payload ? coachInsightFromPayload(payload) : null

  if (parsed) {
    await appendCuratorMemory(afterCall, parsed, payload?.learning_model_bullets ?? [])
    return applyCoachInsight(afterCall, parsed)
  }

  const fallback = buildCoachInsightFallback(afterCall)
  await appendCuratorMemory(afterCall, fallback, [])
  return applyCoachInsight(afterCall, fallback)
}

/** Re-run curator using latest diagnostic snapshot or current mastery profile. */
export async function refreshCoachInsight(state: MathPilotState): Promise<MathPilotState> {
  return runDiagnosticCurator(state)
}
