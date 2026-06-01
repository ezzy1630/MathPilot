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

const RESOURCE_FORMATS = new Set<ResourceRecord['format']>(['video', 'article', 'notes'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateResourceRecord(raw: unknown, index?: number): { resource?: ResourceRecord; error?: string } {
  const label = index === undefined ? 'Resource' : `Resource[${index}]`
  if (!isRecord(raw)) {
    return { error: `${label}: expected an object.` }
  }

  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  const source = typeof raw.source === 'string' ? raw.source.trim() : ''
  const url = typeof raw.url === 'string' ? raw.url.trim() : ''
  const duration = typeof raw.duration === 'string' ? raw.duration.trim() : ''
  const notes = typeof raw.notes === 'string' ? raw.notes.trim() : ''
  const format = raw.format
  const effectivenessScore = raw.effectivenessScore
  const skillIds = raw.skillIds

  if (!id) return { error: `${label}: missing id.` }
  if (!title) return { error: `${label}: missing title.` }
  if (!source) return { error: `${label}: missing source.` }
  if (!url) return { error: `${label}: missing url.` }
  if (typeof format !== 'string' || !RESOURCE_FORMATS.has(format as ResourceRecord['format'])) {
    return { error: `${label}: format must be video, article, or notes.` }
  }
  if (typeof effectivenessScore !== 'number' || Number.isNaN(effectivenessScore)) {
    return { error: `${label}: effectivenessScore must be a number.` }
  }
  if (!Array.isArray(skillIds) || skillIds.some((skillId) => typeof skillId !== 'string' || !skillId.trim())) {
    return { error: `${label}: skillIds must be a string array.` }
  }

  return {
    resource: {
      id,
      title,
      source,
      url,
      skillIds: skillIds.map((skillId) => skillId.trim()),
      duration: duration || '—',
      format: format as ResourceRecord['format'],
      effectivenessScore,
      notes,
    },
  }
}

export function parseResourceImport(json: string): { resources: ResourceRecord[]; errors: string[] } {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { resources: [], errors: ['Invalid JSON — paste an array of resource objects.'] }
  }
  if (!Array.isArray(parsed)) {
    return { resources: [], errors: ['Expected a JSON array of resources.'] }
  }

  const resources: ResourceRecord[] = []
  const errors: string[] = []
  parsed.forEach((entry, index) => {
    const result = validateResourceRecord(entry, index)
    if (result.error) errors.push(result.error)
    else if (result.resource) resources.push(result.resource)
  })
  return { resources, errors }
}

export function mergeImportedResources(state: MathPilotState, resources: ResourceRecord[]): MathPilotState {
  const merged = { ...state.resources }
  for (const resource of resources) {
    const existing = merged[resource.id]
    merged[resource.id] = existing
      ? {
          ...existing,
          ...resource,
          skillIds: [...new Set([...existing.skillIds, ...resource.skillIds])],
        }
      : resource
  }
  return {
    ...state,
    resources: merged,
    changelog: [
      `${new Date().toISOString()}: Imported ${resources.length} resource${resources.length === 1 ? '' : 's'}.`,
      ...state.changelog,
    ],
  }
}
