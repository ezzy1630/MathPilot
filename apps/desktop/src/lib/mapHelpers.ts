import { filterProblemsByCourseFocus } from '../domain/courseFocusFilter'
import type { MathPilotState } from '../domain/types'

export function readiness(state: MathPilotState): number {
  const records = Object.values(state.mastery).filter((m) => state.skills[m.skillId])
  if (!records.length) return 0
  return Math.round((records.reduce((sum, r) => sum + r.masteryScore, 0) / records.length) * 100)
}

export function areaReadiness(state: MathPilotState, area: string): number {
  const skills = Object.values(state.skills).filter((s) => s.area === area)
  if (!skills.length) return 0
  const sum = skills.reduce((acc, s) => acc + (state.mastery[s.id]?.masteryScore ?? 0), 0)
  return Math.round((sum / skills.length) * 100)
}

export function groupByArea(state: MathPilotState) {
  const groups: Record<string, Array<{ skill: (typeof state.skills)[string]; mastery: (typeof state.mastery)[string] }>> = {}
  for (const skill of Object.values(state.skills)) {
    if (skill.course !== state.currentFocus && skill.course !== 'Prerequisite') continue
    const mastery = state.mastery[skill.id]
    if (!mastery) continue
    const list = groups[skill.area] ?? []
    list.push({ skill, mastery })
    groups[skill.area] = list
  }
  for (const area of Object.keys(groups)) {
    groups[area].sort((a, b) => a.mastery.masteryScore - b.mastery.masteryScore)
  }
  return groups
}

export function problemForSkill(
  state: MathPilotState,
  skillId: string,
  preferredMode?: string,
  options?: { prerequisiteRepair?: boolean },
) {
  const pool = filterProblemsByCourseFocus(
    state,
    Object.values(state.problems).filter((p) => p.skillIds.includes(skillId) && !p.deprecated),
    { repairSkillId: skillId, prerequisiteRepair: options?.prerequisiteRepair },
  )
  return (
    pool.find((p) => p.mode === preferredMode)?.id ??
    pool[0]?.id ??
    Object.values(state.problems).find((p) => p.mode === 'diagnostic')?.id
  )
}
