import { SKILL_CATALOG } from './skillProblemCatalog'
import type { Problem } from './types'

export function diagnosticProblemForSkill(skillId: string, variant: number): Problem | null {
  const entry = SKILL_CATALOG[skillId]
  if (!entry?.diagnostics.length) return null

  const spec = entry.diagnostics[variant % entry.diagnostics.length]
  return {
    id: `diag-skill-${skillId}-v${variant}`,
    title: spec.title,
    prompt: spec.prompt,
    skillIds: [skillId],
    difficulty: spec.difficulty,
    answerType: spec.answerType,
    expectedAnswer: spec.expectedAnswer,
    hintSequence: spec.hintSequence,
    mode: 'diagnostic',
    verificationStatus: 'verified',
    source: 'diagnostic_template',
    tags: spec.tags,
  }
}

export function expandDiagnosticProblemsForSkills(skillIds: string[]): Problem[] {
  const out: Problem[] = []
  for (const skillId of skillIds) {
    const entry = SKILL_CATALOG[skillId]
    const variantCount = entry?.diagnostics.length ?? 0
    const count = Math.max(variantCount, 1)
    for (let v = 0; v < Math.min(count, 2); v += 1) {
      const p = diagnosticProblemForSkill(skillId, v)
      if (p) out.push(p)
    }
  }
  return out
}
