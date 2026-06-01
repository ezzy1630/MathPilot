import { shouldIncludeFormulaRecallPhase, weakestFormulaSkillId } from './formulaRecall'
import { syllabusSkillBoost } from './syllabus'
import type { ActivityKind, MathPilotState, NextAction } from './types'

export type SessionPace = 'short' | 'normal' | 'deep' | 'low_energy' | 'high_focus' | 'custom'

export interface SessionPlan {
  phases: ActivityKind[]
  problemBudget: number
  explanationLevel: 'minimal' | 'normal' | 'high'
}

export interface PaceAdjustments {
  difficultyBias: number
  videoPhaseWeight: number
  reviewIntensity: number
  introduceNewMaterial: boolean
}

export interface PrerequisiteGate {
  blocked: boolean
  weakSkillId?: string
  weakSkillName?: string
  targetSkillId?: string
  targetSkillName?: string
}

const CORE_PHASES: ActivityKind[] = [
  'retrieval_warmup',
  'concept_input',
  'worked_example',
  'guided_practice',
  'independent_practice',
  'mixed_review',
]

function appendFormulaRecall(phases: ActivityKind[], state?: MathPilotState): ActivityKind[] {
  if (state && !shouldIncludeFormulaRecallPhase(state)) return phases
  if (phases.includes('formula_recall')) return phases
  return [...phases, 'formula_recall']
}

function appendSyllabusTask(phases: ActivityKind[], state?: MathPilotState): ActivityKind[] {
  if (!state) return phases
  const syllabusIds = syllabusSkillBoost(state).filter(
    (id) => state.skills[id] && (state.mastery[id]?.masteryScore ?? 0) < 0.72,
  )
  if (!syllabusIds.length || phases.includes('syllabus_task')) return phases
  return ['syllabus_task', ...phases]
}

export function resolvePaceAdjustments(state: MathPilotState, pace: SessionPace = 'normal'): PaceAdjustments {
  if (pace === 'custom' && state.customPaceAdjustments) {
    return {
      difficultyBias: state.customPaceAdjustments.difficultyBias,
      videoPhaseWeight: state.customPaceAdjustments.videoPhaseWeight,
      reviewIntensity: state.customPaceAdjustments.reviewIntensity,
      introduceNewMaterial: state.customPaceAdjustments.introduceNewMaterial,
    }
  }
  return paceAdjustments(pace)
}

export function paceAdjustments(pace: SessionPace = 'normal'): PaceAdjustments {
  switch (pace) {
    case 'short':
      return { difficultyBias: -0.08, videoPhaseWeight: 0.5, reviewIntensity: 0.7, introduceNewMaterial: false }
    case 'deep':
      return { difficultyBias: 0.12, videoPhaseWeight: 1.2, reviewIntensity: 1.3, introduceNewMaterial: true }
    case 'low_energy':
      return { difficultyBias: -0.12, videoPhaseWeight: 1.4, reviewIntensity: 0.6, introduceNewMaterial: false }
    case 'high_focus':
      return { difficultyBias: 0.08, videoPhaseWeight: 0.4, reviewIntensity: 1.1, introduceNewMaterial: true }
    case 'custom':
      return { difficultyBias: 0, videoPhaseWeight: 1, reviewIntensity: 1, introduceNewMaterial: true }
    default:
      return { difficultyBias: 0, videoPhaseWeight: 1, reviewIntensity: 1, introduceNewMaterial: true }
  }
}

export function planSession(pace: SessionPace = 'normal', state?: MathPilotState): SessionPlan {
  const adjustments = state ? resolvePaceAdjustments(state, pace) : paceAdjustments(pace)
  const customBudget = pace === 'custom' ? state?.customPaceAdjustments?.problemBudget : undefined
  const customExplanation =
    pace === 'custom' ? state?.customPaceAdjustments?.explanationLevel : undefined

  switch (pace) {
    case 'short':
      return {
        phases: ['retrieval_warmup', 'guided_practice'],
        problemBudget: customBudget ?? 3,
        explanationLevel: customExplanation ?? 'minimal',
      }
    case 'deep':
      return {
        phases: appendFormulaRecall(
          [
            'quick_repair',
            'concept_input',
            'worked_example',
            'guided_practice',
            'independent_practice',
            'mixed_review',
          ],
          state,
        ),
        problemBudget: customBudget ?? 12,
        explanationLevel: customExplanation ?? 'high',
      }
    case 'low_energy':
      return {
        phases: ['concept_input', 'worked_example', 'guided_practice'],
        problemBudget: customBudget ?? Math.max(3, Math.round(4 * adjustments.reviewIntensity)),
        explanationLevel: customExplanation ?? 'high',
      }
    case 'high_focus':
      return {
        phases: appendFormulaRecall(['independent_practice', 'mixed_review'], state),
        problemBudget: customBudget ?? Math.max(6, Math.round(8 * adjustments.reviewIntensity)),
        explanationLevel: customExplanation ?? 'minimal',
      }
    case 'custom':
      return {
        phases: appendFormulaRecall(
          appendSyllabusTask(['retrieval_warmup', 'concept_input', 'guided_practice', 'independent_practice'], state),
          state,
        ),
        problemBudget: customBudget ?? 8,
        explanationLevel: customExplanation ?? 'normal',
      }
    default:
      return {
        phases: appendFormulaRecall(appendSyllabusTask([...CORE_PHASES], state), state),
        problemBudget: customBudget ?? Math.max(6, Math.round(8 * adjustments.reviewIntensity)),
        explanationLevel: customExplanation ?? 'normal',
      }
  }
}

export function sessionExplanationLevel(state: MathPilotState): 'minimal' | 'normal' | 'high' {
  const pace = state.sessionPace ?? 'normal'
  if (pace === 'custom' && state.customPaceAdjustments?.explanationLevel) {
    return state.customPaceAdjustments.explanationLevel
  }
  return planSession(pace, state).explanationLevel
}

export function actionKindForSessionPhase(phase: ActivityKind): ActivityKind {
  const map: Partial<Record<ActivityKind, ActivityKind>> = {
    retrieval_warmup: 'mixed_review',
    concept_input: 'resource_watch',
    worked_example: 'worked_example',
    formula_recall: 'formula_recall',
    syllabus_task: 'syllabus_task',
  }
  return map[phase] ?? phase
}

export function buildSessionPhaseAction(state: MathPilotState, phase: ActivityKind): NextAction {
  const kind = actionKindForSessionPhase(phase)
  const syllabusIds = syllabusSkillBoost(state).filter(
    (id) => state.skills[id] && (state.mastery[id]?.masteryScore ?? 0) < 0.72,
  )
  const dueReview = state.reviewQueue
    .filter((item) => item.due <= new Date().toISOString().slice(0, 10))
    .sort((a, b) => b.priority - a.priority)[0]

  let skillId =
    phase === 'syllabus_task' && syllabusIds.length
      ? syllabusIds[0]
      : dueReview?.skillId ??
        Object.values(state.mastery)
          .filter((m) => state.skills[m.skillId])
          .sort((a, b) => a.masteryScore - b.masteryScore)[0]?.skillId ??
        'chain_rule'

  if (phase === 'formula_recall') {
    skillId = weakestFormulaSkillId(state) ?? skillId
  }

  const skill = state.skills[skillId]
  const labels: Partial<Record<ActivityKind, { title: string; reason: string; cta: string }>> = {
    retrieval_warmup: {
      title: `Warm-up: ${skill?.name ?? skillId}`,
      reason: 'Retrieval warm-up before new material.',
      cta: 'Start warm-up',
    },
    concept_input: {
      title: `Concept input: ${skill?.name ?? skillId}`,
      reason: 'Watch or read a short concept clip before practice.',
      cta: 'Open concept',
    },
    worked_example: {
      title: `Worked example: ${skill?.name ?? skillId}`,
      reason: 'Study a full worked example before guided practice.',
      cta: 'View example',
    },
    formula_recall: {
      title: `Formula recall: ${skill?.name ?? skillId}`,
      reason: 'State key formulas from memory before finishing the session.',
      cta: 'Recall formula',
    },
    syllabus_task: {
      title: `Syllabus focus: ${skill?.name ?? skillId}`,
      reason: 'This skill aligns with your syllabus week.',
      cta: 'Practice syllabus focus',
    },
  }

  const copy = labels[phase] ?? {
    title: `${sessionPhaseLabel(phase)}: ${skill?.name ?? skillId}`,
    reason: 'Continue your planned session phase.',
    cta: 'Continue',
  }

  return {
    kind,
    title: copy.title,
    reason: copy.reason,
    skillIds: [skillId],
    cta: copy.cta,
  }
}

function sessionPhaseLabel(kind: ActivityKind): string {
  const labels: Partial<Record<ActivityKind, string>> = {
    retrieval_warmup: 'Retrieval warm-up',
    concept_input: 'Concept input',
    worked_example: 'Worked example',
    mixed_review: 'Mixed review',
    resource_watch: 'Concept input',
    guided_practice: 'Guided practice',
    independent_practice: 'Independent practice',
    formula_recall: 'Formula recall',
    syllabus_task: 'Syllabus task',
    homework_review: 'Homework review',
  }
  return labels[kind] ?? kind.replaceAll('_', ' ')
}

export function checkPrerequisiteGate(state: MathPilotState, targetSkillId: string): PrerequisiteGate {
  const skill = state.skills[targetSkillId]
  if (!skill) return { blocked: false }

  for (const prereqId of skill.prerequisites) {
    const prereq = state.mastery[prereqId]
    const target = state.mastery[targetSkillId]
    if (prereq && target && target.masteryScore >= 0.45 && prereq.masteryScore < 0.35) {
      return {
        blocked: true,
        weakSkillId: prereqId,
        weakSkillName: state.skills[prereqId]?.name,
        targetSkillId,
        targetSkillName: skill.name,
      }
    }
  }
  return { blocked: false }
}

export function applyTestOutResult(
  state: MathPilotState,
  skillId: string,
  passed: boolean,
): { state: MathPilotState; action: NextAction } {
  const skill = state.skills[skillId]
  const mastery = { ...state.mastery }
  const record = mastery[skillId]
  if (record) {
    mastery[skillId] = {
      ...record,
      masteryScore: passed ? Math.max(record.masteryScore, 0.48) : Math.max(0.12, record.masteryScore - 0.06),
      masteryState: passed ? 'Learning' : 'Weak',
      evidenceCount: record.evidenceCount + 1,
    }
  }

  const nextState = {
    ...state,
    mastery,
    overrides: passed
      ? [...(state.overrides ?? []), { skillId, at: new Date().toISOString(), kind: 'test_out_pass' as const }]
      : state.overrides,
    changelog: [
      `${new Date().toISOString()}: Test-out ${passed ? 'passed' : 'failed'} for ${skill?.name ?? skillId}.`,
      ...state.changelog,
    ],
  }

  const action: NextAction = passed
    ? {
        kind: 'independent_practice',
        title: `Continue ${skill?.name ?? skillId}`,
        reason: 'Test-out passed. Spaced review is still scheduled.',
        skillIds: [skillId],
        cta: 'Continue',
      }
    : {
        kind: 'quick_repair',
        title: `Quick repair: ${skill?.name ?? skillId}`,
        reason: 'Test-out did not clear the prerequisite bar. Repair first.',
        skillIds: [skillId],
        cta: 'Start quick repair',
      }

  return { state: nextState, action }
}

export function logOverride(state: MathPilotState, skillId: string, reason: string): MathPilotState {
  return {
    ...state,
    overrides: [
      ...(state.overrides ?? []),
      { skillId, at: new Date().toISOString(), kind: 'override', reason },
    ],
    changelog: [`${new Date().toISOString()}: User override on ${skillId} — ${reason}`, ...state.changelog],
  }
}
