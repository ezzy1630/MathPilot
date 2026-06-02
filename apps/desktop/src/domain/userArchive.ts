import type { MathPilotState } from './types'

export const USER_ARCHIVE_VERSION = 1

export interface UserDataArchive {
  archiveVersion: number
  exportedAt: string
  state: MathPilotState
  memoryFiles?: Record<string, string>
  homeworkImages?: Record<string, string>
}

export function isUserDataArchive(value: unknown): value is UserDataArchive {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return record.archiveVersion === USER_ARCHIVE_VERSION && record.state != null
}

export function parseArchivePayload(payload: string): UserDataArchive | MathPilotState {
  const parsed: unknown = JSON.parse(payload)
  if (isUserDataArchive(parsed)) {
    return parsed
  }
  return parsed as MathPilotState
}
