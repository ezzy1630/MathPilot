import { invokeCodexForTask } from './aiAdapter'
import { codexFailureKind, codexFailureUserMessage } from './codexConfig'
import { extractJsonObject } from './codexJson'
import { loadSkillsForPrompt } from './skillLoader'
import type { CodePatch, CodeSelfImprovementState } from './codeSelfImprovement'
import { proposeCodeChange } from './codeSelfImprovement'

export interface CodexCodeProposalPayload {
  summary: string
  files: string[]
  diffPreview: string
  patches?: CodePatch[]
}

export function parseCodexCodeProposalResponse(stdout: string): CodexCodeProposalPayload | null {
  const parsed = extractJsonObject(stdout)
  if (!parsed) return null

  const summary = String(parsed.summary ?? parsed.change_summary ?? '').trim()
  if (!summary) return null

  const files = Array.isArray(parsed.files)
    ? (parsed.files as string[]).filter((f) => typeof f === 'string')
    : Array.isArray(parsed.paths)
      ? (parsed.paths as string[])
      : []

  const diffPreview = String(parsed.diff_preview ?? parsed.diffPreview ?? parsed.diff ?? '').slice(0, 12_000)

  const patchesRaw = parsed.patches ?? parsed.file_patches
  let patches: CodePatch[] | undefined
  if (Array.isArray(patchesRaw)) {
    patches = patchesRaw
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
      .map((entry) => ({
        path: String(entry.path ?? entry.file ?? ''),
        content: String(entry.content ?? entry.body ?? ''),
      }))
      .filter((p) => p.path.trim() && p.content.length > 0)
    if (!patches.length) patches = undefined
  }

  const fileList = files.length ? files : (patches?.map((p) => p.path) ?? [])
  if (!fileList.length && !diffPreview) return null

  return { summary, files: fileList, diffPreview, patches }
}

/**
 * Ask Codex for a code-change proposal (spec §19). Requires developer mode; does not apply patches.
 */
export async function proposeCodeChangeFromCodex(
  state: CodeSelfImprovementState,
  userRequest: string,
): Promise<CodeSelfImprovementState> {
  if (!state.developerModeEnabled) return state

  const skillBodies = await loadSkillsForPrompt('code_self_improvement', [])
  const task = [
    'code_self_improvement',
    userRequest.trim(),
    'Propose a minimal, reviewable patch under apps/, packages/, skills/, config/, scripts/, or data/ only.',
    'Return JSON only: { "summary": string, "files": string[], "diff_preview": string, "patches": [{ "path": string, "content": string }] }.',
    'Do not modify node_modules, .env, or paths outside the MathPilot repo.',
  ].join(' ')

  const { state: logged, result } = await invokeCodexForTask(state, task, {
    skillBodies,
    forceNewSession: true,
  })

  const failure = codexFailureKind(result, true)
  if (failure) {
    const message = codexFailureUserMessage(failure, 'Code improvement request') ?? 'Codex request failed.'
    return {
      ...logged,
      changelog: [`${new Date().toISOString()}: ${message}`, ...logged.changelog],
      toastQueue: [
        ...(logged.toastQueue ?? []),
        { id: `toast-${Date.now()}`, message, tone: 'warning' as const },
      ].slice(-4),
    }
  }

  const payload = parseCodexCodeProposalResponse(result.stdout)
  if (!payload) {
    const message = 'Code improvement: could not parse Codex JSON.'
    return {
      ...logged,
      changelog: [`${new Date().toISOString()}: ${message}`, ...logged.changelog],
      toastQueue: [
        ...(logged.toastQueue ?? []),
        { id: `toast-${Date.now()}`, message, tone: 'warning' as const },
      ].slice(-4),
    }
  }

  return proposeCodeChange(logged, {
    summary: payload.summary,
    files: payload.files,
    diffPreview: payload.diffPreview || '(no diff preview)',
    patches: payload.patches,
  })
}
