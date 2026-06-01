import calc1Curated from '@config/problem_bank/calculus_1_curated.json'
import calc2Curated from '@config/problem_bank/calculus_2_curated.json'
import { SKILL_CATALOG } from './skillProblemCatalog'
import { SKILL_CATALOG_EXTENSION } from './skillProblemCatalogExtension'
import type { ActivityKind, CourseFocus, Problem } from './types'

interface CuratedFile {
  problems: Array<{
    id: string
    title: string
    prompt: string
    skillIds: string[]
    difficulty: number
    mode: ActivityKind
    answerType: Problem['answerType']
    expectedAnswer: string
    hintSequence?: string[]
    verificationStatus?: Problem['verificationStatus']
    requiresShowWork?: boolean
  }>
}

const MODES: ActivityKind[] = ['guided_practice', 'independent_practice', 'mixed_review']

function catalogToProblems(): Problem[] {
  const catalog = { ...SKILL_CATALOG, ...SKILL_CATALOG_EXTENSION }
  const out: Problem[] = []
  const seen = new Set<string>()

  for (const entry of Object.values(catalog)) {
    const specs = [...entry.diagnostics, ...entry.practice]
    specs.forEach((spec, specIndex) => {
      const baseMode = 'mode' in spec && spec.mode ? spec.mode : 'diagnostic'
      for (let variant = 0; variant < 3; variant += 1) {
        const mode =
          baseMode === 'diagnostic'
            ? 'diagnostic'
            : (MODES[variant % MODES.length] as ActivityKind)
        const id = `bank-${entry.skillId}-${specIndex}-v${variant}`
        if (seen.has(id)) continue
        seen.add(id)
        out.push({
          id,
          title: variant === 0 ? spec.title : `${spec.title} (variant ${variant + 1})`,
          prompt: spec.prompt,
          skillIds: [entry.skillId],
          difficulty: Math.min(0.95, spec.difficulty + variant * 0.02),
          mode,
          answerType: spec.answerType,
          expectedAnswer: spec.expectedAnswer,
          hintSequence: spec.hintSequence,
          verificationStatus: variant === 0 ? 'verified' : 'unverified_used',
          source: 'catalog_bank',
          requiresShowWork: spec.difficulty >= 0.45,
        })
      }
    })
  }
  return out
}

function curatedForCourse(course: CourseFocus): Problem[] {
  const file = (course === 'Calculus 2' ? calc2Curated : calc1Curated) as CuratedFile
  return file.problems.map((p) => ({
    ...p,
    hintSequence: p.hintSequence ?? [],
    verificationStatus: p.verificationStatus ?? 'verified',
    source: 'curated_json',
  }))
}

/** Production-scale bank: curated JSON + 3 variants per catalog spec per skill. */
export function loadProductionProblemBank(course: CourseFocus): Problem[] {
  const byId = new Map<string, Problem>()
  for (const problem of [...catalogToProblems(), ...curatedForCourse(course)]) {
    byId.set(problem.id, problem)
  }
  return [...byId.values()]
}

export function mergeProblemBank(
  existing: Record<string, Problem>,
  course: CourseFocus,
): Record<string, Problem> {
  const merged = { ...existing }
  for (const problem of loadProductionProblemBank(course)) {
    if (!merged[problem.id]) merged[problem.id] = problem
  }
  return merged
}
