import { hydrateState } from './hydrateState'
import { createInitialState } from './learningEngine'
import { loadRelationalLocal, saveRelationalLocal } from './relationalStore'
import type { AttemptRecord, CourseFocus, MathPilotState } from './types'
import { loadState as loadLocalState, saveState as saveLocalState } from './storage'

const STORAGE_KEY = 'mathpilot.local.sqlite-facade.v3'

function isTauri(): boolean {
  return typeof window !== 'undefined' && Boolean((window as Window & { __TAURI__?: unknown }).__TAURI__)
}

export async function loadPersistedState(defaultFocus: CourseFocus = 'Calculus 1'): Promise<MathPilotState> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const raw = await invoke<string | null>('db_load_state')
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<MathPilotState>
        return hydrateState(parsed)
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
      return hydrateState(JSON.parse(raw) as Partial<MathPilotState>)
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
    })
  } catch {
    // best-effort incremental sync
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

export async function persistenceRoundTrip(state: MathPilotState): Promise<boolean> {
  await savePersistedState(state)
  const loaded = await loadPersistedState(state.currentFocus)
  return loaded.profileName === state.profileName && loaded.currentFocus === state.currentFocus
}
