import type { ActivityKind, MathPilotState, NextAction } from './types'

export type SessionPace = 'short' | 'normal' | 'deep' | 'low_energy' | 'high_focus' | 'custom'

export interface SessionPlan {
  phases: ActivityKind[]
  problemBudget: number
  explanationLevel: 'minimal' | 'normal' | 'high'
}

export interface PrerequisiteGate {
  blocked: boolean
  weakSkillId?: string
  weakSkillName?: string
  targetSkillId?: string
  targetSkillName?: string
}

export function planSession(pace: SessionPace = 'normal'): SessionPlan {
  switch (pace) {
    case 'short':
      return { phases: ['mixed_review', 'guided_practice'], problemBudget: 3, explanationLevel: 'minimal' }
    case 'deep':
      return {
        phases: ['quick_repair', 'resource_watch', 'guided_practice', 'independent_practice', 'mixed_review'],
        problemBudget: 12,
        explanationLevel: 'high',
      }
    case 'low_energy':
      return { phases: ['resource_watch', 'guided_practice'], problemBudget: 4, explanationLevel: 'high' }
    case 'high_focus':
      return { phases: ['independent_practice', 'mixed_review'], problemBudget: 8, explanationLevel: 'minimal' }
    default:
      return {
        phases: ['mixed_review', 'resource_watch', 'guided_practice', 'independent_practice', 'mixed_review'],
        problemBudget: 8,
        explanationLevel: 'normal',
      }
  }
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
