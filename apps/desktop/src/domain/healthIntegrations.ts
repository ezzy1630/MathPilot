/**
 * Optional energy integrations (MathPilot_spec §8.3). No HealthKit dependency required.
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

/** HealthKit is not available in the web/Tauri renderer; manual path only on desktop. */
export function healthKitAvailable(): boolean {
  return false
}

export function energyPaceHint(snapshot: EnergySnapshot | undefined): 'low_energy' | 'normal' | 'high_focus' | null {
  if (!snapshot) return null
  if (snapshot.score < 35) return 'low_energy'
  if (snapshot.score >= 75) return 'high_focus'
  return 'normal'
}
