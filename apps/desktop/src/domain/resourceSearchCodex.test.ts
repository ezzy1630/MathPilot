import { describe, expect, it } from 'vitest'
import { parseResourceSearchResponse } from './resourceSearchCodex'
import { createInitialState } from './learningEngine'

describe('resourceSearchCodex', () => {
  it('parses resource_id from Codex stdout', () => {
    const state = createInitialState('Calculus 1')
    const resourceId = Object.keys(state.resources)[0]
    const payload = parseResourceSearchResponse(
      JSON.stringify({ resource_id: resourceId, rationale: 'Best match for chain rule.' }),
      state,
    )
    expect(payload?.resourceId).toBe(resourceId)
  })

  it('rejects unknown resource ids', () => {
    const state = createInitialState('Calculus 1')
    expect(
      parseResourceSearchResponse(JSON.stringify({ resource_id: 'not-a-real-resource' }), state),
    ).toBeNull()
  })
})
