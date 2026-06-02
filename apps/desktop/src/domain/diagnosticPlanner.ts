import { buildLearnerSnapshot } from './curatorContext'
import { invokeCodexForTask } from './aiAdapter'
import { sortSkillsByDiagnosticWeight } from './diagnosticEngine'
import { problemBankForDiagnostic } from './problemBank'
import { generateProblemForSkill, generateProblemViaCodexAsync } from './problemGenerator'
import { loadSkillsForPrompt } from './skillLoader'
import type { DiagnosticSessionState, MathPilotState } from './types'

export const DIAGNOSTIC_PLANNER_INTERVAL = 3
const TAIL_BATCH_SIZE = 8

export interface DiagnosticPlannerPayload {
  priority_skill_ids: string[]
  rationale?: string
}

export function shouldRunDiagnosticPlanner(session: DiagnosticSessionState): boolean {
  if (session.continuing || session.completed) return false
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

function sessionForWeights(state: MathPilotState): {
  weakSkills: string[]
  strongSkills: string[]
  skillProbes: Record<string, { correct: number; attempts: number }>
} {
  const session = state.diagnostic!
  return {
    weakSkills: session.weakSkills,
    strongSkills: session.strongSkills,
    skillProbes: session.skillProbes ?? {},
  }
}

async function fetchCodexSkillOrder(
  state: MathPilotState,
): Promise<{ skillIds: string[]; rationale?: string } | null> {
  const session = state.diagnostic
  if (!session) return null

  const recent = state.attempts
    .slice(0, 8)
    .map((a) => ({
      correct: a.correct,
      skills: a.skillIds.join(','),
      problem: state.problems[a.problemId]?.title ?? a.problemId,
    }))

  const probes = Object.entries(session.skillProbes ?? {})
    .map(([id, counts]) => `${id}:${counts.correct}/${counts.attempts}`)
    .join(', ')

  const skillBodies = await loadSkillsForPrompt(
    'diagnostic_planner',
    [...session.weakSkills, ...session.strongSkills].slice(0, 10),
  )

  const task = [
    'diagnostic_planner',
    'Choose the next skills to probe in an adaptive calculus diagnostic.',
    `Answered ${session.answeredCount}/${session.targetCount}. Weak: ${session.weakSkills.join(', ') || 'none'}.`,
    `Strong: ${session.strongSkills.join(', ') || 'none'}. Probes: ${probes || 'none'}.`,
    `Recent attempts: ${JSON.stringify(recent)}`,
    `Learner snapshot:\n${buildLearnerSnapshot(state)}`,
    'Return JSON only: { "priority_skill_ids": string[], "rationale": string }.',
    'Pick 4-8 skill ids to probe next (weak gaps and confirming probes). Use only valid course skill ids from context.',
  ].join(' ')

  const { result } = await invokeCodexForTask(state, task, {
    skillBodies,
    forceNewSession: true,
  })

  if (!result.ok || result.mode !== 'codex_cli') return null
  const payload = parseDiagnosticPlannerResponse(result.stdout)
  if (!payload) return null

  const skillIds = payload.priority_skill_ids.filter((id) => state.skills[id])
  if (!skillIds.length) return null
  return { skillIds, rationale: payload.rationale }
}

function rebuildDiagnosticQueue(
  state: MathPilotState,
  skillOrder: string[],
): { state: MathPilotState; queue: string[] } {
  const session = state.diagnostic!
  const prefix = session.queue.slice(0, session.currentIndex)
  const used = new Set(prefix)
  const pool = problemBankForDiagnostic(state)
  const bySkill = new Map<string, string[]>()

  for (const problem of pool) {
    for (const skillId of problem.skillIds) {
      const list = bySkill.get(skillId) ?? []
      if (!list.includes(problem.id)) list.push(problem.id)
      bySkill.set(skillId, list)
    }
  }

  const orderedSkills = [
    ...skillOrder,
    ...sortSkillsByDiagnosticWeight(state, Object.keys(state.skills), sessionForWeights(state)).filter(
      (id) => !skillOrder.includes(id),
    ),
  ]

  let working = state
  const rebuilt = [...prefix]

  const pushProblem = (problemId: string) => {
    if (used.has(problemId)) return false
    used.add(problemId)
    rebuilt.push(problemId)
    return true
  }

  for (const skillId of orderedSkills) {
    const bankIds = bySkill.get(skillId) ?? []
    for (const problemId of bankIds) {
      if (pushProblem(problemId) && rebuilt.length >= session.targetCount) {
        return { state: working, queue: rebuilt }
      }
    }

    if (bankIds.some((id) => !used.has(id))) continue

    const generated = generateProblemForSkill(working, skillId, Date.now() + rebuilt.length * 17)
    if (generated) {
      working = generated.state
      const problem = generated.record.problem
      problem.mode = 'diagnostic'
      working = {
        ...working,
        problems: { ...working.problems, [problem.id]: { ...problem, mode: 'diagnostic' } },
      }
      if (pushProblem(problem.id) && rebuilt.length >= session.targetCount) {
        return { state: working, queue: rebuilt }
      }
    }
  }

  for (const problem of pool) {
    if (pushProblem(problem.id) && rebuilt.length >= session.targetCount) break
  }

  return { state: working, queue: rebuilt.slice(0, session.targetCount) }
}

async function maybeCodexGenerateForGaps(state: MathPilotState, skillOrder: string[]): Promise<MathPilotState> {
  const useCodex =
    state.preferences?.enableAdaptiveDiagnosticCodex !== false &&
    (state.preferences?.enableCodexProblemGen !== false || state.developerModeEnabled)
  if (!useCodex) return state

  const session = state.diagnostic!
  const used = new Set(session.queue)
  const pool = problemBankForDiagnostic(state)
  let working = state
  let generated = 0

  for (const skillId of skillOrder.slice(0, TAIL_BATCH_SIZE)) {
    if (generated >= 2) break
    const hasProblem = pool.some((p) => p.skillIds.includes(skillId) && !used.has(p.id))
    if (hasProblem) continue

    const codex = await generateProblemViaCodexAsync(working, skillId, Date.now() + generated * 991, true)
    if (!codex) continue
    const problem = { ...codex.record.problem, mode: 'diagnostic' as const }
    working = {
      ...codex.state,
      problems: { ...codex.state.problems, [problem.id]: problem },
    }
    generated += 1
  }

  return working
}

/** Refresh the diagnostic queue tail using Codex skill planning with deterministic fallback. */
export async function refreshDiagnosticPlanAsync(state: MathPilotState): Promise<MathPilotState> {
  const session = state.diagnostic
  if (!session || session.completed || session.continuing) return state
  if (!shouldRunDiagnosticPlanner(session)) return state

  const useCodex = state.preferences?.enableAdaptiveDiagnosticCodex !== false
  let skillOrder: string[] | null = null
  let rationale: string | undefined

  if (useCodex) {
    const codexPlan = await fetchCodexSkillOrder(state)
    if (codexPlan?.skillIds.length) {
      skillOrder = codexPlan.skillIds
      rationale = codexPlan.rationale
    }
  }

  if (!skillOrder?.length) {
    skillOrder = sortSkillsByDiagnosticWeight(state, Object.keys(state.skills), sessionForWeights(state))
  }

  let working = await maybeCodexGenerateForGaps(state, skillOrder)
  const { state: withProblems, queue } = rebuildDiagnosticQueue(working, skillOrder)

  const logLine = rationale
    ? `Diagnostic plan refreshed (Codex): ${rationale.slice(0, 120)}`
    : `Diagnostic plan refreshed — next focus: ${skillOrder.slice(0, 4).map((id) => state.skills[id]?.name ?? id).join(', ')}`

  return {
    ...withProblems,
    diagnostic: {
      ...session,
      queue,
      skillProbes: session.skillProbes,
    },
    changelog: [`${new Date().toISOString()}: ${logLine}`, ...withProblems.changelog],
  }
}
