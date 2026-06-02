import { beforeEach, describe, expect, it } from 'vitest'
import { enrichCatalogEntry, enrichHintSequence, misconceptionTags } from './catalogEnrichment'
import { SKILL_CATALOG } from './skillProblemCatalog'
import { MIN_PRACTICE_PER_SKILL } from './catalogVariants'
import { getMergedSkillCatalog, resetMergedCatalogCache, skillIdsForProblemBank } from './mergedCatalog'
import { buildCuratedBankFromCatalog } from './problemBankExport'
import { auditProblemBankQuality } from './problemBankQuality'
import { interleaveClusterForSkill } from './interleavingPolicy'

describe('catalogEnrichment', () => {
  it('enriches catalog entries through enrichCatalogEntry', () => {
    const enriched = enrichCatalogEntry(SKILL_CATALOG.algebra_manipulation, {
      id: 'algebra_manipulation',
      commonMistakes: ['sign errors'],
      type: 'procedural',
      area: 'Prerequisite Readiness',
    })
    expect(enriched.diagnostics[0].hintSequence.length).toBeGreaterThanOrEqual(3)
  })

  it('builds three-step hints from common mistakes', () => {
    const hints = enrichHintSequence(
      { title: 't', prompt: 'p', expectedAnswer: '1', answerType: 'expression', difficulty: 0.3, hintSequence: [] },
      { id: 'chain_rule', commonMistakes: ['forgets inner derivative'], type: 'mixed', area: 'Derivatives' },
    )
    expect(hints.length).toBeGreaterThanOrEqual(3)
  })

  it('adds misconception tags', () => {
    const tags = misconceptionTags('chain_rule', ['forgets inner derivative'])
    expect(tags[0]).toContain('chain_rule')
  })
})

describe('mergedCatalog', () => {
  beforeEach(() => {
    resetMergedCatalogCache()
  })

  it('enriches algebra_manipulation in merged catalog', () => {
    const entry = getMergedSkillCatalog().algebra_manipulation
    expect(entry.diagnostics[0].hintSequence.length).toBeGreaterThanOrEqual(3)
    expect(entry.practice.length).toBeGreaterThanOrEqual(MIN_PRACTICE_PER_SKILL)
  })

  it('expands every skill to minimum practice depth', () => {
    const catalog = getMergedSkillCatalog()
    for (const entry of Object.values(catalog)) {
      expect(entry.practice.length, entry.skillId).toBeGreaterThanOrEqual(MIN_PRACTICE_PER_SKILL)
      for (const spec of [...entry.diagnostics, ...entry.practice]) {
        expect(spec.hintSequence.length, entry.skillId).toBeGreaterThanOrEqual(3)
        expect(spec.workedExample?.length, entry.skillId).toBeGreaterThan(0)
        expect(spec.tags?.length, entry.skillId).toBeGreaterThan(0)
      }
    }
  })

  it('excludes Calc 2-only extension skills from Calculus 1 bank export', () => {
    const c1 = skillIdsForProblemBank('Calculus 1')
    expect(c1.has('partial_fractions')).toBe(false)
    expect(c1.has('chain_rule')).toBe(true)
  })
})

describe('problemBankExport', () => {
  beforeEach(() => {
    resetMergedCatalogCache()
  })

  it('exports distinct prompts and metadata for Calc 1', () => {
    const problems = buildCuratedBankFromCatalog('Calculus 1')
    const quality = auditProblemBankQuality(
      problems.map((p) => ({
        ...p,
        hintSequence: p.hintSequence ?? [],
        deprecated: false,
      })),
    )
    expect(problems.length).toBeGreaterThan(150)
    expect(quality.uniquePrompts / quality.total).toBeGreaterThan(0.85)
    expect(problems.every((p) => (p.tags?.length ?? 0) > 0)).toBe(true)
    expect(problems.every((p) => (p.workedExample?.length ?? 0) > 0)).toBe(true)
    expect(problems.every((p) => (p.hintSequence?.length ?? 0) >= 3)).toBe(true)
  })

  it('generates prompt latex from each parametric variant prompt', () => {
    const problems = buildCuratedBankFromCatalog('Calculus 1')
    const variant = problems.find((p) => p.id.endsWith('-v1') && p.prompt !== p.title)
    expect(variant).toBeTruthy()
    expect(variant?.promptLatex).toBeTruthy()
    expect(variant?.promptLatex).not.toBe(
      problems.find((p) => p.id === variant?.id.replace('-v1', '-v0'))?.promptLatex,
    )
  })
})

describe('interleavingPolicy', () => {
  it('includes comparison_tests in series cluster', () => {
    const cluster = interleaveClusterForSkill('comparison_tests')
    expect(cluster).toContain('ratio_test')
  })
})
