import { describe, expect, it } from 'vitest'
import {
  dynamicSearchFallback,
  loadSourcesConfig,
  rankResourcesForSkill,
  trackEffectiveness,
} from '@mathpilot/content-engine'
import { createInitialState } from './learningEngine'

describe('content-engine resourceEngine', () => {
  it('loads sources config with dynamic search policy', async () => {
    const config = await loadSourcesConfig()
    expect(config.trustedSources.length).toBeGreaterThan(3)
    expect(config.dynamicSearch?.urlTemplate).toContain('youtube.com')
  })

  it('ranks resources for a skill by effectiveness and trust', () => {
    const state = createInitialState('Calculus 1')
    const ranked = rankResourcesForSkill(state, 'chain_rule', undefined, 3)
    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked[0].rankScore).toBeGreaterThan(0)
  })

  it('returns YouTube search URLs from dynamicSearchFallback', async () => {
    const results = await dynamicSearchFallback('chain rule derivative')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].url).toContain('youtube.com/results')
  })

  it('tracks effectiveness after post-resource attempts', () => {
    const state = createInitialState('Calculus 1')
    const resourceId = Object.keys(state.resources)[0]
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
