import { describe, expect, it } from 'vitest'
import {
  dynamicSearchFallback,
  loadSourcesConfig,
  rankResourcesForSkill,
  searchResources,
  trackEffectiveness,
  type ResourceEngineState,
  type ResourceRecord,
} from './resourceEngine'

function sampleState(): ResourceEngineState {
  const resources: Record<string, ResourceRecord> = {
    'ka-chain': {
      id: 'ka-chain',
      title: 'Chain rule intro',
      source: 'Khan Academy',
      url: 'https://example.com/chain',
      skillIds: ['chain_rule'],
      duration: '12m',
      format: 'video',
      effectivenessScore: 0.72,
      notes: 'Trusted chain rule walkthrough',
    },
    'oct-limits': {
      id: 'oct-limits',
      title: 'Limits intuition',
      source: 'Organic Chemistry Tutor',
      url: 'https://example.com/limits',
      skillIds: ['limits_intro'],
      duration: '18m',
      format: 'video',
      effectivenessScore: 0.68,
      notes: 'Limits overview',
    },
  }
  return { resources }
}

describe('resourceEngine', () => {
  it('loads sources config with dynamic search policy', async () => {
    const config = await loadSourcesConfig()
    expect(config.trustedSources.length).toBeGreaterThan(3)
    expect(config.dynamicSearch?.urlTemplate).toContain('youtube.com')
  })

  it('ranks resources for a skill by effectiveness and trust', () => {
    const ranked = rankResourcesForSkill(sampleState(), 'chain_rule', undefined, 3)
    expect(ranked.length).toBe(1)
    expect(ranked[0].rankScore).toBeGreaterThan(0.7)
    expect(ranked[0].trusted).toBe(true)
  })

  it('returns YouTube search URLs from dynamicSearchFallback', async () => {
    const results = await dynamicSearchFallback('chain rule derivative')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].url).toContain('youtube.com/results')
  })

  it('searchResources combines ranked catalog hits with dynamic fallback', async () => {
    const sparse = searchResources('obscure topic xyz', sampleState(), {
      limit: 4,
      minCuratedBeforeFallback: 1,
    })
    const hits = await sparse
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some((hit) => hit.dynamic)).toBe(true)
  })

  it('searchResources returns curated matches when catalog fits query', async () => {
    const hits = await searchResources('chain rule', sampleState(), { limit: 4 })
    expect(hits.some((hit) => hit.id === 'ka-chain' && !hit.dynamic)).toBe(true)
  })

  it('tracks effectiveness after post-resource attempts', () => {
    const state = sampleState()
    const resourceId = 'ka-chain'
    const { state: next, delta } = trackEffectiveness(state, resourceId, {
      correct: true,
      hintCount: 0,
      afterResource: true,
    })
    expect(delta?.nextScore).toBeGreaterThan(delta?.previousScore ?? 0)
    expect(next.resources[resourceId].effectivenessScore).toBeGreaterThan(
      state.resources[resourceId].effectivenessScore,
    )
  })
})
