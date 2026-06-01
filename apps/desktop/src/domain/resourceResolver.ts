import { loadSourcesConfig } from './configLoader'
import { resources as seedResources } from './seedData'
import type { MathPilotState, ResourceRecord, Skill } from './types'

const SOURCE_PREFIX: Array<{ prefix: string; source: string }> = [
  { prefix: 'ka-', source: 'Khan Academy' },
  { prefix: 'oct-', source: 'Organic Chemistry Tutor' },
  { prefix: '3b1b-', source: '3Blue1Brown' },
  { prefix: 'prof-leonard-', source: 'Professor Leonard' },
  { prefix: 'paul-', source: "Paul's Online Math Notes" },
  { prefix: 'mit-', source: 'MIT OpenCourseWare' },
  { prefix: 'patrick-', source: 'PatrickJMT' },
]

function inferSource(id: string): string {
  const match = SOURCE_PREFIX.find((entry) => id.startsWith(entry.prefix))
  return match?.source ?? 'Curated link'
}

function titleFromId(id: string): string {
  const stripped = id.replace(/^(ka|oct|3b1b|prof-leonard|paul|mit|patrick)-/, '')
  return stripped
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function stubResource(id: string, skillIds: string[]): ResourceRecord {
  const source = inferSource(id)
  return {
    id,
    title: titleFromId(id),
    source,
    url: `https://www.google.com/search?q=${encodeURIComponent(`${source} ${titleFromId(id)} calculus`)}`,
    skillIds,
    duration: '—',
    format: 'video',
    effectivenessScore: 0.55,
    notes: 'Linked from skill graph — effectiveness updates as you practice.',
  }
}

/** Merge seed catalog with skill-graph resource IDs so suggestions never reference orphans. */
export function buildResourceCatalog(skills: Record<string, Skill>): Record<string, ResourceRecord> {
  const catalog = Object.fromEntries(seedResources.map((resource) => [resource.id, { ...resource }]))

  for (const skill of Object.values(skills)) {
    for (const resourceId of skill.resources) {
      if (catalog[resourceId]) {
        if (!catalog[resourceId].skillIds.includes(skill.id)) {
          catalog[resourceId] = {
            ...catalog[resourceId],
            skillIds: [...catalog[resourceId].skillIds, skill.id],
          }
        }
        continue
      }
      catalog[resourceId] = stubResource(resourceId, [skill.id])
    }
  }

  return catalog
}

export function mergeResourceCatalog(state: MathPilotState): MathPilotState {
  const catalog = buildResourceCatalog(state.skills)
  const merged = { ...catalog, ...state.resources }
  for (const [id, resource] of Object.entries(state.resources)) {
    merged[id] = {
      ...catalog[id],
      ...resource,
      skillIds: [...new Set([...(catalog[id]?.skillIds ?? []), ...resource.skillIds])],
    }
  }
  return { ...state, resources: merged }
}

export async function listTrustedResources(state: MathPilotState): Promise<ResourceRecord[]> {
  const config = await loadSourcesConfig()
  const trusted = new Set(config.trustedSources.map((s) => s.toLowerCase()))
  return Object.values(state.resources)
    .filter((resource) => trusted.has(resource.source.toLowerCase()))
    .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
}

export function skillNamesForResource(state: MathPilotState, resource: ResourceRecord): string[] {
  return resource.skillIds
    .map((id) => state.skills[id]?.name)
    .filter(Boolean) as string[]
}
