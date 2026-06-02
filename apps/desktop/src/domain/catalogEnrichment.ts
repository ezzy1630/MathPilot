import type { ProblemSpec, PracticeSpec, SkillCatalogEntry } from './skillProblemCatalog'

export interface SkillMetaForEnrichment {
  id: string
  commonMistakes: string[]
  type: 'procedural' | 'conceptual' | 'mixed'
  area: string
}

function slugMistake(mistake: string): string {
  return mistake
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48)
}

export function misconceptionTags(skillId: string, commonMistakes: string[]): string[] {
  return commonMistakes.slice(0, 3).map((m) => `misconception:${skillId}:${slugMistake(m)}`)
}

export function enrichHintSequence(
  spec: ProblemSpec,
  meta: SkillMetaForEnrichment,
): string[] {
  const existing = spec.hintSequence.filter(Boolean)
  if (existing.length >= 3) return existing

  const mistakes = meta.commonMistakes.slice(0, 2)
  const setup =
    existing[0] ??
    (meta.type === 'conceptual'
      ? 'State the definition or condition that applies.'
      : 'Identify the structure of the problem before computing.')
  const method =
    existing[1] ??
    (mistakes[0]
      ? `Watch for: ${mistakes[0]}.`
      : 'Choose the method that matches the expression form.')
  const algebra =
    existing[2] ??
    (mistakes[1]
      ? `Common slip: ${mistakes[1]}. Re-check signs and notation.`
      : 'Verify the final form matches what the prompt asked for (variable, units, +C).')

  return [setup, method, algebra]
}

export function enrichTags(spec: ProblemSpec, meta: SkillMetaForEnrichment): string[] {
  const base = spec.tags ?? []
  const generated = misconceptionTags(meta.id, meta.commonMistakes)
  return [...new Set([...base, ...generated, `skill:${meta.id}`])]
}

function inferWorkedExampleSteps(spec: ProblemSpec, meta: SkillMetaForEnrichment): string[] {
  if (spec.workedExample?.length) return spec.workedExample

  const prompt = spec.prompt.toLowerCase()
  if (/differentiate|derivative|d\/dx/.test(prompt)) {
    return [
      'Identify outer and inner structure (if composed).',
      'Apply the relevant rule term by term.',
      `Check: ${meta.commonMistakes[0] ?? 'sign and chain factors'}.`,
      `Target form: ${spec.expectedAnswer}.`,
    ]
  }
  if (/integrate|∫|antiderivative/.test(prompt)) {
    return [
      'Choose u or technique (substitution, parts, etc.).',
      'Transform the integral completely before integrating.',
      meta.commonMistakes[0] ? `Avoid: ${meta.commonMistakes[0]}.` : 'Include +C when asked.',
      `Antiderivative: ${spec.expectedAnswer}.`,
    ]
  }
  if (/lim|limit/.test(prompt)) {
    return [
      'Substitute if continuous; otherwise factor or use algebra.',
      'Track one-sided direction if the prompt specifies it.',
      `Limit value: ${spec.expectedAnswer}.`,
    ]
  }
  if (/series|∑|sum/.test(prompt)) {
    return [
      'Match the term form to a standard test or template.',
      meta.commonMistakes[0] ? `Watch: ${meta.commonMistakes[0]}.` : 'Check convergence conditions.',
      `Conclusion: ${spec.expectedAnswer}.`,
    ]
  }
  return [
    `Goal: ${spec.title}.`,
    setupLineForSpec(spec, meta),
    `Expected: ${spec.expectedAnswer}.`,
  ]
}

function setupLineForSpec(_spec: ProblemSpec, meta: SkillMetaForEnrichment): string {
  if (meta.type === 'conceptual') return 'Explain the idea in words before symbols.'
  return meta.commonMistakes[0] ? `First check: ${meta.commonMistakes[0]}.` : 'Write the setup line before simplifying.'
}

export function enrichProblemSpec(spec: ProblemSpec, meta: SkillMetaForEnrichment): ProblemSpec {
  return {
    ...spec,
    hintSequence: enrichHintSequence(spec, meta),
    tags: enrichTags(spec, meta),
    workedExample: inferWorkedExampleSteps(spec, meta),
  }
}

export function enrichPracticeSpec(spec: PracticeSpec, meta: SkillMetaForEnrichment): PracticeSpec {
  return {
    ...enrichProblemSpec(spec, meta),
    mode: spec.mode,
  }
}

export function enrichCatalogEntry(
  entry: SkillCatalogEntry,
  meta: SkillMetaForEnrichment,
): SkillCatalogEntry {
  return {
    ...entry,
    diagnostics: entry.diagnostics.map((s) => enrichProblemSpec(s, meta)),
    practice: entry.practice.map((s) => enrichPracticeSpec(s, meta)),
  }
}
