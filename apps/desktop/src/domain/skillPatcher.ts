import { appendSkillMaintenanceLog, type SkillFileActor } from './skillFileSync'

export interface SkillPatchRecommendation {
  skillId: string
  message: string
}

/** Markdown patch body for data/skills_patches/<skill>.patch.md */
export function buildSkillPatchMarkdown(skillId: string, recommendation: string): string {
  return [
    `# Patch preview for ${skillId}`,
    '',
    `created_at: ${new Date().toISOString()}`,
    `recommendation: ${JSON.stringify(recommendation)}`,
    '',
    '## Suggested additions',
    '- pitfalls section citing repeated mistakes',
    '- setup checklist before execution',
  ].join('\n')
}

/** Write patch file (with backup) and log maintenance changelog. */
export async function writeSkillPatchFromRecommendation(
  rec: SkillPatchRecommendation,
  actor: SkillFileActor = 'codex',
): Promise<void> {
  if (typeof window === 'undefined' || !(window as Window & { __TAURI__?: unknown }).__TAURI__) return

  const content = buildSkillPatchMarkdown(rec.skillId, rec.message)
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const backupId = `patch-${rec.skillId}-${Date.now()}`
    await invoke('write_skill_patch', { skillId: rec.skillId, content })
    await appendSkillMaintenanceLog(rec.message, actor)
    await invoke('append_skill_changelog', {
      entry: {
        at: new Date().toISOString(),
        actor,
        filesChanged: [`data/skills_patches/${rec.skillId}.patch.md`],
        reason: 'maintenance skill_improvement',
        backupId,
      },
    })
  } catch {
    // best-effort
  }
}
