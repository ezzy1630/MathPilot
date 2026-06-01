/** Similar-looking skill clusters for interleaved practice (spec §6 / interleaving). */
export const INTERLEAVE_CLUSTERS: Record<string, string[]> = {
  integration_techniques: [
    'u_substitution',
    'integration_by_parts',
    'trig_substitution',
    'partial_fractions',
  ],
  series_tests: ['series_intro', 'series_test_selection', 'ratio_test', 'comparison_test'],
  derivative_rules: ['product_rule', 'quotient_rule', 'chain_rule', 'implicit_differentiation'],
  limits: ['limits_intro', 'continuity', 'lhopital'],
}

export function interleaveClusterForSkill(skillId: string): string[] | undefined {
  for (const members of Object.values(INTERLEAVE_CLUSTERS)) {
    if (members.includes(skillId)) return members.filter((id) => id !== skillId)
  }
  return undefined
}
