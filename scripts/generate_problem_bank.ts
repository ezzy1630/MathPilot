/**
 * Expand config/problem_bank/*_curated.json from the merged skill catalog.
 *
 * Usage (from repo root):
 *   npx tsx scripts/generate_problem_bank.ts
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildCuratedBankPayload } from '../apps/desktop/src/domain/problemBankExport.ts'
import type { CourseFocus } from '../apps/desktop/src/domain/types.ts'

const repoRoot = resolve(import.meta.dirname, '..')

function writeCurated(course: CourseFocus, filename: string) {
  const payload = buildCuratedBankPayload(course)
  const outPath = resolve(repoRoot, 'config/problem_bank', filename)
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${payload.count} problems → ${outPath}`)
}

writeCurated('Calculus 1', 'calculus_1_curated.json')
writeCurated('Calculus 2', 'calculus_2_curated.json')
