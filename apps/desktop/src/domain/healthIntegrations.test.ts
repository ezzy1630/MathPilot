import { describe, expect, it } from 'vitest'
import { energyPaceHint, parseBevelImport } from './healthIntegrations'

describe('healthIntegrations', () => {
  it('parses Bevel JSON', () => {
    const snap = parseBevelImport('{"score": 82}')
    expect(snap?.score).toBe(82)
    expect(snap?.source).toBe('bevel_import')
  })

  it('maps energy to pace hints', () => {
    expect(energyPaceHint({ source: 'manual', score: 20, recordedAt: '' })).toBe('low_energy')
    expect(energyPaceHint({ source: 'manual', score: 90, recordedAt: '' })).toBe('high_focus')
  })
})
