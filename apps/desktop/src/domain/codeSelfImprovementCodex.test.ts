import { describe, expect, it, vi } from 'vitest'
import { parseCodexCodeProposalResponse, proposeCodeChangeFromCodex } from './codeSelfImprovementCodex'
import { createInitialState } from './learningEngine'

vi.mock('./aiAdapter', () => ({
  invokeCodexForTask: vi.fn(async (state: ReturnType<typeof createInitialState>) => ({
    state,
    packet: 'packet',
    result: { ok: false, stdout: '', stderr: 'unavailable', mode: 'unavailable' as const },
  })),
  ensureMemoryLoaded: vi.fn(async () => []),
}))

describe('codeSelfImprovementCodex', () => {
  it('parses code proposal JSON', () => {
    const payload = parseCodexCodeProposalResponse(
      JSON.stringify({
        summary: 'Add timeout toast',
        files: ['apps/desktop/src/domain/codexConfig.ts'],
        diff_preview: '--- a\n+++ b',
        patches: [{ path: 'apps/desktop/src/domain/codexConfig.ts', content: 'export const x = 1\n' }],
      }),
    )
    expect(payload?.summary).toContain('timeout')
    expect(payload?.patches?.[0].path).toContain('codexConfig')
  })

  it('requires developer mode', async () => {
    const state = createInitialState('Calculus 1')
    const next = await proposeCodeChangeFromCodex(state, 'fix bug')
    expect(next.codeChangeProposals).toBeUndefined()
  })
})
