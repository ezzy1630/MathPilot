import { recordAttempt } from './learningEngine'
import { shouldTriggerContinuingDiagnostic } from './continuingDiagnostics'
import { problemBankForDiagnostic } from './problemBank'
import { trackAnsweredProblem } from './diagnosticProbeResolver'
import type { AttemptInput, MathPilotState, Problem } from './types'
import type { DiagnosticPlanHistoryEntry } from './diagnosticBatchPlan'
import type { DiagnosticQuestionKind } from './diagnosticQuestionMix'

export { shouldTriggerContinuingDiagnostic, type ContinuingDiagnosticTrigger } from './continuingDiagnostics'

export const DIAGNOSTIC_TARGET_QUESTIONS = 25
export const MINI_DIAGNOSTIC_MIN = 8
export const MINI_DIAGNOSTIC_MAX = 12
export const DIAGNOSTIC_CONFIDENCE_MIN_SKILLS = 5
export const DIAGNOSTIC_CONFIDENCE_MIN_ATTEMPTS_PER_SKILL = 2

export interface SkillProbeCounts {
  correct: number
  attempts: number
}

export interface DiagnosticSession {
  id: string
  startedAt: string
  targetCount: number
  answeredCount: number
  currentIndex: number
  queue: string[]
  weakSkills: string[]
  strongSkills: string[]
  suspectedWeakSkills?: string[]
  skillProbes?: Record<string, SkillProbeCounts>
  planHistory?: DiagnosticPlanHistoryEntry[]
  shownProblemIds?: string[]
  shownPromptHashes?: string[]
  kindsBySkill?: Record<string, DiagnosticQuestionKind[]>
  completed: boolean
  summary?: DiagnosticSummary
  continuing?: boolean
  triggerReason?: string
  lastPlanSource?: 'codex' | 'deterministic'
}

export interface DiagnosticSummary {
  strong: string[]
  weak: string[]
  recommendedNext: string
  recommendedSkillIds: string[]
}

function emptyProbeTracking(): Pick<
  DiagnosticSession,
  'suspectedWeakSkills' | 'planHistory' | 'shownProblemIds' | 'shownPromptHashes' | 'kindsBySkill'
> {
  return {
    suspectedWeakSkills: [],
    planHistory: [],
    shownProblemIds: [],
    shownPromptHashes: [],
    kindsBySkill: {},
  }
}

export function startContinuingDiagnostic(
  state: MathPilotState,
  skillIds?: string[],
  questionCount = MINI_DIAGNOSTIC_MIN + 2,
): { state: MathPilotState; session: DiagnosticSession } {
  const trigger = shouldTriggerContinuingDiagnostic(state)
  const focusSkills = skillIds?.length ? skillIds : trigger?.skillIds
  const targetCount = Math.min(MINI_DIAGNOSTIC_MAX, Math.max(MINI_DIAGNOSTIC_MIN, questionCount))
  const pool = problemBankForDiagnostic(state)
  const queue = buildMiniDiagnosticQueue(state, pool, targetCount, focusSkills)
  const session: DiagnosticSession = {
    id: `mini-diag-${Date.now()}`,
    startedAt: new Date().toISOString(),
    targetCount,
    answeredCount: 0,
    currentIndex: 0,
    queue,
    weakSkills: focusSkills ?? [],
    strongSkills: [],
    skillProbes: {},
    completed: false,
    continuing: true,
    triggerReason: trigger?.reason,
    ...emptyProbeTracking(),
  }
  return {
    state: { ...state, diagnostic: session },
    session,
  }
}

function buildMiniDiagnosticQueue(
  state: MathPilotState,
  pool: Problem[],
  target: number,
  focusSkillIds?: string[],
): string[] {
  const focus = new Set(focusSkillIds ?? [])
  const prioritized = pool.filter((problem) => problem.skillIds.some((id) => focus.has(id)))
  const source = prioritized.length >= target ? prioritized : pool
  const orderedSkills = [...(focusSkillIds ?? Object.keys(state.skills))].sort(
    (a, b) => (state.mastery[a]?.masteryScore ?? 0.3) - (state.mastery[b]?.masteryScore ?? 0.3),
  )

  const queue: string[] = []
  const used = new Set<string>()
  for (const skillId of orderedSkills) {
    for (const problem of source) {
      if (!problem.skillIds.includes(skillId)) continue
      if (used.has(problem.id)) continue
      used.add(problem.id)
      queue.push(problem.id)
      if (queue.length >= target) return queue
    }
  }

  for (const problem of source) {
    if (used.has(problem.id)) continue
    used.add(problem.id)
    queue.push(problem.id)
    if (queue.length >= target) break
  }

  return queue.slice(0, target)
}

export function startDiagnostic(state: MathPilotState): { state: MathPilotState; session: DiagnosticSession } {
  const pool = problemBankForDiagnostic(state)
  const queue = buildAdaptiveQueue(state, pool, DIAGNOSTIC_TARGET_QUESTIONS)
  const session: DiagnosticSession = {
    id: `diag-${Date.now()}`,
    startedAt: new Date().toISOString(),
    targetCount: DIAGNOSTIC_TARGET_QUESTIONS,
    answeredCount: 0,
    currentIndex: 0,
    queue,
    weakSkills: [],
    strongSkills: [],
    skillProbes: {},
    completed: false,
    ...emptyProbeTracking(),
  }
  return {
    state: { ...state, diagnostic: session },
    session,
  }
}

export function diagnosticConfidenceMet(
  session: Pick<DiagnosticSession, 'skillProbes'>,
): boolean {
  const probed = Object.values(session.skillProbes ?? {}).filter(
    (counts) => counts.attempts >= DIAGNOSTIC_CONFIDENCE_MIN_ATTEMPTS_PER_SKILL,
  )
  return probed.length >= DIAGNOSTIC_CONFIDENCE_MIN_SKILLS
}

/** Higher weight → prefer sooner in adaptive queue. */
export function skillSelectionWeight(
  state: MathPilotState,
  skillId: string,
  session: Pick<DiagnosticSession, 'weakSkills' | 'strongSkills' | 'suspectedWeakSkills'> & {
    skillProbes?: Record<string, SkillProbeCounts>
  },
): number {
  const probes = session.skillProbes?.[skillId]
  let weight = 1

  if (probes && probes.correct >= 2) weight *= 0.35
  if (session.weakSkills.includes(skillId)) weight *= 1.5
  if (session.suspectedWeakSkills?.includes(skillId)) weight *= 1.35

  for (const weakId of session.weakSkills) {
    const weakSkill = state.skills[weakId]
    if (weakSkill?.prerequisites.includes(skillId)) weight *= 1.65
  }
  for (const weakId of session.suspectedWeakSkills ?? []) {
    const weakSkill = state.skills[weakId]
    if (weakSkill?.prerequisites.includes(skillId)) weight *= 1.45
  }

  if (session.strongSkills.includes(skillId) && !session.weakSkills.includes(skillId)) {
    weight *= 0.85
  }

  return weight
}

function recordSkillProbes(
  probes: Record<string, SkillProbeCounts>,
  skillIds: string[],
  correct: boolean,
): Record<string, SkillProbeCounts> {
  const next = { ...probes }
  for (const skillId of skillIds) {
    const current = next[skillId] ?? { correct: 0, attempts: 0 }
    next[skillId] = {
      attempts: current.attempts + 1,
      correct: current.correct + (correct ? 1 : 0),
    }
  }
  return next
}

function updateWeakStrongSets(
  session: DiagnosticSession,
  skillIds: string[],
  correct: boolean,
): Pick<DiagnosticSession, 'weakSkills' | 'strongSkills' | 'suspectedWeakSkills'> {
  const weak = new Set(session.weakSkills)
  const strong = new Set(session.strongSkills)
  const suspected = new Set(session.suspectedWeakSkills ?? [])

  for (const skillId of skillIds) {
    if (correct) {
      suspected.delete(skillId)
      if (!weak.has(skillId)) strong.add(skillId)
    } else {
      strong.delete(skillId)
      if (weak.has(skillId) || suspected.has(skillId)) {
        weak.add(skillId)
        suspected.delete(skillId)
      } else {
        suspected.add(skillId)
      }
    }
  }

  return {
    weakSkills: [...weak],
    strongSkills: [...strong],
    suspectedWeakSkills: [...suspected],
  }
}

export function sortSkillsByDiagnosticWeight(
  state: MathPilotState,
  skillIds: string[],
  session: Pick<DiagnosticSession, 'weakSkills' | 'strongSkills' | 'suspectedWeakSkills'> & {
    skillProbes?: Record<string, SkillProbeCounts>
  },
): string[] {
  return [...skillIds].sort((a, b) => {
    const weightDiff = skillSelectionWeight(state, b, session) - skillSelectionWeight(state, a, session)
    if (weightDiff !== 0) return weightDiff
    return (state.mastery[a]?.masteryScore ?? 0.3) - (state.mastery[b]?.masteryScore ?? 0.3)
  })
}

export function currentDiagnosticProblem(state: MathPilotState): Problem | undefined {
  const session = state.diagnostic
  if (!session || session.completed) return undefined
  const problemId = session.queue[session.currentIndex]
  return problemId ? state.problems[problemId] : undefined
}

export function submitDiagnosticAnswer(
  state: MathPilotState,
  problemId: string,
  answer: string,
  correct: boolean,
  elapsedSeconds = 90,
): MathPilotState {
  const session = state.diagnostic
  if (!session || session.completed) return state

  const problem = state.problems[problemId]
  if (!problem) return state

  const attemptInput: AttemptInput = {
    problemId,
    skillIds: problem.skillIds,
    answer,
    correct,
    mode: 'diagnostic',
    hintCount: 0,
    seconds: elapsedSeconds,
    mixed: true,
    delayed: false,
    mistakeTags: correct ? undefined : ['diagnostic:needs_confirmation'],
  }

  let next = recordAttempt(state, attemptInput)
  const weakStrong = updateWeakStrongSets(session, problem.skillIds, correct)
  const skillProbes = recordSkillProbes(session.skillProbes ?? {}, problem.skillIds, correct)

  const probeCtx = trackAnsweredProblem(
    {
      weakSkills: weakStrong.weakSkills,
      strongSkills: weakStrong.strongSkills,
      suspectedWeakSkills: weakStrong.suspectedWeakSkills,
      skillProbes,
      shownProblemIds: session.shownProblemIds,
      shownPromptHashes: session.shownPromptHashes,
      kindsBySkill: session.kindsBySkill,
      continuing: session.continuing,
    },
    problem,
  )

  const sessionSnapshot: DiagnosticSession = {
    ...session,
    ...weakStrong,
    skillProbes,
    shownProblemIds: probeCtx.shownProblemIds ?? [],
    shownPromptHashes: probeCtx.shownPromptHashes ?? [],
    kindsBySkill: probeCtx.kindsBySkill ?? {},
  }

  const answeredCount = session.answeredCount + 1
  const currentIndex = session.currentIndex + 1
  const confidenceStop = !session.continuing && diagnosticConfidenceMet(sessionSnapshot)
  const completed =
    answeredCount >= session.targetCount ||
    currentIndex >= session.queue.length ||
    confidenceStop

  let summary = session.summary
  if (completed) {
    summary = buildDiagnosticSummary(next, sessionSnapshot.weakSkills, sessionSnapshot.strongSkills)
    const weakSet = new Set(sessionSnapshot.weakSkills)
    const strongSet = new Set(sessionSnapshot.strongSkills)
    if (!session.continuing) {
      next = applyDiagnosticMasterySignals(next, weakSet, strongSet)
      next = {
        ...next,
        onboarded: true,
        changelog: [
          `${new Date().toISOString()}: Diagnostic completed — ${summary.recommendedNext}`,
          ...next.changelog,
        ],
      }
    } else {
      next = {
        ...next,
        changelog: [
          `${new Date().toISOString()}: Continuing diagnostic completed — ${summary.recommendedNext}`,
          ...next.changelog,
        ],
      }
    }
  }

  return {
    ...next,
    diagnostic: {
      ...session,
      answeredCount,
      currentIndex,
      queue: session.queue,
      ...weakStrong,
      skillProbes,
      shownProblemIds: probeCtx.shownProblemIds,
      shownPromptHashes: probeCtx.shownPromptHashes,
      kindsBySkill: probeCtx.kindsBySkill,
      completed,
      summary,
    },
  }
}

function buildAdaptiveQueue(state: MathPilotState, pool: Problem[], target: number): string[] {
  const bySkill = new Map<string, Problem[]>()
  for (const problem of pool) {
    for (const skillId of problem.skillIds) {
      const list = bySkill.get(skillId) ?? []
      list.push(problem)
      bySkill.set(skillId, list)
    }
  }

  const emptySession = {
    weakSkills: [] as string[],
    strongSkills: [] as string[],
    suspectedWeakSkills: [] as string[],
    skillProbes: {},
  }
  const ordered = sortSkillsByDiagnosticWeight(state, Object.keys(state.skills), emptySession)

  const queue: string[] = []
  const used = new Set<string>()

  for (const skillId of ordered) {
    const candidates = bySkill.get(skillId) ?? []
    for (const problem of candidates) {
      if (queue.length >= target) break
      if (used.has(problem.id)) continue
      used.add(problem.id)
      queue.push(problem.id)
    }
    if (queue.length >= target) break
  }

  while (queue.length < target) {
    const fallback = pool.find((p) => !used.has(p.id))
    if (!fallback) break
    used.add(fallback.id)
    queue.push(fallback.id)
  }

  return queue.slice(0, target)
}

export function buildDiagnosticSummary(
  state: MathPilotState,
  weakIds: string[],
  strongIds: string[],
): DiagnosticSummary {
  const weak = weakIds
    .map((id) => state.skills[id]?.name)
    .filter(Boolean)
    .slice(0, 5) as string[]
  const strong = strongIds
    .map((id) => state.skills[id]?.name)
    .filter(Boolean)
    .slice(0, 5) as string[]

  const topWeak = weakIds.sort(
    (a, b) => (state.mastery[a]?.masteryScore ?? 0) - (state.mastery[b]?.masteryScore ?? 0),
  )[0]

  const skillName = topWeak ? state.skills[topWeak]?.name : 'foundational skills'
  return {
    strong,
    weak,
    recommendedNext: topWeak ? `Quick repair: ${skillName}` : 'Continue guided practice',
    recommendedSkillIds: topWeak ? [topWeak] : [],
  }
}

function applyDiagnosticMasterySignals(
  state: MathPilotState,
  weak: Set<string>,
  strong: Set<string>,
): MathPilotState {
  const mastery = { ...state.mastery }
  for (const skillId of weak) {
    const current = mastery[skillId]
    if (!current) continue
    const score = Math.max(0.12, current.masteryScore - 0.08)
    mastery[skillId] = {
      ...current,
      masteryScore: score,
      masteryState: 'Weak',
      recentFailures: current.recentFailures + 1,
    }
  }
  for (const skillId of strong) {
    const current = mastery[skillId]
    if (!current || weak.has(skillId)) continue
    const score = Math.min(0.72, current.masteryScore + 0.06)
    mastery[skillId] = {
      ...current,
      masteryScore: score,
      masteryState: score >= 0.55 ? 'Developing' : 'Learning',
    }
  }
  return { ...state, mastery }
}
