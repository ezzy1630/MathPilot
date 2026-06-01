import type { MathPilotState } from './types'

export interface CodePatch {
  path: string
  content: string
}

export interface CodeChangeProposal {
  id: string
  createdAt: string
  summary: string
  files: string[]
  diffPreview: string
  patches?: CodePatch[]
  status: 'pending_approval' | 'approved' | 'rejected' | 'applied'
  backupId?: string
  appliedPaths?: string[]
}

const REPO_ROOT_PREFIXES = ['apps/', 'packages/', 'skills/', 'config/', 'scripts/', 'data/']

/** Paths for code self-improvement must stay under the MathPilot repo root. */
export function validateCodePatchPath(path: string): { ok: boolean; reason?: string } {
  const rel = path.trim().replace(/^\/+/, '')
  if (!rel || rel.includes('..') || rel.startsWith('.env') || rel.includes('/.env')) {
    return { ok: false, reason: 'invalid or sensitive path' }
  }
  if (rel.startsWith('node_modules/') || rel.includes('/node_modules/')) {
    return { ok: false, reason: 'node_modules is not patchable' }
  }
  const allowed = REPO_ROOT_PREFIXES.some((prefix) => rel.startsWith(prefix))
  if (!allowed) {
    return { ok: false, reason: 'path must be under repo root (apps/, packages/, skills/, config/, scripts/, data/)' }
  }
  return { ok: true }
}

export function validateCodePatches(patches: CodePatch[]): { ok: boolean; invalidPaths: string[] } {
  const invalidPaths = patches
    .map((patch) => patch.path)
    .filter((path) => !validateCodePatchPath(path).ok)
  return { ok: invalidPaths.length === 0, invalidPaths }
}

/** Spec §19: code self-improvement requires developer mode, backup, and explicit approval. */
export function proposeCodeChange(
  state: MathPilotState,
  input: { summary: string; files: string[]; diffPreview: string; patches?: CodePatch[] },
): MathPilotState {
  if (!state.developerModeEnabled) return state
  if (input.patches?.length) {
    const validation = validateCodePatches(input.patches)
    if (!validation.ok) {
      return {
        ...state,
        changelog: [
          `${new Date().toISOString()}: Code change rejected — invalid paths: ${validation.invalidPaths.join(', ')}.`,
          ...state.changelog,
        ],
      }
    }
  }
  const proposal: CodeChangeProposal = {
    id: `code-change-${Date.now()}`,
    createdAt: new Date().toISOString(),
    summary: input.summary,
    files: input.files,
    diffPreview: input.diffPreview.slice(0, 12_000),
    patches: input.patches,
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
      `${new Date().toISOString()}: Code change approved — ${next[idx].summary}. Backup ${backupId}.`,
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

export async function applyApprovedCodeChange(
  state: MathPilotState,
  proposalId: string,
): Promise<MathPilotState> {
  const proposals = state.codeChangeProposals ?? []
  const idx = proposals.findIndex((p) => p.id === proposalId)
  if (idx < 0) return state
  const proposal = proposals[idx]
  if (proposal.status !== 'approved' || !proposal.patches?.length) return state

  const validation = validateCodePatches(proposal.patches)
  if (!validation.ok) return state

  const backupId = proposal.backupId ?? `backup-${Date.now()}`
  let appliedPaths: string[] = []

  if (typeof window !== 'undefined' && (window as Window & { __TAURI__?: unknown }).__TAURI__) {
    const { invoke } = await import('@tauri-apps/api/core')
    appliedPaths = await invoke<string[]>('apply_code_patches', {
      backupId,
      patches: proposal.patches,
    })
  }

  const next = [...proposals]
  next[idx] = { ...next[idx], status: 'applied', appliedPaths, backupId }

  return {
    ...state,
    codeChangeProposals: next,
    changelog: [
      `${new Date().toISOString()}: Code change applied — ${proposal.summary} (${appliedPaths.length} files).`,
      ...state.changelog,
    ],
  }
}

export async function rollbackCodeChange(
  state: MathPilotState,
  proposalId: string,
): Promise<MathPilotState> {
  const proposals = state.codeChangeProposals ?? []
  const proposal = proposals.find((p) => p.id === proposalId)
  if (!proposal?.backupId) return state

  if (typeof window !== 'undefined' && (window as Window & { __TAURI__?: unknown }).__TAURI__) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('rollback_code_patches', { backupId: proposal.backupId })
  }

  return {
    ...state,
    codeChangeProposals: proposals.map((p) =>
      p.id === proposalId ? { ...p, status: 'rejected' } : p,
    ),
    changelog: [
      `${new Date().toISOString()}: Rolled back code change — ${proposal.summary}.`,
      ...state.changelog,
    ],
  }
}
