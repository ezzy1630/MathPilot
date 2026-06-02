import { hydrateState } from './hydrateState'
import { createInitialState } from './learningEngine'
import { loadRelationalLocal, saveRelationalLocal } from './relationalStore'
import type { AttemptRecord, CourseFocus, MathPilotState } from './types'
import {
  isUserDataArchive,
  parseArchivePayload,
  USER_ARCHIVE_VERSION,
  type UserDataArchive,
} from './userArchive'
import { loadState as loadLocalState, saveState as saveLocalState } from './storage'

const STORAGE_KEY = 'mathpilot.local.sqlite-facade.v3'
const LEGACY_STORAGE_KEY = 'mathpilot.local.sqlite-facade.v1'
const RELATIONAL_PREFIX = 'mathpilot.relational.v1'
const RELATIONAL_TABLES = ['settings', 'mastery', 'review', 'problems', 'attempts', 'homework', 'changelog'] as const

/** Clear browser dev persistence keys (no-op in Tauri-only contexts without localStorage). */
export function clearLocalPersistence(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(LEGACY_STORAGE_KEY)
  for (const table of RELATIONAL_TABLES) {
    localStorage.removeItem(`${RELATIONAL_PREFIX}.${table}`)
  }
}

/** Wipe local profile data and persist a fresh initial state everywhere we store it. */
export async function resetPersistedState(focus: CourseFocus = 'Calculus 1'): Promise<MathPilotState> {
  clearLocalPersistence()
  const state = createInitialState(focus)
  await savePersistedState(state)
  return state
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && Boolean((window as Window & { __TAURI__?: unknown }).__TAURI__)
}

export async function loadPersistedState(defaultFocus: CourseFocus = 'Calculus 1'): Promise<MathPilotState> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const raw = await invoke<string | null>('db_load_state')
      if (raw) {
        const parsed = parseArchivePayload(raw)
        const partial = isUserDataArchive(parsed) ? parsed.state : parsed
        return hydrateState(partial as Partial<MathPilotState>)
      }
    } catch {
      // fall through
    }
  }

  const relational = loadRelationalLocal()
  if (relational) {
    return hydrateState(relational)
  }

  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = parseArchivePayload(raw)
      const partial = isUserDataArchive(parsed) ? parsed.state : parsed
      return hydrateState(partial as Partial<MathPilotState>)
    } catch {
      return createInitialState(defaultFocus)
    }
  }

  const legacy = loadLocalState(defaultFocus)
  if (legacy.attempts.length > 0 || legacy.onboarded) {
    await savePersistedState(legacy)
    return legacy
  }
  return createInitialState(defaultFocus)
}

export async function savePersistedState(state: MathPilotState): Promise<void> {
  const payload = JSON.stringify(state)

  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('db_save_state', { payload })
      return
    } catch {
      // fall through
    }
  }

  saveRelationalLocal(state)
  localStorage.setItem(STORAGE_KEY, payload)
  saveLocalState(state)
}

export async function syncAttemptRecord(attempt: AttemptRecord): Promise<void> {
  if (!isTauri()) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('db_sync_attempt', {
      id: attempt.id,
      problemId: attempt.problemId,
      skillIds: JSON.stringify(attempt.skillIds),
      answerRaw: attempt.answer,
      correct: attempt.correct,
      mode: attempt.mode,
      hintCount: attempt.hintCount,
      seconds: attempt.seconds,
      mixed: attempt.mixed,
      delayed: attempt.delayed,
      confidence: attempt.confidence ?? null,
      createdAt: attempt.createdAt,
      resourceId: attempt.resourceId ?? null,
      mistakeTags: attempt.mistakeTags ? JSON.stringify(attempt.mistakeTags) : null,
      masteryDelta: attempt.masteryDelta ?? 0,
    })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[MathPilot] incremental attempt sync failed', error)
    }
  }
}

export async function saveHomeworkImageFile(
  analysisId: string,
  dataUrl: string,
  retain: boolean,
): Promise<string | undefined> {
  if (!retain || !isTauri()) return undefined
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke<string | undefined>('save_homework_image', {
      analysisId,
      dataUrl,
      retain,
    })
  } catch {
    return undefined
  }
}

export async function listBackups(): Promise<string[]> {
  if (!isTauri()) return []
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke<string[]>('list_backups')
  } catch {
    return []
  }
}

export async function restoreBackupPayload(fileName: string): Promise<string | null> {
  if (!isTauri()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke<string>('restore_backup', { backupFile: fileName })
  } catch {
    return null
  }
}

export function buildBrowserArchive(state: MathPilotState): UserDataArchive {
  return {
    archiveVersion: USER_ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    state,
    memoryFiles: {},
    homeworkImages: {},
  }
}

/** Full export: state + memory markdown + retained homework images (Tauri). */
export async function exportFullUserArchive(state: MathPilotState): Promise<Blob> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const json = await invoke<string>('export_user_archive', {
        statePayload: JSON.stringify(state),
      })
      return new Blob([json], { type: 'application/json' })
    } catch {
      // fall through to browser-shaped archive
    }
  }
  return new Blob([JSON.stringify(buildBrowserArchive(state), null, 2)], {
    type: 'application/json',
  })
}

export async function importFullUserArchive(payload: string): Promise<MathPilotState> {
  const parsed = parseArchivePayload(payload)
  if (isUserDataArchive(parsed)) {
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('import_user_archive', { archiveJson: payload })
    }
    return hydrateState(parsed.state)
  }
  const state = hydrateState(parsed as Partial<MathPilotState>)
  await savePersistedState(state)
  return state
}

export async function writeStateBackup(backupId: string, state: MathPilotState): Promise<void> {
  let payload: string
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      payload = await invoke<string>('export_user_archive', { statePayload: JSON.stringify(state) })
    } catch {
      payload = JSON.stringify(buildBrowserArchive(state), null, 2)
    }
  } else {
    payload = JSON.stringify(buildBrowserArchive(state), null, 2)
  }

  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('write_backup', { backupId, payload })
      return
    } catch {
      // fall through
    }
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`mathpilot.backup.${backupId}`, payload)
  }
}

export async function persistenceRoundTrip(state: MathPilotState): Promise<boolean> {
  await savePersistedState(state)
  const loaded = await loadPersistedState(state.currentFocus)
  return loaded.profileName === state.profileName && loaded.currentFocus === state.currentFocus
}
