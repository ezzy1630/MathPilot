import type { MathPilotState } from './types'

let lastReviewNudge = 0

export async function maybeNotifyReviewDue(state: MathPilotState): Promise<void> {
  if (!state.preferences?.notificationsEnabled) return
  const due = state.reviewQueue.filter((r) => r.due <= new Date().toISOString().slice(0, 10)).length
  if (due === 0) return
  const now = Date.now()
  if (now - lastReviewNudge < 4 * 60 * 60 * 1000) return
  lastReviewNudge = now

  const title = 'MathPilot'
  const body = `${due} review${due === 1 ? '' : 's'} ready — retrieval protects your progress.`

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body })
    return
  }

  if (typeof window !== 'undefined' && (window as Window & { __TAURI__?: unknown }).__TAURI__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('show_local_notification', { title, body })
    } catch {
      // Plugin optional
    }
  }
}

export function requestNotificationPermission(): void {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission()
  }
}
