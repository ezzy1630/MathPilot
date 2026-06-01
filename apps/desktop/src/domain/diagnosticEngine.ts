import { recordAttempt } from './learningEngine'
import { problemBankForDiagnostic } from './problemBank'
import type { AttemptInput, MathPilotState, Problem } from './types'

declare module './types' {
  interface DiagnosticSessionState {
    continuing?: boolean
    triggerReason?: string
  }
}

export const DIAGNOSTIC_TARGET_QUESTIONS = 25
export const MINI_DIAGNOSTIC_MIN = 8
export const MINI_DIAGNOSTIC_MAX = 12

export interface DiagnosticSession {
  id: string
  startedAt: string
  targetCount: number
  answeredCount: number
  currentIndex: number
  queue: string[]
  weakSkills: string[]
  strongSkills: string[]
  completed: boolean
  summary?: DiagnosticSummary
  continuing?: boolean
  triggerReason?: string
}

export interface DiagnosticSummary {
  strong: string[]
  weak: string[]
  recommendedNext: string
  recommendedSkillIds: string[]
}

export interface ContinuingDiagnosticTrigger {
  reason: string
  skillIds: string[]
  kind:
    | 'mistake_pattern'
    | 'hint_dependency'
    | 'review_failure'
    | 'homework_mistake'
    | 'confidence_mismatch'
}

export function shouldTriggerContinuingDiagnostic(
  state: MathPilotState,
): ContinuingDiagnosticTrigger | undefined {
  if (state.diagnostic && !state.diagnostic.completed) return undefined
  if (!state.onboarded) return undefined

  const recent = state.attempts.slice(0, 20)

  const repeatedMistakes = Object.values(state.mistakePatterns).filter((pattern) => pattern.count >= 2)
  if (repeatedMistakes.length) {
    const top = repeatedMistakes.sort((a, b) => b.count - a.count)[0]
    return {
      kind: 'mistake_pattern',
      reason: `Repeated mistake pattern: ${top.note}`,
      skillIds: top.skillIds.slice(0, 3),
    }
  }

  const hintFailures = recent.filter((a) => !a.correct && a.hintCount >= 2)
  if (hintFailures.length >= 2) {
    const skillIds = [...new Set(hintFailures.flatMap((a) => a.skillIds))].slice(0, 3)
    return {
      kind: 'hint_dependency',
      reason: 'Multiple misses after heavy hint use — check whether the method is understood.',
      skillIds,
    }
  }

  const reviewFailures = recent.filter((a) => a.mode === 'review' && !a.correct)
  if (reviewFailures.length >= 2) {
    const skillIds = [...new Set(reviewFailures.flatMap((a) => a.skillIds))].slice(0, 3)
    return {
      kind: 'review_failure',
      reason: 'Spaced review misses suggest retention gaps.',
      skillIds,
    }
  }

  const homework = state.homeworkAnalyses
    .filter((analysis) => analysis.correctness !== 'correct' && analysis.skillsAffected.length)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  if (homework?.skillsAffected.length) {
    return {
      kind: 'homework_mistake',
      reason: homework.feedbackSummary || 'Homework analysis flagged skills to re-check.',
      skillIds: homework.skillsAffected.slice(0, 3),
    }
  }

  const confidenceMismatch = recent.filter(
    (a) => a.confidence !== undefined && ((a.confidence >= 4 && !a.correct) || (a.confidence <= 2 && a.correct)),
  )
  if (confidenceMismatch.length >= 3) {
    const skillIds = [...new Set(confidenceMismatch.flatMap((a) => a.skillIds))].slice(0, 3)
    return {
      kind: 'confidence_mismatch',
      reason: 'Confidence ratings do not match recent outcomes — a short diagnostic will recalibrate.',
      skillIds,
    }
  }

  return undefined
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
    completed: false,
    continuing: true,
    triggerReason: trigger?.reason,
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
    completed: false,
  }
  return {
    state: { ...state, diagnostic: session },
    session,
  }
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
): MathPilotState {
  const session = state.diagnostic
  if (!session || session.completed) return state

  const problem = state.problems[problemId]
  const attemptInput: AttemptInput = {
    problemId,
    skillIds: problem.skillIds,
    answer,
    correct,
    mode: 'diagnostic',
    hintCount: 0,
    seconds: 90,
    mixed: true,
    delayed: false,
    mistakeTags: correct ? undefined : ['diagnostic:needs_confirmation'],
  }

  let next = recordAttempt(state, attemptInput)
  const weak = new Set(session.weakSkills)
  const strong = new Set(session.strongSkills)

  for (const skillId of problem.skillIds) {
    if (correct) strong.add(skillId)
    else weak.add(skillId)
  }

  const answeredCount = session.answeredCount + 1
  const currentIndex = session.currentIndex + 1
  const completed = answeredCount >= session.targetCount || currentIndex >= session.queue.length

  let queue = session.queue
  if (!completed && !session.continuing && answeredCount % 3 === 0) {
    queue = reprioritizeDiagnosticQueue(next, { ...session, weakSkills: [...weak], strongSkills: [...strong] }, currentIndex)
  }

  let summary = session.summary
  if (completed) {
    summary = buildDiagnosticSummary(next, [...weak], [...strong])
    if (!session.continuing) {
      next = applyDiagnosticMasterySignals(next, weak, strong)
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
      queue,
      weakSkills: [...weak],
      strongSkills: [...strong],
      completed,
      summary,
    },
  }
}

function reprioritizeDiagnosticQueue(
  state: MathPilotState,
  session: DiagnosticSession,
  answeredThroughIndex: number,
): string[] {
  const weak = new Set(session.weakSkills)
  const strong = new Set(session.strongSkills)
  const prefix = session.queue.slice(0, answeredThroughIndex)
  const prefixIds = new Set(prefix)

  const pool = problemBankForDiagnostic(state)
  const bySkill = new Map<string, string[]>()
  for (const problem of pool) {
    for (const skillId of problem.skillIds) {
      const list = bySkill.get(skillId) ?? []
      if (!list.includes(problem.id)) list.push(problem.id)
      bySkill.set(skillId, list)
    }
  }

  const orderedSkills = Object.keys(state.skills).sort((a, b) => {
    const aRank = weak.has(a) ? 0 : strong.has(a) ? 2 : 1
    const bRank = weak.has(b) ? 0 : strong.has(b) ? 2 : 1
    if (aRank !== bRank) return aRank - bRank
    return (state.mastery[a]?.masteryScore ?? 0.3) - (state.mastery[b]?.masteryScore ?? 0.3)
  })

  const rebuilt = [...prefix]
  const used = new Set(prefixIds)

  for (const skillId of orderedSkills) {
    for (const problemId of bySkill.get(skillId) ?? []) {
      if (used.has(problemId)) continue
      rebuilt.push(problemId)
      used.add(problemId)
      if (rebuilt.length >= session.targetCount) return rebuilt
    }
  }

  for (const problem of pool) {
    if (used.has(problem.id)) continue
    rebuilt.push(problem.id)
    used.add(problem.id)
    if (rebuilt.length >= session.targetCount) break
  }

  return rebuilt.slice(0, session.targetCount)
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

  const skillIds = Object.keys(state.skills)
  const ordered = [...skillIds].sort((a, b) => {
    const ma = state.mastery[a]?.masteryScore ?? 0.3
    const mb = state.mastery[b]?.masteryScore ?? 0.3
    return ma - mb
  })

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

function buildDiagnosticSummary(
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
