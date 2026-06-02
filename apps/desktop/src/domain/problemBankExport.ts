import { parametricBankVariant } from './catalogVariants'
import { getMergedSkillCatalog, skillIdsForProblemBank } from './mergedCatalog'
import { promptToLatex } from '../lib/promptToLatex'
import type { ActivityKind, CourseFocus, Problem } from './types'
import type { SkillCatalogEntry } from './skillProblemCatalog'

const MODES: ActivityKind[] = ['guided_practice', 'independent_practice', 'mixed_review']

export interface CuratedBankProblem {
  id: string
  title: string
  prompt: string
  promptLatex?: string
  skillIds: string[]
  difficulty: number
  mode: ActivityKind
  answerType: Problem['answerType']
  expectedAnswer: string
  hintSequence?: string[]
  hintSequenceLatex?: string[]
  choiceLatex?: string[]
  workedExample?: string[]
  workedExampleLatex?: string[]
  choices?: string[]
  tags?: string[]
  verificationStatus?: Problem['verificationStatus']
  requiresShowWork?: boolean
  source?: string
  attemptCount?: number
  correctRate?: number
}

export interface CuratedBankPayload {
  generatedAt: string
  course: CourseFocus
  count: number
  problems: CuratedBankProblem[]
}

function specsForEntry(entry: SkillCatalogEntry) {
  return [...entry.diagnostics, ...entry.practice]
}

export function buildCuratedBankFromCatalog(course: CourseFocus): CuratedBankProblem[] {
  const allowed = skillIdsForProblemBank(course)
  const catalog = getMergedSkillCatalog()
  const prefix = course === 'Calculus 2' ? 'c2' : 'c1'
  const out: CuratedBankProblem[] = []
  const seenPrompts = new Set<string>()

  for (const entry of Object.values(catalog)) {
    if (!allowed.has(entry.skillId)) continue
    const specs = specsForEntry(entry)

    const practiceOnly = entry.practice

    specs.forEach((spec, specIndex) => {
      const baseMode = 'mode' in spec && spec.mode ? spec.mode : 'diagnostic'
      for (let variant = 0; variant < 3; variant += 1) {
        const altPractice =
          variant > 0 && practiceOnly.length > 1
            ? practiceOnly[(specIndex + variant) % practiceOnly.length]
            : spec
        const parametric = parametricBankVariant(
          {
            prompt: altPractice.prompt,
            expectedAnswer: altPractice.expectedAnswer,
            title: altPractice.title,
            difficulty: altPractice.difficulty,
          },
          entry.skillId,
          variant,
        )
        const promptKey = parametric.prompt.trim().toLowerCase()
        if (seenPrompts.has(promptKey)) continue
        seenPrompts.add(promptKey)

        const mode =
          baseMode === 'diagnostic'
            ? 'diagnostic'
            : (MODES[variant % MODES.length] as ActivityKind)

        out.push({
          id: `cur-${prefix}-${entry.skillId}-${specIndex}-v${variant}`,
          title: variant === 0 ? parametric.title : `${parametric.title} (v${variant + 1})`,
          prompt: parametric.prompt,
          promptLatex: promptToLatex(parametric.prompt),
          skillIds: [entry.skillId],
          difficulty: Math.min(0.8, Math.max(0.2, parametric.difficulty + variant * 0.02)),
          mode,
          answerType: spec.answerType,
          expectedAnswer: parametric.expectedAnswer,
          hintSequence: altPractice.hintSequence,
          hintSequenceLatex: altPractice.hintSequenceLatex,
          choices: altPractice.choices,
          choiceLatex: altPractice.choiceLatex,
          workedExample: altPractice.workedExample,
          workedExampleLatex: altPractice.workedExampleLatex,
          tags: altPractice.tags,
          verificationStatus: variant === 0 ? 'verified' : 'unverified_used',
          requiresShowWork: spec.difficulty >= 0.42,
          source: 'curated_json',
          attemptCount: 0,
          correctRate: 0,
        })
      }
    })
  }

  return out
}

export function buildCuratedBankPayload(course: CourseFocus): CuratedBankPayload {
  const problems = buildCuratedBankFromCatalog(course)
  return {
    generatedAt: new Date().toISOString(),
    course,
    count: problems.length,
    problems,
  }
}
