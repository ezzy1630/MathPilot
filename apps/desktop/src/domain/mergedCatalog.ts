import calc1Graph from '../../../../config/course_graphs/calculus_1.json'
import calc2Graph from '../../../../config/course_graphs/calculus_2.json'
import skillsExtension from '../../../../config/course_graphs/skills_extension.json'
import { enrichCatalogEntry } from './catalogEnrichment'
import { expandPracticePool, MIN_PRACTICE_PER_SKILL } from './catalogVariants'
import { SKILL_CATALOG } from './skillProblemCatalog'
import { SKILL_CATALOG_EXTENSION } from './skillProblemCatalogExtension'
import type { CourseFocus, Skill } from './types'
import type { SkillCatalogEntry } from './skillProblemCatalog'

interface GraphSkill {
  id: string
  name: string
  area: string
  course: string
  type: 'procedural' | 'conceptual' | 'mixed'
  commonMistakes: string[]
}

function rawCatalogEntries() {
  return { ...SKILL_CATALOG, ...SKILL_CATALOG_EXTENSION }
}

function allGraphSkills(): GraphSkill[] {
  const ids = new Set<string>()
  const out: GraphSkill[] = []
  for (const file of [calc1Graph, calc2Graph, skillsExtension as { skills: GraphSkill[] }]) {
    for (const skill of file.skills as GraphSkill[]) {
      if (ids.has(skill.id)) continue
      ids.add(skill.id)
      out.push(skill)
    }
  }
  return out
}

const GRAPH_BY_ID = Object.fromEntries(allGraphSkills().map((s) => [s.id, s]))

let mergedCache: Record<string, SkillCatalogEntry> | null = null

function catalogEntryLooksEnriched(entry: SkillCatalogEntry): boolean {
  if (entry.practice.length < MIN_PRACTICE_PER_SKILL) return false
  const specs = [...entry.diagnostics, ...entry.practice]
  return specs.every(
    (spec) =>
      (spec.hintSequence?.length ?? 0) >= 3 &&
      (spec.tags?.length ?? 0) > 0 &&
      (spec.workedExample?.length ?? 0) > 0,
  )
}

function buildMergedCatalog(): Record<string, SkillCatalogEntry> {
  const next: Record<string, SkillCatalogEntry> = {}
  for (const [skillId, entry] of Object.entries(rawCatalogEntries())) {
    const meta = GRAPH_BY_ID[skillId]
    const enriched = enrichCatalogEntry(entry, {
      id: skillId,
      commonMistakes: meta?.commonMistakes ?? [],
      type: meta?.type ?? 'mixed',
      area: meta?.area ?? 'General',
    })
    next[skillId] = {
      ...enriched,
      practice: expandPracticePool(enriched, {
        id: skillId,
        commonMistakes: meta?.commonMistakes ?? [],
        type: meta?.type ?? 'mixed',
        area: meta?.area ?? 'General',
      }),
    }
  }
  return next
}

export function getMergedSkillCatalog(): Record<string, SkillCatalogEntry> {
  if (mergedCache && Object.values(mergedCache).every(catalogEntryLooksEnriched)) {
    return mergedCache
  }
  mergedCache = buildMergedCatalog()
  return mergedCache
}

export function mergedCatalogEntry(skillId: string): SkillCatalogEntry | undefined {
  return getMergedSkillCatalog()[skillId]
}

export function skillCourseMap(): Record<string, Skill['course']> {
  const map: Record<string, Skill['course']> = {}
  for (const skill of allGraphSkills()) {
    map[skill.id] =
      skill.course === 'Prerequisite'
        ? 'Prerequisite'
        : skill.course === 'Calculus 2'
          ? 'Calculus 2'
          : 'Calculus 1'
  }
  return map
}

/** Skills eligible for a course-specific problem bank export (no Calc 2 leakage in Calc 1). */
export function skillIdsForProblemBank(focus: CourseFocus): Set<string> {
  const courses = skillCourseMap()
  const ids = new Set<string>()

  if (focus === 'Calculus 1') {
    for (const [id, course] of Object.entries(courses)) {
      if (course === 'Calculus 1' || course === 'Prerequisite') ids.add(id)
    }
    for (const skill of calc1Graph.skills) ids.add(skill.id)
    return ids
  }

  for (const skill of [...calc2Graph.skills, ...calc1Graph.skills, ...(skillsExtension as { skills: GraphSkill[] }).skills]) {
    const course = courses[skill.id]
    if (course === 'Calculus 2' || course === 'Prerequisite' || course === 'Calculus 1') {
      ids.add(skill.id)
    }
  }
  return ids
}

export function catalogSkillIdsMerged(): string[] {
  return Object.keys(getMergedSkillCatalog())
}

export function hasMergedCatalogEntry(skillId: string): boolean {
  return skillId in getMergedSkillCatalog()
}

/** Test helper — bust memoized catalog. */
export function resetMergedCatalogCache(): void {
  mergedCache = null
}
