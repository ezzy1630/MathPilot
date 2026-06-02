import policy from './code-patch-policy.json'

export interface CodePatchPolicy {
  allowedPrefixes: string[]
  blockedPrefixes: string[]
  allowedExtensions: string[]
}

export const CODE_PATCH_POLICY: CodePatchPolicy = policy

/** Shared path policy for developer code-self-improvement (matches Tauri apply/rollback). */
export function isPatchableRepoPath(path: string): boolean {
  const rel = path.trim().replace(/^\/+/, '')
  if (!rel || rel.includes('..') || rel.includes('\\')) return false
  if (rel.startsWith('.env') || rel.includes('/.env')) return false
  if (rel.startsWith('.') && !rel.startsWith('.github/')) return false
  if (CODE_PATCH_POLICY.blockedPrefixes.some((prefix) => rel.startsWith(prefix))) return false
  if (!CODE_PATCH_POLICY.allowedPrefixes.some((prefix) => rel.startsWith(prefix))) return false
  const ext = rel.includes('.') ? rel.split('.').pop()?.toLowerCase() : ''
  return Boolean(ext && CODE_PATCH_POLICY.allowedExtensions.includes(ext))
}

export function validateCodePatchPath(path: string): { ok: boolean; reason?: string } {
  if (isPatchableRepoPath(path)) return { ok: true }
  return {
    ok: false,
    reason:
      'path must be under an allowed repo prefix with a known extension (see config/code-patch-policy.json)',
  }
}
