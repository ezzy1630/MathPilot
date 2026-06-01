import type { MathPilotState } from './types'

export type SkillFileActor = 'codex' | 'system' | 'user'

/** Append durable mastery notes for skills that changed recently (spec: skill file writes). */
export async function syncSkillMasteryNotes(state: MathPilotState, skillIds: string[]): Promise<void> {
  if (typeof window === 'undefined' || !(window as Window & { __TAURI__?: unknown }).__TAURI__) return

  const lines = skillIds
    .filter((id) => state.skills[id] && state.mastery[id])
    .map((id) => {
      const skill = state.skills[id]
      const m = state.mastery[id]
      return `- **${skill.name}** (${id}): ${Math.round(m.masteryScore * 100)}% · ${m.masteryState} · last practiced ${m.lastPracticed ?? 'never'}`
    })

  if (!lines.length) return

  const content = `## Mastery update ${new Date().toISOString().slice(0, 10)}\n${lines.join('\n')}`
  await appendSkillFileWithBackup('skill_mastery_log.md', content, 'system', 'mastery sync')
}

/** Versioned backup + append for skill maintenance log (§16.3). */
export async function appendSkillFileWithBackup(
  filename: string,
  content: string,
  actor: SkillFileActor,
  reason: string,
): Promise<void> {
  if (typeof window === 'undefined' || !(window as Window & { __TAURI__?: unknown }).__TAURI__) return

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const versionId = `skill-backup-${Date.now()}`
    await invoke('backup_skill_file', { filename, backupId: versionId })
    await invoke('append_memory_file', { filename, content })
    await invoke('append_skill_changelog', {
      entry: {
        at: new Date().toISOString(),
        actor,
        filesChanged: [filename],
        reason,
        backupId: versionId,
      },
    })
  } catch {
    // best-effort
  }
}

export async function appendSkillMaintenanceLog(message: string, actor: SkillFileActor = 'system'): Promise<void> {
  const content = `- ${new Date().toISOString()} [${actor}]: ${message}`
  if (typeof window === 'undefined' || !(window as Window & { __TAURI__?: unknown }).__TAURI__) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('backup_skill_file', { filename: 'improve_skill_file.md', backupId: `maint-${Date.now()}` })
    await invoke('append_skill_maintenance_log', { content })
    await invoke('append_skill_changelog', {
      entry: {
        at: new Date().toISOString(),
        actor,
        filesChanged: ['skills/maintenance/improve_skill_file.md'],
        reason: 'maintenance skill_improvement',
        backupId: `maint-${Date.now()}`,
      },
    })
  } catch {
    // best-effort
  }
}

export { buildSkillPatchMarkdown, writeSkillPatchFromRecommendation } from './skillPatcher'
