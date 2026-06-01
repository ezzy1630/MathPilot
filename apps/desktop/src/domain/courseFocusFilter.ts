import type { MathPilotState, Problem } from './types'

export interface CourseFocusFilterOptions {
  /** Target skill for repair — allows direct prerequisites outside the active course. */
  repairSkillId?: string
  /** Explicit prerequisite-repair session (quick repair, homework review). */
  prerequisiteRepair?: boolean
}

/** Whether a skill may appear in random / interleaved practice for the current focus. */
export function isSkillActiveForPractice(
  state: MathPilotState,
  skillId: string,
  options?: CourseFocusFilterOptions,
): boolean {
  const skill = state.skills[skillId]
  if (!skill) return false

  if (options?.prerequisiteRepair || options?.repairSkillId) {
    if (skill.course === state.currentFocus || skill.course === 'Prerequisite') return true
    const repairId = options.repairSkillId
    if (repairId) {
      const target = state.skills[repairId]
      if (target?.prerequisites.includes(skillId)) return true
    }
    return false
  }

  return skill.course === state.currentFocus
}

export function filterProblemsByCourseFocus(
  state: MathPilotState,
  problems: Problem[],
  options?: CourseFocusFilterOptions,
): Problem[] {
  return problems.filter((problem) =>
    problem.skillIds.some((skillId) => isSkillActiveForPractice(state, skillId, options)),
  )
}
