import { prioritizedWeakMastery, topMistakeRepairSkill } from './actionPriority'
import { loadAppSettings } from './configLoader'
import { evaluateContinuingDiagnostic } from './continuingDiagnostics'
import { currentSessionPhase } from './dailySessionEngine'
import { enrichNextAction } from './narrativeCopy'
import { attachStudyPlan } from './studyPlanEngine'
import { enrichReviewQueue } from './reviewItemEngine'
import { buildReviewItemUpdate, upsertReviewItem } from './reviewScheduler'
import { applyPostResourceAttempt } from './resourceLearning'
import { buildSessionPhaseAction } from './sessionEngine'
import { skillsForCourse } from './courseGraph'
import { confidenceCalibrationHint, confidenceReviewBoost } from './confidenceRouting'
import { syllabusSkillBoost } from './syllabus'
import { allProblems } from './seedData'
import { buildResourceCatalog } from './resourceResolver'
import type {
  AttemptInput,
  AttemptRecord,
  CourseFocus,
  MathPilotState,
  MasteryRecord,
  MasteryState,
  NextAction,
} from './types'

declare module './types' {
  interface AttemptInput {
    partialCredit?: number
  }
  interface AttemptRecord {
    partialCredit?: number
  }
}

const todayIso = () => new Date().toISOString().slice(0, 10)
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export function applyDecayIfStale(record: MasteryRecord): MasteryRecord {
  if (!record.lastPracticed) return record
  const days = Math.floor(
    (Date.now() - new Date(record.lastPracticed).getTime()) / (1000 * 60 * 60 * 24),
  )
  if (days < 21 || record.masteryScore < 0.5) return record
  const decayed = Math.max(0.12, record.masteryScore - 0.04 * Math.floor(days / 14))
  return {
    ...record,
    masteryScore: decayed,
    masteryState: 'Decayed',
  }
}

export function masteryState(
  score: number,
  due?: string,
  evidence?: { delayedMixedCorrect?: number },
): MasteryState {
  if (due && due < todayIso() && score >= 0.55) return 'Needs Review'
  if (score < 0.16) return 'Unknown'
  if (score < 0.35) return 'Weak'
  if (score < 0.55) return 'Learning'
  if (score < 0.72) return 'Developing'
  if (score < 0.88) return 'Solid'
  const delayedProof = (evidence?.delayedMixedCorrect ?? 0) >= 2
  if (score >= 0.88 && !delayedProof) return 'Solid'
  return 'Mastered'
}

export async function createInitialStateAsync(currentFocus: CourseFocus): Promise<MathPilotState> {
  const settings = await loadAppSettings()
  const base = createInitialState(currentFocus)
  return {
    ...base,
    profileName: settings.profileName,
    advancedMode: settings.advancedModeDefault,
  }
}

export function createInitialState(currentFocus: CourseFocus): MathPilotState {
  const courseSkills = skillsForCourse(currentFocus)
  const mastery = Object.fromEntries(
    courseSkills.map((skill): [string, MasteryRecord] => {
      const base = skill.course === 'Prerequisite' ? 0.42 : 0.28
      return [
        skill.id,
        {
          skillId: skill.id,
          masteryScore: base,
          masteryState: masteryState(base),
          fluencyScore: base,
          retentionScore: base,
          conceptualScore: base,
          proceduralScore: base,
          transferScore: base * 0.8,
          evidenceCount: 0,
          recentFailures: 0,
          reviewDue: addDays(1),
          delayedMixedCorrect: 0,
        },
      ]
    }),
  )

  return {
    profileName: 'Student',
    currentFocus,
    onboarded: false,
    advancedMode: false,
    skills: Object.fromEntries(courseSkills.map((skill) => [skill.id, skill])),
    mastery,
    problems: Object.fromEntries(allProblems(currentFocus).map((problem) => [problem.id, problem])),
    attempts: [],
    reviewQueue: [],
    mistakePatterns: {},
    resources: buildResourceCatalog(Object.fromEntries(courseSkills.map((skill) => [skill.id, skill]))),
    resourceEvents: [],
    aiCalls: [],
    homeworkAnalyses: [],
    preferences: {
      tone: 'warm',
      gamificationLevel: 'minimal',
      notificationsEnabled: false,
      reportsMode: 'on_demand_only',
      enableCodexProblemGen: true,
      enableMaintenanceCurator: true,
      activeVideoMode: 'sometimes',
      theme: 'system',
      confidencePrompts: 'review_only',
    },
    changelog: [`${todayIso()}: MathPilot local profile created for ${currentFocus}.`],
  }
}

export function addDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function applyCodexHintNarrative(action: NextAction, hint?: Partial<NextAction>): NextAction {
  if (!hint?.reason) return action
  return { ...action, reason: hint.reason }
}

export function chooseNextAction(state: MathPilotState): NextAction {
  const base = chooseNextActionCore(state)
  const enriched = enrichNextAction(state, base)
  return applyCodexHintNarrative(enriched, state.codexHint)
}

function chooseNextActionCore(state: MathPilotState): NextAction {
  const sessionPhase = currentSessionPhase(state)
  if (sessionPhase && !(state.diagnostic && !state.diagnostic.completed) && !state.quickRepair) {
    return buildSessionPhaseAction(state, sessionPhase)
  }

  const calibration = confidenceCalibrationHint(state)
  if (calibration) {
    const overSkill = state.attempts.find((a) => (a.confidence ?? 0) >= 4 && !a.correct)?.skillIds[0]
    if (overSkill && state.skills[overSkill]) {
      return {
        kind: 'quick_repair',
        title: `Recalibrate ${state.skills[overSkill].name}`,
        reason: calibration,
        skillIds: [overSkill],
        problemId: problemForSkill(state, overSkill, 'quick_repair'),
        cta: 'Start quick repair',
      }
    }
  }

  if (state.continuingDiagnosticPending && !state.diagnostic) {
    const patternSkill = topMistakeRepairSkill(state)
    const focusIds = patternSkill
      ? [patternSkill]
      : prioritizedWeakMastery(state, 1).map((m) => m.skillId)
    return {
      kind: 'diagnostic',
      title: 'Continuing diagnostic recommended',
      reason:
        state.coachInsight?.narrative ||
        'Recent mistakes suggest a short calibration check before pushing forward.',
      skillIds: focusIds.filter(Boolean),
      cta: 'Start continuing diagnostic',
    }
  }

  const dueReview = state.reviewQueue
    .filter((item) => item.due <= todayIso())
    .sort((a, b) => b.priority + confidenceReviewBoost(state, b.skillId) - (a.priority + confidenceReviewBoost(state, a.skillId)))[0]

  if (dueReview) {
    const skill = state.skills[dueReview.skillId]
    return {
      kind: 'mixed_review',
      title: `Review ready: ${skill.name}`,
      reason: dueReview.reason,
      skillIds: [skill.id],
      problemId: problemForSkill(state, skill.id, 'mixed_review'),
      cta: 'Start review',
    }
  }

  const homeworkRepair = state.homeworkAnalyses
    .filter((analysis) => analysis.repairRecommendation?.skillId && analysis.correctness !== 'correct')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  if (homeworkRepair?.repairRecommendation) {
    const skillId = homeworkRepair.repairRecommendation.skillId
    const skill = state.skills[skillId]
    if (skill) {
      return {
        kind: 'homework_review',
        title: `Homework repair: ${skill.name}`,
        reason: homeworkRepair.repairRecommendation.reason || homeworkRepair.feedbackSummary,
        skillIds: [skillId],
        problemId: problemForSkill(state, skillId, 'quick_repair'),
        cta: 'Fix homework pattern',
      }
    }
  }

  const blocked = Object.values(state.skills)
    .flatMap((skill) =>
      skill.prerequisites
        .filter((prereqId) => {
          const target = state.mastery[skill.id]
          const prereq = state.mastery[prereqId]
          return target && prereq && target.masteryScore >= 0.45 && prereq.masteryScore < 0.35
        })
        .map((prereqId) => ({ skill, prereq: state.skills[prereqId] })),
    )
    .filter((entry) => entry.prereq)
    .sort((a, b) => state.mastery[a.prereq.id].masteryScore - state.mastery[b.prereq.id].masteryScore)[0]

  if (blocked) {
    return {
      kind: 'quick_repair',
      title: `Repair ${blocked.prereq.name}`,
      reason: `${blocked.prereq.name} blocks ${blocked.skill.name}. Repair this before pushing forward.`,
      skillIds: [blocked.prereq.id],
      problemId: problemForSkill(state, blocked.prereq.id, 'quick_repair'),
      cta: 'Start quick repair',
    }
  }

  const patternRepairSkill = topMistakeRepairSkill(state)
  if (patternRepairSkill && state.skills[patternRepairSkill]) {
    const skill = state.skills[patternRepairSkill]
    return {
      kind: 'quick_repair',
      title: `Repair pattern: ${skill.name}`,
      reason: `Recurring mistake pattern on ${skill.name} — short repair before new topics.`,
      skillIds: [patternRepairSkill],
      problemId: problemForSkill(state, patternRepairSkill, 'quick_repair'),
      cta: 'Start quick repair',
    }
  }

  const syllabusIds = syllabusSkillBoost(state).filter(
    (id) => state.skills[id] && (state.mastery[id]?.masteryScore ?? 0) < 0.72,
  )
  if (syllabusIds.length) {
    const skillId = syllabusIds[0]
    const skill = state.skills[skillId]
    return {
      kind: 'guided_practice',
      title: `This week: ${skill.name}`,
      reason: 'Aligned with your syllabus week — prioritize before optional practice.',
      skillIds: [skillId],
      problemId: problemForSkill(state, skillId, 'guided_practice'),
      cta: 'Practice syllabus focus',
    }
  }

  const coachHighlight = state.coachInsight?.mapHighlightSkillIds?.find(
    (id) => state.skills[id] && (state.mastery[id]?.masteryScore ?? 1) < 0.68,
  )
  if (coachHighlight) {
    const skill = state.skills[coachHighlight]
    return {
      kind: 'guided_practice',
      title: `Coach focus: ${skill.name}`,
      reason: state.coachInsight?.narrative || `${skill.name} is highlighted on your learning map.`,
      skillIds: [coachHighlight],
      problemId: problemForSkill(state, coachHighlight, 'guided_practice'),
      cta: 'Practice coach focus',
    }
  }

  const weak = prioritizedWeakMastery(state, 1)[0]

  if (weak && weak.masteryScore < 0.5) {
    return {
      kind: state.attempts.length < 3 ? 'diagnostic' : 'guided_practice',
      title: state.attempts.length < 3 ? 'Start adaptive diagnostic' : `Stabilize ${state.skills[weak.skillId].name}`,
      reason:
        state.attempts.length < 3
          ? 'A short diagnostic will create the first reliable map.'
          : `${state.skills[weak.skillId].name} is the lowest current mastery signal.`,
      skillIds: [weak.skillId],
      problemId: problemForSkill(state, weak.skillId),
      cta: state.attempts.length < 3 ? 'Start diagnostic' : 'Practice',
    }
  }

  const fallbackSkill = prioritizedWeakMastery(state, 1)[0]?.skillId ?? 'chain_rule'
  return {
    kind: 'independent_practice',
    title: 'Continue independent practice',
    reason: 'No urgent repair is due. Build transfer evidence with a mixed problem.',
    skillIds: [fallbackSkill],
    problemId: problemForSkill(state, fallbackSkill, 'mixed_review'),
    cta: 'Continue',
  }
}

function problemForSkill(state: MathPilotState, skillId: string, preferredMode?: string) {
  const pool = Object.values(state.problems).filter((problem) => problem.skillIds.includes(skillId))
  return (
    pool.find((problem) => problem.mode === preferredMode)?.id ??
    pool[0]?.id ??
    Object.values(state.problems).find((problem) => problem.mode === 'diagnostic')?.id ??
    Object.values(state.problems)[0]?.id
  )
}

function partialCreditFactor(input: AttemptInput): number {
  if (input.correct) return 1
  const credit = input.partialCredit ?? 0
  if (credit <= 0) return 1
  return Math.max(0.35, 1 - credit * 0.55)
}

function conceptualQualityProxy(input: AttemptInput, problem?: { answerType?: string }): number {
  if (!input.correct || problem?.answerType !== 'text') return 0
  const length = input.answer.trim().length
  if (length < 12) return 0
  return Math.min(1, length / 80)
}

function attemptDifficultyWeight(problem?: { difficulty?: number }, skill?: { type?: string }): number {
  const difficultyFactor = problem?.difficulty !== undefined ? 0.85 + problem.difficulty * 0.3 : 1
  const skillTypeFactor =
    skill?.type === 'conceptual' ? 1.12 : skill?.type === 'mixed' ? 1.05 : skill?.type === 'procedural' ? 0.98 : 1
  const answerTypeFactor =
    problem && 'answerType' in problem
      ? problem.answerType === 'text'
        ? 1.08
        : problem.answerType === 'choice'
          ? 0.95
          : 1
      : 1
  return difficultyFactor * skillTypeFactor * answerTypeFactor
}

export function recordAttempt(state: MathPilotState, input: AttemptInput): MathPilotState {
  const problem = state.problems[input.problemId]
  const primarySkill = input.skillIds[0]
  const skillMeta = primarySkill ? state.skills[primarySkill] : undefined
  const weight = attemptDifficultyWeight(problem, skillMeta)
  const conceptualQuality = conceptualQualityProxy(input, problem)

  const independencePenalty = input.hintCount === 0 ? 1 : input.hintCount === 1 ? 0.68 : 0.42
  const modeWeight = input.delayed && input.mixed ? 1.85 : input.mixed ? 1.35 : input.mode === 'guided' ? 0.82 : 1
  const slowCorrect = input.correct && input.seconds >= 180
  const fluencyWeight = input.correct
    ? slowCorrect
      ? 0.45
      : input.seconds < 90
        ? 1
        : input.seconds < 180
          ? 0.72
          : 0.5
    : input.seconds < 90
      ? 1
      : input.seconds < 180
        ? 0.72
        : 0.5
  const direction = input.correct ? 1 : -1
  const wrongMagnitude =
    input.delayed && input.mixed ? 0.16 : input.delayed ? 0.11 : input.mixed ? 0.095 : 0.075
  const magnitude = input.correct ? 0.075 : wrongMagnitude
  const partialFactor = partialCreditFactor(input)
  const masteryDelta =
    direction * magnitude * independencePenalty * modeWeight * fluencyWeight * partialFactor * weight

  let primaryFluencyDelta = 0

  const attempt: AttemptRecord = {
    ...input,
    id: `attempt-${Date.now()}-${state.attempts.length + 1}`,
    createdAt: new Date().toISOString(),
    masteryDelta,
    partialCredit: input.partialCredit,
    conceptualQuality: conceptualQuality || undefined,
  }

  const nextState: MathPilotState = {
    ...state,
    attempts: [attempt, ...state.attempts],
    mastery: { ...state.mastery },
    reviewQueue: [...state.reviewQueue],
    mistakePatterns: { ...state.mistakePatterns },
  }

  const primarySkillId = input.skillIds[0]
  const prereqMistake = input.mistakeTags?.some((tag) => tag.startsWith('prereq:'))

  if (input.confidence !== undefined && input.skillIds[0]) {
    const sid = input.skillIds[0]
    const rec = nextState.mastery[sid]
    if (rec) {
      const overconfident = input.confidence >= 4 && !input.correct
      const underconfident = input.confidence <= 2 && input.correct
      nextState.mastery[sid] = {
        ...rec,
        conceptualScore: overconfident
          ? clamp(rec.conceptualScore - 0.06)
          : clamp(rec.conceptualScore + conceptualQuality * 0.05),
        proceduralScore: underconfident ? clamp(rec.proceduralScore + 0.03) : rec.proceduralScore,
      }
    }
  }

  for (const skillId of input.skillIds) {
    const current = nextState.mastery[skillId]
    if (!current) continue

    let delta = masteryDelta
    if (!input.correct && input.confidence !== undefined && input.confidence >= 4) {
      delta *= 1.35
    }
    if (input.correct && input.confidence !== undefined && input.confidence <= 2) {
      delta *= 1.1
    }
    if (!input.correct && prereqMistake && skillId === primarySkillId) {
      delta *= 0.35
    }
    if (!input.correct && prereqMistake && skillId !== primarySkillId) {
      delta *= 1.25
    }
    if (!input.correct && input.delayed) {
      delta *= 1.35
    }

    const score = clamp(current.masteryScore + delta)
    const fluencyDelta = input.correct
      ? slowCorrect
        ? -0.04
        : input.seconds < 90
          ? 0.05
          : 0.02
      : -0.025
    if (skillId === primarySkillId) primaryFluencyDelta = fluencyDelta
    const fluency = clamp(current.fluencyScore + fluencyDelta)
    const isTransferEvidence =
      input.mixed && input.skillIds.length > 1 && input.skillIds.some((id) => id !== primarySkillId)
    const retention = clamp(current.retentionScore + (input.delayed ? delta * 1.3 : delta * 0.45))
    const transfer = clamp(
      current.transferScore +
        (isTransferEvidence ? delta * 1.5 : input.mixed ? delta * 1.2 : delta * 0.25),
    )
    const delayedMixedCorrect =
      (current.delayedMixedCorrect ?? 0) + (input.correct && input.delayed && input.mixed ? 1 : 0)
    const reviewItem = buildReviewItemUpdate(
      skillId,
      input,
      score,
      retention,
      nextState.reviewQueue,
      todayIso(),
    )

    nextState.mastery[skillId] = {
      ...current,
      masteryScore: score,
      masteryState: masteryState(score, reviewItem.due, { delayedMixedCorrect }),
      delayedMixedCorrect,
      fluencyScore: fluency,
      retentionScore: retention,
      conceptualScore: clamp(current.conceptualScore + delta * 0.6 + conceptualQuality * 0.04),
      proceduralScore: clamp(current.proceduralScore + delta),
      transferScore: transfer,
      evidenceCount: current.evidenceCount + 1,
      recentFailures: input.correct ? Math.max(0, current.recentFailures - 1) : current.recentFailures + 1,
      lastPracticed: todayIso(),
      reviewDue: reviewItem.due,
    }

    nextState.reviewQueue = upsertReviewItem(nextState.reviewQueue, reviewItem)
  }

  attempt.fluencyDelta = primaryFluencyDelta
  nextState.attempts[0] = attempt

  for (const tag of input.mistakeTags ?? []) {
    const previous = nextState.mistakePatterns[tag]
    nextState.mistakePatterns[tag] = {
      tag,
      skillIds: input.skillIds,
      count: (previous?.count ?? 0) + 1,
      lastSeen: todayIso(),
      note: readableMistake(tag),
    }
  }

  if (input.resourceId || state.activeVideo?.resourceId) {
    return evaluateContinuingDiagnostic(
      applyPostResourceAttempt(nextState, input),
      input,
    )
  }

  return evaluateContinuingDiagnostic(attachStudyPlan(enrichReviewQueue(nextState)), input)
}

function readableMistake(tag: string) {
  const labels: Record<string, string> = {
    'chain_rule:missing_inner_derivative': 'Outer derivative was applied without multiplying by the inner derivative.',
    'method_selection:wrong_test': 'The chosen method does not match the structure of the problem.',
    'setup:modeling_missing_equation': 'The relationship equation needs to be written before calculation starts.',
  }
  return labels[tag] ?? tag.replaceAll('_', ' ')
}

export function runDiagnosticAnswer(state: MathPilotState, problemId: string, answer: string, correct: boolean) {
  const problem = state.problems[problemId]
  return recordAttempt(state, {
    problemId,
    skillIds: problem.skillIds,
    answer,
    correct,
    mode: 'diagnostic',
    hintCount: 0,
    seconds: 90,
    mixed: true,
    delayed: false,
  })
}
