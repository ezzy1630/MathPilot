import type { MathPilotState } from './types'

export interface CodeChangeProposal {
  id: string
  createdAt: string
  summary: string
  files: string[]
  diffPreview: string
  status: 'pending_approval' | 'approved' | 'rejected' | 'applied'
  backupId?: string
}

/** Spec §19: code self-improvement requires developer mode, backup, and explicit approval. */
export function proposeCodeChange(
  state: MathPilotState,
  input: { summary: string; files: string[]; diffPreview: string },
): MathPilotState {
  if (!state.developerModeEnabled) return state
  const proposal: CodeChangeProposal = {
    id: `code-change-${Date.now()}`,
    createdAt: new Date().toISOString(),
    summary: input.summary,
    files: input.files,
    diffPreview: input.diffPreview.slice(0, 12_000),
    status: 'pending_approval',
  }
  const proposals = [...(state.codeChangeProposals ?? []), proposal]
  return {
    ...state,
    codeChangeProposals: proposals,
    changelog: [
      `${proposal.createdAt}: Code change proposed (pending approval) — ${input.summary}`,
      ...state.changelog,
    ],
  }
}

export function approveCodeChange(state: MathPilotState, proposalId: string): MathPilotState {
  const proposals = state.codeChangeProposals ?? []
  const idx = proposals.findIndex((p) => p.id === proposalId)
  if (idx < 0) return state
  const backupId = `backup-before-code-${Date.now()}`
  const next = [...proposals]
  next[idx] = { ...next[idx], status: 'approved', backupId }
  return {
    ...state,
    codeChangeProposals: next,
    changelog: [
      `${new Date().toISOString()}: Code change approved — ${next[idx].summary}. Backup ${backupId} required before apply.`,
      ...state.changelog,
    ],
  }
}

export function rejectCodeChange(state: MathPilotState, proposalId: string): MathPilotState {
  const proposals = state.codeChangeProposals ?? []
  return {
    ...state,
    codeChangeProposals: proposals.map((p) =>
      p.id === proposalId ? { ...p, status: 'rejected' } : p,
    ),
  }
}
