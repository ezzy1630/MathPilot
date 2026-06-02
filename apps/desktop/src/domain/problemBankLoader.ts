import calc1Curated from '@config/problem_bank/calculus_1_curated.json'
import calc2Curated from '@config/problem_bank/calculus_2_curated.json'
import { getMergedSkillCatalog } from './mergedCatalog'
import { enrichProblemWithLatex, enrichProblems, enrichProblemsRecord } from '../lib/problemLatex'
import type { CourseFocus, Problem } from './types'

export type { CuratedBankProblem } from './problemBankExport'

interface CuratedFile {
  problems: Array<Record<string, unknown>>
}

function catalogToProblems(): Problem[] {
  const catalog = getMergedSkillCatalog()
  const out: Problem[] = []
  const seen = new Set<string>()

  for (const entry of Object.values(catalog)) {
    const specs = [...entry.diagnostics, ...entry.practice]
    const MODES = ['guided_practice', 'independent_practice', 'mixed_review'] as const
    specs.forEach((spec, specIndex) => {
      const baseMode = 'mode' in spec && spec.mode ? spec.mode : 'diagnostic'
      for (let variant = 0; variant < 3; variant += 1) {
        const alt =
          variant > 0 && entry.practice.length > 1
            ? entry.practice[(specIndex + variant) % entry.practice.length]
            : spec
        const mode =
          baseMode === 'diagnostic'
            ? 'diagnostic'
            : (MODES[variant % MODES.length] as Problem['mode'])
        const id = `bank-${entry.skillId}-${specIndex}-v${variant}`
        if (seen.has(id)) continue
        seen.add(id)
        out.push(
          enrichProblemWithLatex({
            id,
            title: variant === 0 ? alt.title : `${alt.title} (variant ${variant + 1})`,
            prompt: alt.prompt,
            promptLatex: alt.promptLatex,
            skillIds: [entry.skillId],
            difficulty: Math.min(0.95, alt.difficulty + variant * 0.02),
            mode,
            answerType: alt.answerType,
            expectedAnswer: alt.expectedAnswer,
            hintSequence: alt.hintSequence,
            hintSequenceLatex: alt.hintSequenceLatex,
            choices: alt.choices,
            choiceLatex: alt.choiceLatex,
            workedExample: alt.workedExample,
            workedExampleLatex: alt.workedExampleLatex,
            tags: alt.tags,
            verificationStatus: variant === 0 ? 'verified' : 'unverified_used',
            source: 'catalog_bank',
            requiresShowWork: alt.difficulty >= 0.45,
            attemptCount: 0,
            correctRate: 0,
          }),
        )
      }
    })
  }
  return out
}

function curatedForCourse(course: CourseFocus): Problem[] {
  const file = (course === 'Calculus 2' ? calc2Curated : calc1Curated) as CuratedFile
  return enrichProblems(
    file.problems.map((p) => ({
      ...(p as unknown as Problem),
      hintSequence: (p.hintSequence as string[]) ?? [],
      verificationStatus: (p.verificationStatus as Problem['verificationStatus']) ?? 'verified',
      source: (p.source as string) ?? 'curated_json',
      attemptCount: (p.attemptCount as number) ?? 0,
      correctRate: (p.correctRate as number) ?? 0,
    })),
  )
}

const productionBankCache: Partial<Record<CourseFocus, Problem[]>> = {}

/** Production-scale bank: curated JSON + catalog variants per skill. */
export function loadProductionProblemBank(course: CourseFocus): Problem[] {
  const cached = productionBankCache[course]
  if (cached) return cached

  const byId = new Map<string, Problem>()
  for (const problem of [...catalogToProblems(), ...curatedForCourse(course)]) {
    byId.set(problem.id, problem)
  }
  const bank = enrichProblems([...byId.values()])
  productionBankCache[course] = bank
  return bank
}

export function mergeProblemBank(
  existing: Record<string, Problem>,
  course: CourseFocus,
): Record<string, Problem> {
  const merged = { ...existing }
  for (const problem of loadProductionProblemBank(course)) {
    if (!merged[problem.id]) merged[problem.id] = enrichProblemWithLatex(problem)
  }
  return enrichProblemsRecord(merged)
}
