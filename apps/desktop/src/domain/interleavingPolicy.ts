/** Similar-looking skill clusters for interleaved practice (spec §13.5). */
export const INTERLEAVE_CLUSTERS: Record<string, string[]> = {
  integration_techniques: [
    'u_substitution',
    'integration_by_parts',
    'trig_substitution',
    'partial_fractions',
  ],
  series_tests: ['series_intro', 'series_test_selection', 'ratio_test', 'comparison_tests'],
  derivative_rules: ['product_rule', 'quotient_rule', 'chain_rule', 'implicit_differentiation'],
  similar_looking_derivatives: ['chain_rule', 'related_rates', 'implicit_differentiation'],
  limits: ['limits_intro', 'continuity', 'lhopital'],
}

/** Same-area skills that look similar but use different procedures. */
export const AREA_PROCEDURE_VARIANTS: Record<string, string[]> = {
  Differentiation: ['chain_rule', 'product_rule', 'quotient_rule', 'implicit_differentiation', 'related_rates'],
  Integration: ['u_substitution', 'integration_by_parts', 'trig_substitution', 'partial_fractions'],
  Series: ['series_test_selection', 'ratio_test', 'comparison_tests', 'integral_test'],
  Limits: ['limits_intro', 'continuity', 'lhopital', 'squeeze_theorem'],
}

export function interleaveClusterForSkill(skillId: string): string[] | undefined {
  const similar = INTERLEAVE_CLUSTERS.similar_looking_derivatives
  if (similar.includes(skillId)) return similar.filter((id) => id !== skillId)
  for (const [name, members] of Object.entries(INTERLEAVE_CLUSTERS)) {
    if (name === 'similar_looking_derivatives') continue
    if (members.includes(skillId)) return members.filter((id) => id !== skillId)
  }
  return undefined
}

export function sameAreaDifferentProcedure(
  primarySkillId: string,
  skills: Record<string, { id: string; area: string; type: string }>,
  recentSkillIds: Set<string>,
): string[] {
  const primary = skills[primarySkillId]
  if (!primary) return []

  const areaVariants = AREA_PROCEDURE_VARIANTS[primary.area] ?? []
  const fromArea = Object.values(skills)
    .filter(
      (s) =>
        s.id !== primarySkillId &&
        s.area === primary.area &&
        s.type !== primary.type &&
        !recentSkillIds.has(s.id),
    )
    .map((s) => s.id)

  const cluster = interleaveClusterForSkill(primarySkillId) ?? []
  const merged = [...new Set([...areaVariants.filter((id) => id !== primarySkillId), ...cluster, ...fromArea])]
  return merged.filter((id) => id !== primarySkillId && !recentSkillIds.has(id))
}

/** Prefer cluster mates that look similar but require different setups (e.g. chain rule vs related rates). */
export function interleavePolicyForSkill(
  primarySkillId: string,
  recentSkillIds: Set<string>,
  skills?: Record<string, { id: string; area: string; type: string }>,
): { preferSkillIds: string[]; clusterName?: string } {
  if (skills) {
    const areaPrefer = sameAreaDifferentProcedure(primarySkillId, skills, recentSkillIds)
    if (areaPrefer.length) {
      return { preferSkillIds: areaPrefer, clusterName: skills[primarySkillId]?.area ?? 'area' }
    }
  }

  const similar = INTERLEAVE_CLUSTERS.similar_looking_derivatives
  if (similar.includes(primarySkillId)) {
    const preferSkillIds = similar.filter((id) => id !== primarySkillId && !recentSkillIds.has(id))
    if (preferSkillIds.length) {
      return { preferSkillIds, clusterName: 'similar_looking_derivatives' }
    }
    return {
      preferSkillIds: similar.filter((id) => id !== primarySkillId),
      clusterName: 'similar_looking_derivatives',
    }
  }

  for (const [clusterName, members] of Object.entries(INTERLEAVE_CLUSTERS)) {
    if (clusterName === 'similar_looking_derivatives') continue
    if (!members.includes(primarySkillId)) continue
    const preferSkillIds = members.filter((id) => id !== primarySkillId && !recentSkillIds.has(id))
    if (preferSkillIds.length) return { preferSkillIds, clusterName }
    return { preferSkillIds: members.filter((id) => id !== primarySkillId), clusterName }
  }
  return { preferSkillIds: [] }
}

export function shouldInterleaveSimilarSkills(primarySkillId: string): boolean {
  return Boolean(interleaveClusterForSkill(primarySkillId))
}
