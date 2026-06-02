import { validateCodePatchPath as validatePatchPath } from '@config/codePatchPolicy'
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

export interface DeveloperState {
  pendingDiffPreview?: string
  lastTestRun?: { ok: boolean; output: string; at: string }
}

export type CodeSelfImprovementState = MathPilotState & { developerState?: DeveloperState }

/** Paths for code self-improvement must match Tauri patch policy (config/code-patch-policy.json). */
export function validateCodePatchPath(path: string): { ok: boolean; reason?: string } {
  return validatePatchPath(path)
}

export function validateCodePatches(patches: CodePatch[]): { ok: boolean; invalidPaths: string[] } {
  const invalidPaths = patches
    .map((patch) => patch.path)
    .filter((path) => !validateCodePatchPath(path).ok)
  return { ok: invalidPaths.length === 0, invalidPaths }
}

/** Spec §19: code self-improvement requires developer mode, backup, and explicit approval. */
export function proposeCodeChange(
  state: CodeSelfImprovementState,
  input: { summary: string; files: string[]; diffPreview: string; patches?: CodePatch[] },
): CodeSelfImprovementState {
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
    developerState: {
      ...state.developerState,
      pendingDiffPreview: proposal.diffPreview,
    },
    changelog: [
      `${proposal.createdAt}: Code change proposed (pending approval) — ${input.summary}`,
      ...state.changelog,
    ],
  }
}

export function approveCodeChange(state: CodeSelfImprovementState, proposalId: string): CodeSelfImprovementState {
  const proposals = state.codeChangeProposals ?? []
  const idx = proposals.findIndex((p) => p.id === proposalId)
  if (idx < 0) return state
  const backupId = `backup-before-code-${Date.now()}`
  const next = [...proposals]
  next[idx] = { ...next[idx], status: 'approved', backupId }
  return {
    ...state,
    codeChangeProposals: next,
    developerState: {
      ...state.developerState,
      pendingDiffPreview: next[idx].diffPreview,
    },
    changelog: [
      `${new Date().toISOString()}: Code change approved — ${next[idx].summary}. Backup ${backupId}.`,
      ...state.changelog,
    ],
  }
}

export function rejectCodeChange(state: CodeSelfImprovementState, proposalId: string): CodeSelfImprovementState {
  const proposals = state.codeChangeProposals ?? []
  return {
    ...state,
    codeChangeProposals: proposals.map((p) =>
      p.id === proposalId ? { ...p, status: 'rejected' } : p,
    ),
    developerState: {
      ...state.developerState,
      pendingDiffPreview: undefined,
    },
  }
}

export async function applyApprovedCodeChange(
  state: CodeSelfImprovementState,
  proposalId: string,
): Promise<CodeSelfImprovementState> {
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

  let lastTestRun: DeveloperState['lastTestRun'] = {
    ok: true,
    output: 'pnpm test skipped (non-Tauri shell)',
    at: new Date().toISOString(),
  }
  if (typeof window !== 'undefined' && (window as Window & { __TAURI__?: unknown }).__TAURI__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      lastTestRun = await invoke<DeveloperState['lastTestRun']>('run_pnpm_test')
    } catch (error) {
      lastTestRun = {
        ok: false,
        output: error instanceof Error ? error.message : String(error),
        at: new Date().toISOString(),
      }
    }
  }

  const patched = appliedPaths.length > 0
  const next = [...proposals]
  next[idx] = {
    ...next[idx],
    status: patched ? 'applied' : 'approved',
    appliedPaths,
    backupId,
  }

  const changelogLine = patched
    ? `${new Date().toISOString()}: Code change applied — ${proposal.summary} (${appliedPaths.length} files). Tests ${lastTestRun?.ok ? 'passed' : 'failed'}.`
    : `${new Date().toISOString()}: Code change approved but not applied (requires Tauri shell with repo checkout).`

  return {
    ...state,
    codeChangeProposals: next,
    developerState: {
      ...state.developerState,
      pendingDiffPreview: undefined,
      lastTestRun,
    },
    changelog: [changelogLine, ...state.changelog],
  }
}

export async function rollbackCodeChange(
  state: CodeSelfImprovementState,
  proposalId: string,
): Promise<CodeSelfImprovementState> {
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
    developerState: {
      ...state.developerState,
      pendingDiffPreview: undefined,
    },
    changelog: [
      `${new Date().toISOString()}: Rolled back code change — ${proposal.summary}.`,
      ...state.changelog,
    ],
  }
}
