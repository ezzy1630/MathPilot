import sourcesJson from '../../../config/sources.json'

export interface SourcesConfig {
  trustedSources: string[]
  policy: string
  dynamicSearch?: {
    provider: string
    urlTemplate: string
    trustedChannelHint?: string
  }
}

export interface ResourceRecord {
  id: string
  title: string
  source: string
  url: string
  skillIds: string[]
  duration: string
  format: 'video' | 'article' | 'notes'
  effectivenessScore: number
  notes: string
}

export interface ResourceEngineState {
  resources: Record<string, ResourceRecord>
}

export interface RankedResource extends ResourceRecord {
  rankScore: number
  trusted: boolean
}

export interface DynamicSearchResult {
  title: string
  url: string
  source: string
  provider: string
}

export interface EffectivenessDelta {
  resourceId: string
  previousScore: number
  nextScore: number
  reason: string
}

let cachedSources: SourcesConfig | null = null

export async function loadSourcesConfig(): Promise<SourcesConfig> {
  if (cachedSources) return cachedSources
  const raw = sourcesJson as SourcesConfig
  cachedSources = {
    trustedSources: raw.trustedSources ?? [],
    policy: raw.policy ?? 'Prefer trusted calculus sources.',
    dynamicSearch: raw.dynamicSearch ?? {
      provider: 'youtube',
      urlTemplate: 'https://www.youtube.com/results?search_query={query}',
    },
  }
  return cachedSources
}

export function clearSourcesConfigCache() {
  cachedSources = null
}

function isTrusted(source: string, config: SourcesConfig): boolean {
  const lower = source.toLowerCase()
  return config.trustedSources.some((name) => lower.includes(name.toLowerCase()))
}

/** Rank curated resources for a skill using effectiveness and trust policy. */
export function rankResourcesForSkill(
  state: ResourceEngineState,
  skillId: string,
  config?: SourcesConfig,
  limit = 5,
): RankedResource[] {
  const policy = config ?? cachedSources ?? (sourcesJson as SourcesConfig)
  return Object.values(state.resources)
    .filter((resource) => resource.skillIds.includes(skillId))
    .map((resource) => {
      const trusted = isTrusted(resource.source, policy)
      const trustBoost = trusted ? 0.08 : -0.04
      return {
        ...resource,
        trusted,
        rankScore: Math.min(0.99, Math.max(0.1, resource.effectivenessScore + trustBoost)),
      }
    })
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, limit)
}

/** Build YouTube (or configured) search URLs when curated catalog is thin. */
export async function dynamicSearchFallback(query: string): Promise<DynamicSearchResult[]> {
  const config = await loadSourcesConfig()
  const trimmed = query.trim()
  if (!trimmed) return []

  const template =
    config.dynamicSearch?.urlTemplate ??
    'https://www.youtube.com/results?search_query={query}'
  const encoded = encodeURIComponent(trimmed)
  const url = template.replace('{query}', encoded)

  const channelHint = config.trustedSources.slice(0, 3).join(' OR ')
  const refinedUrl = template.replace('{query}', encodeURIComponent(`${trimmed} ${channelHint}`.trim()))

  return [
    {
      title: `Search: ${trimmed}`,
      url,
      source: config.dynamicSearch?.provider ?? 'youtube',
      provider: config.dynamicSearch?.provider ?? 'youtube',
    },
    {
      title: `Trusted channels: ${trimmed}`,
      url: refinedUrl,
      source: 'Dynamic search (trusted bias)',
      provider: config.dynamicSearch?.provider ?? 'youtube',
    },
  ]
}

export interface ResourceSearchResult {
  id: string
  title: string
  url: string
  source: string
  rankScore: number
  trusted?: boolean
  dynamic?: boolean
  provider?: string
}

export interface SearchResourcesOptions {
  skillId?: string
  config?: SourcesConfig
  limit?: number
  minCuratedBeforeFallback?: number
}

function resourceMatchesQuery(resource: ResourceRecord, query: string): boolean {
  const q = query.toLowerCase()
  if (!q) return false
  return (
    resource.title.toLowerCase().includes(q) ||
    resource.source.toLowerCase().includes(q) ||
    resource.notes.toLowerCase().includes(q) ||
    resource.skillIds.some((id) => id.toLowerCase().includes(q))
  )
}

function rankAllMatchingResources(
  state: ResourceEngineState,
  query: string,
  config: SourcesConfig,
): RankedResource[] {
  return Object.values(state.resources)
    .filter((resource) => resourceMatchesQuery(resource, query))
    .map((resource) => {
      const trusted = isTrusted(resource.source, config)
      const trustBoost = trusted ? 0.08 : -0.04
      return {
        ...resource,
        trusted,
        rankScore: Math.min(0.99, Math.max(0.1, resource.effectivenessScore + trustBoost)),
      }
    })
    .sort((a, b) => b.rankScore - a.rankScore)
}

/** Rank curated catalog hits and append dynamic search when results are thin. */
export async function searchResources(
  query: string,
  state: ResourceEngineState,
  options: SearchResourcesOptions = {},
): Promise<ResourceSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const config = options.config ?? (await loadSourcesConfig())
  const limit = options.limit ?? 8
  const minCurated = options.minCuratedBeforeFallback ?? 2

  let curated: RankedResource[] = options.skillId
    ? rankResourcesForSkill(state, options.skillId, config, limit * 2).filter(
        (resource) => resourceMatchesQuery(resource, trimmed),
      )
    : rankAllMatchingResources(state, trimmed, config)

  if (options.skillId && curated.length === 0) {
    curated = rankResourcesForSkill(state, options.skillId, config, limit)
  }

  const results: ResourceSearchResult[] = curated.slice(0, limit).map((resource) => ({
    id: resource.id,
    title: resource.title,
    url: resource.url,
    source: resource.source,
    rankScore: resource.rankScore,
    trusted: resource.trusted,
    dynamic: false,
  }))

  if (results.length < minCurated) {
    const dynamic = await dynamicSearchFallback(trimmed)
    for (const hit of dynamic) {
      if (results.length >= limit) break
      results.push({
        id: `dynamic-${hit.provider}-${results.length}`,
        title: hit.title,
        url: hit.url,
        source: hit.source,
        rankScore: 0.22,
        dynamic: true,
        provider: hit.provider,
      })
    }
  }

  return results.slice(0, limit)
}

/** Apply post-resource attempt signal to effectiveness score (pure, no side effects). */
export function trackEffectiveness(
  state: ResourceEngineState,
  resourceId: string,
  signal: { correct: boolean; hintCount: number; afterResource?: boolean },
): { state: ResourceEngineState; delta: EffectivenessDelta | null } {
  const resource = state.resources[resourceId]
  if (!resource) return { state, delta: null }

  const baseDelta = signal.correct && signal.hintCount === 0 ? 0.03 : signal.correct ? 0.01 : -0.04
  const boost = signal.afterResource ? 0.01 : 0
  const nextScore = Math.min(0.95, Math.max(0.15, resource.effectivenessScore + baseDelta + boost))
  const reason =
    signal.correct && signal.hintCount === 0
      ? 'Strong post-resource attempt'
      : signal.correct
        ? 'Correct post-resource attempt with hints'
        : 'Post-resource attempt missed'

  return {
    state: {
      ...state,
      resources: {
        ...state.resources,
        [resourceId]: {
          ...resource,
          effectivenessScore: nextScore,
          notes: reason,
        },
      },
    },
    delta: {
      resourceId,
      previousScore: resource.effectivenessScore,
      nextScore,
      reason,
    },
  }
}
