/**
 * Expand config/problem_bank/*_curated.json from the merged skill catalog.
 *
 * Usage (from repo root):
 *   npx tsx scripts/generate_problem_bank.ts
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { skillsForCourse } from '../apps/desktop/src/domain/courseGraph.ts'
import { SKILL_CATALOG } from '../apps/desktop/src/domain/skillProblemCatalog.ts'
import { promptToLatex } from '../apps/desktop/src/lib/promptToLatex.ts'
import type { ActivityKind, CourseFocus, Problem } from '../apps/desktop/src/domain/types.ts'

const MODES: ActivityKind[] = ['guided_practice', 'independent_practice', 'mixed_review']
const repoRoot = resolve(import.meta.dirname, '..')

function buildCuratedBankFromCatalog(course: CourseFocus) {
  const skillIds = new Set(skillsForCourse(course).map((skill) => skill.id))
  const prefix = course === 'Calculus 2' ? 'c2' : 'c1'
  const out: Array<{
    id: string
    title: string
    prompt: string
    promptLatex: string
    skillIds: string[]
    difficulty: number
    mode: ActivityKind
    answerType: Problem['answerType']
    expectedAnswer: string
    hintSequence: string[]
    verificationStatus: Problem['verificationStatus']
    requiresShowWork?: boolean
  }> = []

  for (const entry of Object.values(SKILL_CATALOG)) {
    if (!skillIds.has(entry.skillId)) continue
    const specs = [...entry.diagnostics, ...entry.practice]
    specs.forEach((spec, specIndex) => {
      const baseMode = 'mode' in spec && spec.mode ? spec.mode : 'diagnostic'
      for (let variant = 0; variant < 3; variant += 1) {
        const mode =
          baseMode === 'diagnostic'
            ? 'diagnostic'
            : (MODES[variant % MODES.length] as ActivityKind)
        out.push({
          id: `cur-${prefix}-${entry.skillId}-${specIndex}-v${variant}`,
          title: variant === 0 ? spec.title : `${spec.title} (v${variant + 1})`,
          prompt: spec.prompt,
          promptLatex: spec.promptLatex ?? promptToLatex(spec.prompt),
          skillIds: [entry.skillId],
          difficulty: Math.min(0.8, Math.max(0.2, spec.difficulty + variant * 0.04)),
          mode,
          answerType: spec.answerType,
          expectedAnswer: spec.expectedAnswer,
          hintSequence: spec.hintSequence,
          verificationStatus: variant === 0 ? 'verified' : 'unverified_used',
          requiresShowWork: spec.difficulty >= 0.42,
        })
      }
    })
  }

  return out
}

function writeCurated(course: CourseFocus, filename: string) {
  const problems = buildCuratedBankFromCatalog(course)
  const payload = {
    generatedAt: new Date().toISOString(),
    course,
    count: problems.length,
    problems,
  }
  const outPath = resolve(repoRoot, 'config/problem_bank', filename)
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${problems.length} problems → ${outPath}`)
}

writeCurated('Calculus 1', 'calculus_1_curated.json')
writeCurated('Calculus 2', 'calculus_2_curated.json')
