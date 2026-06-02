import type { Problem } from './types'

export interface DuplicatePromptGroup {
  prompt: string
  problemIds: string[]
}

export interface ProblemBankQualityReport {
  total: number
  uniquePrompts: number
  exactDuplicateGroups: DuplicatePromptGroup[]
  nearDuplicatePairs: Array<{ a: string; b: string; similarity: number }>
  missingTags: number
  missingWorkedExamples: number
  singleHintOnly: number
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, ' ')
}

function jaccard(a: string, b: string): number {
  const sa = new Set(a.split(/\W+/).filter(Boolean))
  const sb = new Set(b.split(/\W+/).filter(Boolean))
  const inter = [...sa].filter((w) => sb.has(w)).length
  const union = new Set([...sa, ...sb]).size
  return union === 0 ? 0 : inter / union
}

export function auditProblemBankQuality(problems: Problem[]): ProblemBankQualityReport {
  const active = problems.filter((p) => !p.deprecated)
  const byPrompt = new Map<string, string[]>()

  let missingTags = 0
  let missingWorkedExamples = 0
  let singleHintOnly = 0

  for (const p of active) {
    const key = normalizePrompt(p.prompt)
    byPrompt.set(key, [...(byPrompt.get(key) ?? []), p.id])
    if (!p.tags?.length) missingTags += 1
    if (!p.workedExample?.length) missingWorkedExamples += 1
    if ((p.hintSequence?.length ?? 0) <= 1) singleHintOnly += 1
  }

  const exactDuplicateGroups: DuplicatePromptGroup[] = []
  for (const [prompt, problemIds] of byPrompt.entries()) {
    if (problemIds.length > 1) exactDuplicateGroups.push({ prompt, problemIds })
  }

  const prompts = [...byPrompt.keys()]
  const nearDuplicatePairs: ProblemBankQualityReport['nearDuplicatePairs'] = []
  for (let i = 0; i < prompts.length; i += 1) {
    for (let j = i + 1; j < prompts.length; j += 1) {
      const sim = jaccard(prompts[i], prompts[j])
      if (sim >= 0.88 && sim < 1) {
        nearDuplicatePairs.push({
          a: byPrompt.get(prompts[i])![0],
          b: byPrompt.get(prompts[j])![0],
          similarity: sim,
        })
      }
    }
  }

  return {
    total: active.length,
    uniquePrompts: byPrompt.size,
    exactDuplicateGroups,
    nearDuplicatePairs,
    missingTags,
    missingWorkedExamples,
    singleHintOnly,
  }
}

export function formatProblemBankQualityWarnings(report: ProblemBankQualityReport): string[] {
  const warnings: string[] = []
  if (report.exactDuplicateGroups.length) {
    warnings.push(
      `Problem bank: ${report.exactDuplicateGroups.length} duplicate prompt group(s); ${report.total - report.uniquePrompts} redundant records.`,
    )
  }
  if (report.nearDuplicatePairs.length > 5) {
    warnings.push(`Problem bank: ${report.nearDuplicatePairs.length} near-duplicate prompt pairs detected.`)
  }
  if (report.missingTags > report.total * 0.5) {
    warnings.push(`Problem bank: ${report.missingTags}/${report.total} problems missing misconception tags.`)
  }
  if (report.missingWorkedExamples > report.total * 0.7) {
    warnings.push(`Problem bank: ${report.missingWorkedExamples}/${report.total} problems missing worked examples.`)
  }
  return warnings
}
