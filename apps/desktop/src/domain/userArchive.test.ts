import { describe, expect, it } from 'vitest'
import { isUserDataArchive, parseArchivePayload } from './userArchive'
import { createInitialState } from './learningEngine'

describe('userArchive', () => {
  it('detects archive vs legacy state export', () => {
    const state = createInitialState('Calculus 1')
    const archive = {
      archiveVersion: 1,
      exportedAt: '2026-06-01T00:00:00Z',
      state,
    }
    expect(isUserDataArchive(archive)).toBe(true)
    expect(isUserDataArchive(state)).toBe(false)
    const parsed = parseArchivePayload(JSON.stringify(archive))
    expect(isUserDataArchive(parsed)).toBe(true)
  })
})
