import { filterProblemsByCourseFocus } from './courseFocusFilter'
import { interleavePolicyForSkill } from './interleavingPolicy'
import type { MathPilotState, Problem } from './types'

/** Pick a problem that interleaves similar-looking skills (spec §13.5). */
export function pickInterleavedProblem(state: MathPilotState, primarySkillId: string): Problem | undefined {
  const focusOpts = { repairSkillId: primarySkillId }
  const pool = filterProblemsByCourseFocus(
    state,
    Object.values(state.problems).filter((p) => !p.deprecated && p.skillIds.includes(primarySkillId)),
    focusOpts,
  )
  if (!pool.length) return undefined

  const recentSkillIds = new Set(state.attempts.slice(0, 6).flatMap((a) => a.skillIds))
  const { preferSkillIds } = interleavePolicyForSkill(primarySkillId, recentSkillIds, state.skills)

  if (preferSkillIds.length) {
    const clusterCandidates = filterProblemsByCourseFocus(
      state,
      Object.values(state.problems).filter(
        (p) =>
          !p.deprecated &&
          p.skillIds.some((id) => preferSkillIds.includes(id)) &&
          !p.skillIds.every((id) => id === primarySkillId),
      ),
      focusOpts,
    )
    const fresh = clusterCandidates.filter((p) => !p.skillIds.some((id) => recentSkillIds.has(id)))
    const pick = fresh.length ? fresh : clusterCandidates
    if (pick.length) return pick[Math.floor(Math.random() * pick.length)]
  }

  const primary = state.skills[primarySkillId]
  const relatedSkills = new Set(
    Object.values(state.skills)
      .filter(
        (s) =>
          s.area === primary?.area &&
          s.id !== primarySkillId &&
          s.type !== primary?.type,
      )
      .map((s) => s.id),
  )

  const interleaveCandidates = filterProblemsByCourseFocus(
    state,
    Object.values(state.problems).filter(
      (p) =>
        !p.deprecated &&
        p.skillIds.some((id) => relatedSkills.has(id)) &&
        !p.skillIds.every((id) => id === primarySkillId) &&
        !p.skillIds.some((id) => recentSkillIds.has(id)),
    ),
    focusOpts,
  )

  if (interleaveCandidates.length) {
    return interleaveCandidates[Math.floor(Math.random() * interleaveCandidates.length)]
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

export function pickInterleavedSkillId(state: MathPilotState, primarySkillId: string): string | undefined {
  const recentSkillIds = new Set(state.attempts.slice(0, 6).flatMap((a) => a.skillIds))
  const { preferSkillIds } = interleavePolicyForSkill(primarySkillId, recentSkillIds, state.skills)
  return preferSkillIds[0]
}
