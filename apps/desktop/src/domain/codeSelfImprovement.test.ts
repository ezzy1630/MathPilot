import { describe, expect, it } from 'vitest'
import {
  applyApprovedCodeChange,
  approveCodeChange,
  proposeCodeChange,
  rejectCodeChange,
  validateCodePatchPath,
} from './codeSelfImprovement'
import { createInitialState } from './learningEngine'

describe('codeSelfImprovement', () => {
  it('requires developer mode to propose', () => {
    const state = createInitialState('Calculus 1')
    const next = proposeCodeChange(state, { summary: 'fix', files: ['a.ts'], diffPreview: 'diff' })
    expect(next.codeChangeProposals).toBeUndefined()
  })

  it('rejects paths outside repo root', () => {
    expect(validateCodePatchPath('/etc/passwd').ok).toBe(false)
    expect(validateCodePatchPath('apps/desktop/src/main.tsx').ok).toBe(true)
    expect(validateCodePatchPath('skills/planning/schedule_review.md').ok).toBe(true)
    expect(validateCodePatchPath('.github/workflows/ci.yml').ok).toBe(true)
    expect(validateCodePatchPath('../secrets.env').ok).toBe(false)
  })

  it('tracks approval workflow and developer diff preview', () => {
    let state: ReturnType<typeof createInitialState> = {
      ...createInitialState('Calculus 1'),
      developerModeEnabled: true,
    }
    state = proposeCodeChange(state, { summary: 'fix nav', files: ['App.tsx'], diffPreview: '+1 line' })
    expect(state.developerState?.pendingDiffPreview).toBe('+1 line')
    const id = state.codeChangeProposals![0].id
    state = approveCodeChange(state, id)
    expect(state.codeChangeProposals![0].status).toBe('approved')
    expect(state.developerState?.pendingDiffPreview).toBe('+1 line')
    state = rejectCodeChange(state, id)
    expect(state.codeChangeProposals![0].status).toBe('rejected')
    expect(state.developerState?.pendingDiffPreview).toBeUndefined()
  })

  it('requires approval before apply', async () => {
    let state: ReturnType<typeof createInitialState> = {
      ...createInitialState('Calculus 1'),
      developerModeEnabled: true,
    }
    state = proposeCodeChange(state, {
      summary: 'patch file',
      files: ['apps/desktop/src/foo.ts'],
      diffPreview: '--- a\n+++ b',
      patches: [{ path: 'apps/desktop/src/foo.ts', content: 'export const x = 1\n' }],
    })
    const id = state.codeChangeProposals![0].id
    const withoutApproval = await applyApprovedCodeChange(state, id)
    expect(withoutApproval.codeChangeProposals![0].status).toBe('pending_approval')
    state = approveCodeChange(state, id)
    const applied = await applyApprovedCodeChange(state, id)
    expect(applied.codeChangeProposals![0].status).toBe('approved')
    expect(applied.codeChangeProposals![0].appliedPaths ?? []).toHaveLength(0)
    expect(applied.developerState?.pendingDiffPreview).toBeUndefined()
    expect(applied.developerState?.lastTestRun).toBeDefined()
  })
})
