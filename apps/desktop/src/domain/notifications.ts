import type { MathPilotState } from './types'

let lastReviewNudge = 0
let lastStudyBlockNudgeDay = ''
let lastPlannedStudyNudgeDay = ''

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

async function deliverLocalNotification(title: string, body: string): Promise<void> {
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

export async function maybeNotifyReviewDue(state: MathPilotState): Promise<void> {
  if (!state.preferences?.notificationsEnabled) return
  const due = state.reviewQueue.filter((r) => r.due <= todayKey()).length
  if (due === 0) return
  const now = Date.now()
  if (now - lastReviewNudge < 4 * 60 * 60 * 1000) return
  lastReviewNudge = now

  await deliverLocalNotification(
    'MathPilot',
    `${due} review${due === 1 ? '' : 's'} ready — retrieval protects your progress.`,
  )
}

function parseStudyBlockMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function minutesNowLocal(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export async function maybeNotifyStudyBlock(state: MathPilotState): Promise<void> {
  if (!state.preferences?.notificationsEnabled) return
  if (!state.preferences.studyPlanReminderEnabled) return

  const blockTime = state.preferences.studyBlockTime ?? '18:00'
  const blockDays = state.preferences.studyBlockDays ?? [1, 2, 3, 4, 5]
  const blockMinutes = parseStudyBlockMinutes(blockTime)
  if (blockMinutes === null) return

  const weekday = new Date().getDay()
  if (!blockDays.includes(weekday)) return

  const delta = blockMinutes - minutesNowLocal()
  if (delta < 0 || delta > 15) return

  const day = todayKey()
  if (lastStudyBlockNudgeDay === day) return
  lastStudyBlockNudgeDay = day

  const label = blockTime
  await deliverLocalNotification(
    'MathPilot',
    delta === 0
      ? `Your study block starts now (${label}).`
      : `Study block in ${delta} min (${label}) — open MathPilot when you're ready.`,
  )
}

export async function maybeNotifyPlannedStudy(state: MathPilotState): Promise<void> {
  if (!state.preferences?.notificationsEnabled) return
  const day = todayKey()
  if (state.plannedStudyToday !== day) return
  if (lastPlannedStudyNudgeDay === day) return
  lastPlannedStudyNudgeDay = day

  await deliverLocalNotification('MathPilot', 'You planned to study today — your coach desk is ready.')
}

export function requestNotificationPermission(): void {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission()
  }
}
