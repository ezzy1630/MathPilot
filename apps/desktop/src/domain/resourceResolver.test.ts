import { describe, expect, it } from 'vitest'
import { createInitialState } from './learningEngine'
import { buildResourceCatalog, listTrustedResources, skillNamesForResource } from './resourceResolver'

describe('resourceResolver', () => {
  it('fills orphan skill resource IDs from the graph', () => {
    const state = createInitialState('Calculus 1')
    const catalog = buildResourceCatalog(state.skills)
    expect(catalog['ka-composition']).toBeTruthy()
    expect(catalog['ka-composition'].source).toBe('Khan Academy')
    expect(catalog['ka-composition'].skillIds).toContain('function_composition')
  })

  it('filters to trusted sources only', async () => {
    const state = createInitialState('Calculus 1')
    const trusted = await listTrustedResources(state)
    expect(trusted.length).toBeGreaterThan(4)
    expect(trusted.every((r) => r.source !== 'Curated link' || r.id.startsWith('ka-'))).toBe(true)
  })

  it('maps linked skill names for display', () => {
    const state = createInitialState('Calculus 1')
    const resource = state.resources['ka-chain-rule']
    expect(skillNamesForResource(state, resource)).toContain('Chain Rule')
  })
})
