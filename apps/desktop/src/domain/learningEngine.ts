import { loadAppSettings } from './configLoader'
import { enrichNextAction } from './narrativeCopy'
import { attachStudyPlan } from './studyPlanEngine'
import { enrichReviewQueue } from './reviewItemEngine'
import { nextReviewIntervalDays, reviewPriority, upsertReviewItem } from './reviewScheduler'
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
    changelog: [`${todayIso()}: MathPilot local profile created for ${currentFocus}.`],
  }
}

export function addDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function chooseNextAction(state: MathPilotState): NextAction {
  if (state.codexHint?.title && state.codexHint.skillIds?.length) {
    const hint = state.codexHint
    const skillId = hint.skillIds![0]
    return enrichNextAction(state, {
      kind: hint.kind ?? 'guided_practice',
      title: hint.title!,
      reason: hint.reason ?? 'Suggested from your last help session.',
      skillIds: hint.skillIds!,
      problemId: skillId ? problemForSkill(state, skillId, hint.kind) : undefined,
      cta: hint.cta ?? 'Continue',
    })
  }
  const base = chooseNextActionCore(state)
  return enrichNextAction(state, base)
}

function chooseNextActionCore(state: MathPilotState): NextAction {
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

  const weak = Object.values(state.mastery)
    .filter((record) => state.skills[record.skillId])
    .sort((a, b) => a.masteryScore - b.masteryScore)[0]

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

  const fallbackSkill =
    Object.values(state.mastery).sort((a, b) => a.masteryScore - b.masteryScore)[0]?.skillId ?? 'chain_rule'
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

export function recordAttempt(state: MathPilotState, input: AttemptInput): MathPilotState {
  const independencePenalty = input.hintCount === 0 ? 1 : input.hintCount === 1 ? 0.68 : 0.42
  const modeWeight = input.delayed && input.mixed ? 1.85 : input.mixed ? 1.35 : input.mode === 'guided' ? 0.82 : 1
  const fluencyWeight = input.seconds < 90 ? 1 : input.seconds < 180 ? 0.72 : 0.5
  const direction = input.correct ? 1 : -1
  const magnitude = input.correct ? 0.075 : input.delayed ? 0.11 : 0.075
  const masteryDelta = direction * magnitude * independencePenalty * modeWeight * fluencyWeight

  const attempt: AttemptRecord = {
    ...input,
    id: `attempt-${Date.now()}-${state.attempts.length + 1}`,
    createdAt: new Date().toISOString(),
    masteryDelta,
  }

  const nextState: MathPilotState = {
    ...state,
    attempts: [attempt, ...state.attempts],
    mastery: { ...state.mastery },
    reviewQueue: [...state.reviewQueue],
    mistakePatterns: { ...state.mistakePatterns },
  }

  const primarySkill = input.skillIds[0]
  const prereqMistake = input.mistakeTags?.some((tag) => tag.startsWith('prereq:'))

  if (input.confidence !== undefined && input.skillIds[0]) {
    const sid = input.skillIds[0]
    const rec = nextState.mastery[sid]
    if (rec) {
      const overconfident = input.confidence >= 4 && !input.correct
      const underconfident = input.confidence <= 2 && input.correct
      nextState.mastery[sid] = {
        ...rec,
        conceptualScore: overconfident ? clamp(rec.conceptualScore - 0.04) : rec.conceptualScore,
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
    if (!input.correct && prereqMistake && skillId === primarySkill) {
      delta *= 0.35
    }
    if (!input.correct && prereqMistake && skillId !== primarySkill) {
      delta *= 1.25
    }
    if (!input.correct && input.delayed) {
      delta *= 1.35
    }

    const score = clamp(current.masteryScore + delta)
    const fluency = clamp(current.fluencyScore + (input.correct && input.seconds < 120 ? 0.05 : -0.025))
    const retention = clamp(current.retentionScore + (input.delayed ? masteryDelta * 1.3 : masteryDelta * 0.45))
    const transfer = clamp(current.transferScore + (input.mixed ? masteryDelta * 1.2 : masteryDelta * 0.25))
    const delayedMixedCorrect =
      (current.delayedMixedCorrect ?? 0) + (input.correct && input.delayed && input.mixed ? 1 : 0)
    const due = addDays(nextReviewIntervalDays(input, score))

    nextState.mastery[skillId] = {
      ...current,
      masteryScore: score,
      masteryState: masteryState(score, due, { delayedMixedCorrect }),
      delayedMixedCorrect,
      fluencyScore: fluency,
      retentionScore: retention,
      conceptualScore: clamp(current.conceptualScore + masteryDelta * 0.6),
      proceduralScore: clamp(current.proceduralScore + masteryDelta),
      transferScore: transfer,
      evidenceCount: current.evidenceCount + 1,
      recentFailures: input.correct ? Math.max(0, current.recentFailures - 1) : current.recentFailures + 1,
      lastPracticed: todayIso(),
      reviewDue: due,
    }

    nextState.reviewQueue = upsertReviewItem(nextState.reviewQueue, {
      id: `review-${skillId}`,
      skillId,
      due,
      intervalDays: nextReviewIntervalDays(input, score),
      priority: reviewPriority(input, score),
      reason: input.correct
        ? input.delayed && input.mixed
          ? 'Delayed mixed success; schedule a longer retention check.'
          : 'Correct, but needs spaced evidence before mastery is trusted.'
        : 'Recent miss; schedule repair or review.',
    })
  }

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

  return attachStudyPlan(enrichReviewQueue(nextState))
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
