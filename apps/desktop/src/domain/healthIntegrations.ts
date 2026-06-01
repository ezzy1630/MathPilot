/**
 * Optional energy integrations (MathPilot_spec §8.3).
 *
 * Bevel import and manual energy selection are fully supported in the UI.
 * Apple HealthKit is **not** wired in this build: native HealthKit requires
 * macOS entitlements, a signed capability, and Swift bridge code. The Tauri
 * command `health_kit_available` (see `apps/desktop/src-tauri/src/db.rs`)
 * returns `false` until a future native module is added. Use manual energy or
 * Bevel import instead.
 */

export interface EnergySnapshot {
  source: 'manual' | 'bevel_import' | 'healthkit'
  score: number
  label?: string
  recordedAt: string
}

export interface BevelImportPayload {
  score?: number
  energy?: number
  date?: string
}

export function parseBevelImport(raw: string): EnergySnapshot | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const data = JSON.parse(trimmed) as BevelImportPayload
    const score = typeof data.score === 'number' ? data.score : typeof data.energy === 'number' ? data.energy : NaN
    if (!Number.isFinite(score)) return null
    return {
      source: 'bevel_import',
      score: Math.max(0, Math.min(100, score)),
      label: 'Bevel import',
      recordedAt: data.date ?? new Date().toISOString(),
    }
  } catch {
    const n = Number(trimmed)
    if (!Number.isFinite(n)) return null
    return {
      source: 'bevel_import',
      score: Math.max(0, Math.min(100, n)),
      recordedAt: new Date().toISOString(),
    }
  }
}

/** Sync fallback — always false until native HealthKit is implemented. Prefer `healthKitAvailableAsync`. */
export function healthKitAvailable(): boolean {
  return false
}

/** Ask the Tauri shell whether HealthKit is available (stub returns false, no entitlements). */
export async function healthKitAvailableAsync(): Promise<boolean> {
  if (typeof window === 'undefined' || !(window as Window & { __TAURI__?: unknown }).__TAURI__) {
    return false
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke<boolean>('health_kit_available')
  } catch {
    return false
  }
}

export function energyPaceHint(snapshot: EnergySnapshot | undefined): 'low_energy' | 'normal' | 'high_focus' | null {
  if (!snapshot) return null
  if (snapshot.score < 35) return 'low_energy'
  if (snapshot.score >= 75) return 'high_focus'
  return 'normal'
}
