import type { MathPilotState } from './types'

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
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('append_memory_file', { filename: 'skill_mastery_log.md', content })
  } catch {
    // best-effort
  }
}
