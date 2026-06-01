import {
  currentSessionPhase,
  phaseContentMode,
  sessionDifficultyBias,
} from './dailySessionEngine'
import { buildFormulaRecallProblem } from './formulaRecall'
import { generateProblemForSkill, generateProblemViaCodexAsync } from './problemGenerator'
import { pickInterleavedProblem } from './interleavingEngine'
import { buildReviewProblem, inferReviewType } from './reviewItemEngine'
import { filterProblemsByCourseFocus } from './courseFocusFilter'
import { problemForSkill } from '../lib/mapHelpers'
import type { ActivityKind, MathPilotState, Problem, ResourceRecord } from './types'

const PHASE_TO_MODE: Partial<Record<ActivityKind, string>> = {
  retrieval_warmup: 'mixed_review',
  mixed_review: 'mixed_review',
  guided_practice: 'guided_practice',
  independent_practice: 'independent_practice',
  quick_repair: 'quick_repair',
  resource_watch: 'guided_practice',
  concept_input: 'guided_practice',
  worked_example: 'guided_practice',
  homework_review: 'quick_repair',
  formula_recall: 'formula_recall',
  syllabus_task: 'guided_practice',
}

type SessionPreferences = MathPilotState['preferences'] & { enableCodexProblemGen?: boolean }

function codexProblemGenEnabled(state: MathPilotState): boolean {
  return Boolean((state.preferences as SessionPreferences | undefined)?.enableCodexProblemGen)
}

function difficultyMatchesBias(problem: Problem, bias: number, masteryScore: number): boolean {
  const target = Math.min(0.95, Math.max(0.2, masteryScore + bias))
  return Math.abs(problem.difficulty - target) <= 0.22
}

function pickResourceForSkill(state: MathPilotState, skillId: string): ResourceRecord | undefined {
  const skill = state.skills[skillId]
  if (!skill) return undefined
  const candidates = skill.resources
    .map((id) => state.resources[id])
    .filter(Boolean) as ResourceRecord[]
  return candidates.sort((a, b) => b.effectivenessScore - a.effectivenessScore)[0]
}

function generateForSkill(
  state: MathPilotState,
  skillId: string,
): { state: MathPilotState; problemId?: string } {
  const generated = generateProblemForSkill(state, skillId)
  if (generated) {
    return { state: generated.state, problemId: generated.record.problem.id }
  }
  const existing = problemForSkill(state, skillId)
  return { state, problemId: existing }
}

async function generateForSkillAsync(
  state: MathPilotState,
  skillId: string,
): Promise<{ state: MathPilotState; problemId?: string }> {
  if (codexProblemGenEnabled(state)) {
    const codex = await generateProblemViaCodexAsync(state, skillId)
    if (codex) {
      return { state: codex.state, problemId: codex.record.problem.id }
    }
  }
  return generateForSkill(state, skillId)
}

export function resolveProblemForAction(
  state: MathPilotState,
  skillIds: string[],
  actionKind: ActivityKind,
  explicitProblemId?: string,
): { state: MathPilotState; problemId?: string; resourceId?: string } {
  return resolveProblemForActionCore(state, skillIds, actionKind, explicitProblemId)
}

function resolveProblemForActionCore(
  state: MathPilotState,
  skillIds: string[],
  actionKind: ActivityKind,
  explicitProblemId?: string,
  options?: { deferGeneration?: boolean },
): { state: MathPilotState; problemId?: string; resourceId?: string } {
  if (explicitProblemId && state.problems[explicitProblemId]) {
    return { state, problemId: explicitProblemId }
  }

  const skillId = skillIds[0]
  if (!skillId) return { state }

  const rawPhase = currentSessionPhase(state) ?? actionKind
  const phase = phaseContentMode(rawPhase)
  const preferredMode = PHASE_TO_MODE[rawPhase] ?? PHASE_TO_MODE[phase] ?? PHASE_TO_MODE[actionKind]
  const difficultyBias = sessionDifficultyBias(state)
  const masteryScore = state.mastery[skillId]?.masteryScore ?? 0.4

  if (rawPhase === 'formula_recall' || actionKind === 'formula_recall') {
    const built = buildFormulaRecallProblem(state, skillId, Date.now())
    return { state: built.state, problemId: built.problem.id }
  }

  if (rawPhase === 'worked_example' || actionKind === 'worked_example') {
    const example = resolveWorkedExampleProblem(state, skillId)
    if (example) return { state, problemId: example.id }
  }

  if (phase === 'resource_watch' || actionKind === 'resource_watch' || rawPhase === 'concept_input') {
    const resource = pickResourceForSkill(state, skillId)
    const problemId = problemForSkill(state, skillId, 'guided_practice')
    return { state, problemId, resourceId: resource?.id }
  }

  if (
    phase === 'mixed_review' ||
    actionKind === 'mixed_review' ||
    rawPhase === 'retrieval_warmup' ||
    actionKind === 'retrieval_warmup'
  ) {
    const reviewType = inferReviewType(state, skillId)
    const built = buildReviewProblem(state, skillId, reviewType, Date.now())
    if (built.problem) return { state: built.state, problemId: built.problem.id }
    const interleaved = pickInterleavedProblem(state, skillId)
    if (interleaved) return { state, problemId: interleaved.id }
  }

  if (phase === 'independent_practice' || actionKind === 'independent_practice') {
    const interleaved = pickInterleavedProblem(state, skillId)
    if (interleaved) return { state, problemId: interleaved.id }
  }

  if (phase === 'guided_practice' || actionKind === 'guided_practice' || rawPhase === 'syllabus_task') {
    const guided = Object.values(state.problems).find(
      (problem) =>
        problem.skillIds.includes(skillId) &&
        !problem.deprecated &&
        (problem.mode === 'guided_practice' || Boolean(problem.workedExample?.length)),
    )
    if (guided) return { state, problemId: guided.id }
  }

  if (phase === 'quick_repair' || actionKind === 'quick_repair' || actionKind === 'homework_review') {
    const repairPool = filterProblemsByCourseFocus(
      state,
      Object.values(state.problems).filter(
        (problem) =>
          problem.skillIds.includes(skillId) &&
          !problem.deprecated &&
          (problem.mode === 'quick_repair' || problem.mode === 'guided_practice'),
      ),
      { repairSkillId: skillId, prerequisiteRepair: true },
    )
    const matched = repairPool.find((problem) => difficultyMatchesBias(problem, difficultyBias, masteryScore))
    if (matched) return { state, problemId: matched.id }
  }

  const skillPool = filterProblemsByCourseFocus(
    state,
    Object.values(state.problems).filter(
      (problem) => problem.skillIds.includes(skillId) && !problem.deprecated,
    ),
    {
      repairSkillId: skillId,
      prerequisiteRepair: phase === 'quick_repair' || actionKind === 'quick_repair',
    },
  )
  const existing =
    skillPool.find((problem) => problem.mode === preferredMode)?.id ?? skillPool[0]?.id
  if (existing) return { state, problemId: existing }

  if (!options?.deferGeneration) {
    const fallback = problemForSkill(state, skillId, preferredMode, {
      prerequisiteRepair: phase === 'quick_repair' || actionKind === 'quick_repair',
    })
    if (fallback) return { state, problemId: fallback }
  }

  if (options?.deferGeneration) {
    return { state, problemId: undefined }
  }

  return generateForSkill(state, skillId)
}

/** Async resolver — tries Codex generation for new skills when preference enabled. */
export async function resolveProblemForActionAsync(
  state: MathPilotState,
  skillIds: string[],
  actionKind: ActivityKind,
  explicitProblemId?: string,
): Promise<{ state: MathPilotState; problemId?: string; resourceId?: string }> {
  const partial = resolveProblemForActionCore(state, skillIds, actionKind, explicitProblemId, {
    deferGeneration: true,
  })
  if (partial.problemId) return partial

  const skillId = skillIds[0]
  if (!skillId) return partial

  return generateForSkillAsync(partial.state, skillId)
}

export function resolveWorkedExampleProblem(state: MathPilotState, skillId: string): Problem | undefined {
  return Object.values(state.problems).find(
    (problem) =>
      problem.skillIds.includes(skillId) &&
      !problem.deprecated &&
      Boolean(problem.workedExample?.length),
  )
}
