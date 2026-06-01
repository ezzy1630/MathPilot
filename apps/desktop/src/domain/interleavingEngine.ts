import { interleavePolicyForSkill } from './interleavingPolicy'
import type { MathPilotState, Problem } from './types'

/** Pick a problem that interleaves similar-looking skills (spec: interleaving). */
export function pickInterleavedProblem(state: MathPilotState, primarySkillId: string): Problem | undefined {
  const pool = Object.values(state.problems).filter((p) => !p.deprecated && p.skillIds.includes(primarySkillId))
  if (!pool.length) return undefined

  const recentSkillIds = new Set(state.attempts.slice(0, 6).flatMap((a) => a.skillIds))
  const { preferSkillIds } = interleavePolicyForSkill(primarySkillId, recentSkillIds)

  if (preferSkillIds.length) {
    const clusterCandidates = Object.values(state.problems).filter(
      (p) =>
        !p.deprecated &&
        p.skillIds.some((id) => preferSkillIds.includes(id)) &&
        !p.skillIds.every((id) => id === primarySkillId),
    )
    const fresh = clusterCandidates.filter((p) => !p.skillIds.some((id) => recentSkillIds.has(id)))
    const pick = fresh.length ? fresh : clusterCandidates
    if (pick.length) return pick[Math.floor(Math.random() * pick.length)]
  }

  const relatedSkills = new Set(
    Object.values(state.skills)
      .filter((s) => s.area === state.skills[primarySkillId]?.area && s.id !== primarySkillId)
      .map((s) => s.id),
  )

  const interleaveCandidates = Object.values(state.problems).filter(
    (p) =>
      !p.deprecated &&
      p.skillIds.some((id) => relatedSkills.has(id)) &&
      !p.skillIds.every((id) => id === primarySkillId) &&
      !p.skillIds.some((id) => recentSkillIds.has(id)),
  )

  if (interleaveCandidates.length) {
    return interleaveCandidates[Math.floor(Math.random() * interleaveCandidates.length)]
  }
  return pool[Math.floor(Math.random() * pool.length)]
}
