import type { MathPilotState } from './types'

export async function syncProfileToMemoryFiles(state: MathPilotState): Promise<void> {
  if (typeof window === 'undefined' || !(window as Window & { __TAURI__?: unknown }).__TAURI__) return

  const profile = `# Profile\n\n- name: ${state.profileName}\n- focus: ${state.currentFocus}\n- onboarded: ${state.onboarded}\n`
  const preferences = `# Preferences\n\n- tone: ${state.preferences?.tone ?? 'warm'}\n- theme: ${state.preferences?.theme ?? 'system'}\n- notifications: ${state.preferences?.notificationsEnabled ?? false}\n- active_video: ${state.preferences?.activeVideoMode ?? 'sometimes'}\n`

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('write_memory_file', { filename: 'profile.md', content: profile })
    await invoke('write_memory_file', { filename: 'preferences.md', content: preferences })
  } catch {
    // Web dev — no-op
  }
}
