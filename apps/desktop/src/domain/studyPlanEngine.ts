import type { CourseFocus, MathPilotState } from './types'
import { syllabusSkillBoost } from './syllabus'

export interface StudyPlanStep {
  skillId: string
  skillName: string
  action: string
  priority: number
}

export interface StudyPlan {
  focus: CourseFocus
  updatedAt: string
  steps: StudyPlanStep[]
  summary: string
}

export function buildStudyPlan(state: MathPilotState): StudyPlan {
  const boostIds = syllabusSkillBoost(state)
  const weak = Object.values(state.mastery)
    .filter((m) => state.skills[m.skillId] && m.masteryScore < 0.55)
    .sort((a, b) => {
      const fluencyGapA = a.masteryScore - a.fluencyScore
      const fluencyGapB = b.masteryScore - b.fluencyScore
      if (Math.abs(fluencyGapA - fluencyGapB) > 0.08) return fluencyGapB - fluencyGapA
      return a.masteryScore - b.masteryScore
    })
    .slice(0, 8)

  const due = state.reviewQueue
    .filter((r) => r.due <= new Date().toISOString().slice(0, 10))
    .slice(0, 4)

  const syllabusSteps: StudyPlanStep[] = boostIds
    .filter((id) => state.skills[id] && (state.mastery[id]?.masteryScore ?? 0) < 0.75)
    .map((skillId, i) => ({
      skillId,
      skillName: state.skills[skillId]?.name ?? skillId,
      action: 'Syllabus focus',
      priority: 95 - i,
    }))

  const steps: StudyPlanStep[] = [
    ...syllabusSteps,
    ...due.map((r, i) => ({
      skillId: r.skillId,
      skillName: state.skills[r.skillId]?.name ?? r.skillId,
      action: 'Review',
      priority: 90 - i,
    })),
    ...weak.map((m, i) => ({
      skillId: m.skillId,
      skillName: state.skills[m.skillId]?.name ?? m.skillId,
      action:
        m.masteryScore < 0.35
          ? 'Quick repair'
          : m.fluencyScore + 0.12 < m.masteryScore
            ? 'Fluency drill'
            : 'Practice',
      priority: 70 - i,
    })),
  ]

  return {
    focus: state.currentFocus,
    updatedAt: new Date().toISOString(),
    steps: steps.sort((a, b) => b.priority - a.priority).slice(0, 10),
    summary:
      steps.length > 0
        ? `Focus on ${steps[0].skillName} first, then ${steps.slice(1, 3).map((s) => s.skillName).join(', ') || 'mixed review'}.`
        : 'Maintain mastery with mixed review and occasional transfer problems.',
  }
}

export function attachStudyPlan(state: MathPilotState): MathPilotState {
  return { ...state, studyPlan: buildStudyPlan(state) }
}
