import { describe, expect, it } from 'vitest'
import { approveCodeChange, proposeCodeChange, rejectCodeChange, validateCodePatchPath } from './codeSelfImprovement'
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
    expect(validateCodePatchPath('../secrets.env').ok).toBe(false)
  })

  it('tracks approval workflow', () => {
    let state: ReturnType<typeof createInitialState> = {
      ...createInitialState('Calculus 1'),
      developerModeEnabled: true,
    }
    state = proposeCodeChange(state, { summary: 'fix nav', files: ['App.tsx'], diffPreview: '+1' })
    const id = state.codeChangeProposals![0].id
    state = approveCodeChange(state, id)
    expect(state.codeChangeProposals![0].status).toBe('approved')
    state = rejectCodeChange(state, id)
    expect(state.codeChangeProposals![0].status).toBe('rejected')
  })
})
