import { buildLearnerSnapshot } from './curatorContext'
import { invokeCodexForTask } from './aiAdapter'
import {
  batchSizeForSession,
  computeDeterministicBatchPlan,
  mergeBatchPlans,
  parseCodexBatchPlanResponse,
  recordShownProbe,
  type DiagnosticBatchPlan,
  type DiagnosticPlanHistoryEntry,
  type DiagnosticSessionProbeContext,
} from './diagnosticBatchPlan'
import { resolveDiagnosticProbeAsync } from './diagnosticProbeResolver'
import { sortSkillsByDiagnosticWeight } from './diagnosticEngine'
import { problemBankForDiagnostic } from './problemBank'
import { loadSkillsForPrompt } from './skillLoader'
import type { DiagnosticSessionState, MathPilotState } from './types'

export const DIAGNOSTIC_PLANNER_INTERVAL = 3

export interface DiagnosticPlannerPayload {
  priority_skill_ids: string[]
  rationale?: string
}

export type DiagnosticPlanStatus = 'idle' | 'planning' | 'codex' | 'offline'

export function shouldRunDiagnosticPlanner(session: DiagnosticSessionState): boolean {
  if (session.completed) return false
  return session.answeredCount > 0 && session.answeredCount % DIAGNOSTIC_PLANNER_INTERVAL === 0
}

export function parseDiagnosticPlannerResponse(stdout: string): DiagnosticPlannerPayload | null {
  const match = stdout.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const raw = JSON.parse(match[0]) as Record<string, unknown>
    const ids = Array.isArray(raw.priority_skill_ids)
      ? raw.priority_skill_ids.map(String).filter((id) => id.length > 0)
      : Array.isArray(raw.prioritySkillIds)
        ? raw.prioritySkillIds.map(String).filter((id) => id.length > 0)
        : []
    if (!ids.length) return null
    return {
      priority_skill_ids: ids,
      rationale: typeof raw.rationale === 'string' ? raw.rationale : undefined,
    }
  } catch {
    return null
  }
}

function sessionProbeContext(session: DiagnosticSessionState): DiagnosticSessionProbeContext {
  return {
    weakSkills: session.weakSkills,
    strongSkills: session.strongSkills,
    suspectedWeakSkills: session.suspectedWeakSkills,
    skillProbes: session.skillProbes,
    shownProblemIds: session.shownProblemIds,
    shownPromptHashes: session.shownPromptHashes,
    kindsBySkill: session.kindsBySkill,
    continuing: session.continuing,
  }
}

async function fetchCodexBatchPlan(
  state: MathPilotState,
  batchIndex: number,
): Promise<{ plan: DiagnosticBatchPlan | null; timedOut: boolean; state: MathPilotState }> {
  const session = state.diagnostic
  if (!session) return { plan: null, timedOut: false, state }

  const recent = state.attempts.slice(0, 8).map((a) => ({
    correct: a.correct,
    skills: a.skillIds.join(','),
    problem: state.problems[a.problemId]?.title ?? a.problemId,
  }))

  const probes = Object.entries(session.skillProbes ?? {})
    .map(([id, counts]) => `${id}:${counts.correct}/${counts.attempts}`)
    .join(', ')

  const avoidPrompts = (session.shownPromptHashes ?? []).slice(-6).join(', ') || 'none'

  const skillBodies = await loadSkillsForPrompt(
    'diagnostic_batch_planner',
    [...session.weakSkills, ...(session.suspectedWeakSkills ?? []), ...session.strongSkills].slice(0, 12),
  )

  const batchSize = batchSizeForSession(sessionProbeContext(session))

  const task = [
    'diagnostic_batch_planner',
    'Author the next adaptive diagnostic batch with live questions.',
    `Answered ${session.answeredCount}/${session.targetCount}. Weak: ${session.weakSkills.join(', ') || 'none'}.`,
    `Suspected: ${(session.suspectedWeakSkills ?? []).join(', ') || 'none'}.`,
    `Strong: ${session.strongSkills.join(', ') || 'none'}. Probes: ${probes || 'none'}.`,
    `Recent attempts: ${JSON.stringify(recent)}`,
    `Avoid repeating prompt hashes: ${avoidPrompts}.`,
    `Learner snapshot:\n${buildLearnerSnapshot(state)}`,
    `Return JSON only: { "batch_rationale": string, "probes": [{ "skill_id": string, "question_kind": "procedural"|"choice"|"graph"|"error_identification", "intent": string, "rationale": string, "difficulty_target": number, "problem": { "title": string, "prompt": string, "expected_answer": string, "answer_type": "expression"|"text"|"choice", "choices": string[] } }] }.`,
    `Provide ${batchSize} probes with full problem objects. Use only valid course skill ids.`,
  ].join(' ')

  const { state: withCall, result } = await invokeCodexForTask(state, task, {
    skillBodies,
    forceNewSession: true,
  })

  if (result.timedOut) return { plan: null, timedOut: true, state: withCall }
  if (!result.ok || result.mode !== 'codex_cli') return { plan: null, timedOut: false, state: withCall }

  const plan = parseCodexBatchPlanResponse(result.stdout, withCall, batchIndex)
  return { plan, timedOut: false, state: withCall }
}

async function applyBatchPlan(
  state: MathPilotState,
  plan: DiagnosticBatchPlan,
): Promise<{ state: MathPilotState; resolvedCount: number }> {
  const session = state.diagnostic!
  const prefix = session.queue.slice(0, session.currentIndex)
  const used = new Set(prefix)
  let working = state
  let sessionCtx = sessionProbeContext(session)
  const resolvedIds: string[] = []

  for (let i = 0; i < plan.probes.length; i += 1) {
    if (prefix.length + resolvedIds.length >= session.targetCount) break
    const probe = plan.probes[i]
    const resolved = await resolveDiagnosticProbeAsync(working, probe, sessionCtx, Date.now() + i * 137, used)
    working = resolved.state
    if (!resolved.result) continue

    const problem = working.problems[resolved.result.problemId]
    if (!problem || used.has(resolved.result.problemId)) continue

    used.add(resolved.result.problemId)
    resolvedIds.push(resolved.result.problemId)
    sessionCtx = recordShownProbe(sessionCtx, problem.id, problem.prompt, probe.skillId, probe.questionKind)
  }

  const queue = [...prefix, ...resolvedIds]

  if (queue.length < session.targetCount) {
    const ordered = sortSkillsByDiagnosticWeight(state, Object.keys(state.skills), {
      ...sessionCtx,
      suspectedWeakSkills: sessionCtx.suspectedWeakSkills ?? [],
    })
    const pool = problemBankForDiagnostic(working)
    for (const skillId of ordered) {
      for (const problem of pool) {
        if (queue.length >= session.targetCount) break
        if (!problem.skillIds.includes(skillId)) continue
        if (used.has(problem.id) || problem.deprecated) continue
        used.add(problem.id)
        queue.push(problem.id)
      }
    }
  }

  const finalQueue = queue.slice(0, session.targetCount)

  const historyEntry: DiagnosticPlanHistoryEntry = {
    batchIndex: plan.batchIndex,
    source: plan.source,
    batchRationale: plan.batchRationale,
    probeCount: resolvedIds.length,
    generatedAt: plan.generatedAt,
  }

  return {
    state: {
      ...working,
      diagnostic: {
        ...session,
        queue: finalQueue,
        skillProbes: session.skillProbes,
        shownProblemIds: sessionCtx.shownProblemIds,
        shownPromptHashes: sessionCtx.shownPromptHashes,
        kindsBySkill: sessionCtx.kindsBySkill,
        planHistory: [...(session.planHistory ?? []), historyEntry],
        lastPlanSource: plan.source,
      },
    },
    resolvedCount: resolvedIds.length,
  }
}

/** Refresh the diagnostic queue tail using batch planning (Codex + deterministic fallback). */
export async function refreshDiagnosticPlanAsync(state: MathPilotState): Promise<MathPilotState> {
  const session = state.diagnostic
  if (!session || session.completed) return state
  if (!shouldRunDiagnosticPlanner(session)) return state

  const batchIndex = (session.planHistory?.length ?? 0) + 1
  const deterministic = computeDeterministicBatchPlan(state, sessionProbeContext(session), batchIndex)

  const useCodex = state.preferences?.enableAdaptiveDiagnosticCodex !== false
  let plan = deterministic
  let codexState = state
  let usedCodex = false
  let offlineReason: string | undefined

  if (useCodex) {
    const codex = await fetchCodexBatchPlan(state, batchIndex)
    codexState = codex.state
    if (codex.timedOut) offlineReason = 'Codex timed out'
    else if (!codex.plan) offlineReason = 'Codex unavailable or malformed batch'
    else {
      plan = mergeBatchPlans(codex.plan, deterministic)
      usedCodex = plan.source === 'codex'
    }
  } else {
    offlineReason = 'Adaptive Codex disabled'
  }

  const { state: withQueue, resolvedCount } = await applyBatchPlan(codexState, plan)

  const logLine = usedCodex
    ? `Diagnostic batch ${batchIndex} (Codex): ${plan.batchRationale.slice(0, 120)} — ${resolvedCount} probes`
    : offlineReason
      ? `Diagnostic batch ${batchIndex} (offline): ${offlineReason} — ${resolvedCount} probes`
      : `Diagnostic batch ${batchIndex} (deterministic): ${plan.batchRationale.slice(0, 120)} — ${resolvedCount} probes`

  return {
    ...withQueue,
    diagnostic: {
      ...withQueue.diagnostic!,
      lastPlanSource: usedCodex ? 'codex' : 'deterministic',
    },
    changelog: [`${new Date().toISOString()}: ${logLine}`, ...withQueue.changelog],
  }
}

export { computeDeterministicBatchPlan, parseCodexBatchPlanResponse }
