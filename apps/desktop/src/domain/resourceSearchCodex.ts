import { invokeCodexForTask } from './aiAdapter'
import { codexFailureKind } from './codexConfig'
import { extractJsonObject } from './codexJson'
import { listTrustedResources } from './resourceResolver'
import { loadSkillsForPrompt } from './skillLoader'
import type { MathPilotState, ResourceRecord } from './types'

export interface ResourceSearchPayload {
  resourceId: string
  rationale?: string
}

export function parseResourceSearchResponse(stdout: string, state: MathPilotState): ResourceSearchPayload | null {
  const parsed = extractJsonObject(stdout)
  if (!parsed) return null

  const resourceId = String(parsed.resource_id ?? parsed.resourceId ?? '').trim()
  if (!resourceId || !state.resources[resourceId]) return null

  const skillIds = Array.isArray(parsed.skill_ids)
    ? (parsed.skill_ids as string[])
    : Array.isArray(parsed.skillIds)
      ? (parsed.skillIds as string[])
      : state.resources[resourceId].skillIds

  const overlaps = skillIds.some((id) => state.resources[resourceId].skillIds.includes(id))
  if (!overlaps && state.resources[resourceId].skillIds.length) return null

  return {
    resourceId,
    rationale: typeof parsed.rationale === 'string' ? parsed.rationale.slice(0, 400) : undefined,
  }
}

function pickResourceDeterministic(state: MathPilotState, skillId: string): ResourceRecord | undefined {
  const skill = state.skills[skillId]
  if (!skill) return undefined
  const candidates = skill.resources
    .map((id) => state.resources[id])
    .filter(Boolean) as ResourceRecord[]
  return candidates.sort((a, b) => b.effectivenessScore - a.effectivenessScore)[0]
}

export function codexResourceSearchEnabled(state: MathPilotState): boolean {
  if (state.developerModeEnabled) return true
  return state.preferences?.enableCodexResourceSearch !== false
}

/** Codex-assisted resource pick (spec §11.2) with deterministic fallback. */
export async function pickResourceForSkillAsync(
  state: MathPilotState,
  skillId: string,
): Promise<{ state: MathPilotState; resource?: ResourceRecord; rationale?: string; source: 'codex' | 'deterministic' }> {
  const fallback = pickResourceDeterministic(state, skillId)
  if (!codexResourceSearchEnabled(state)) {
    return { state, resource: fallback, source: 'deterministic' }
  }

  const skill = state.skills[skillId]
  if (!skill) return { state, resource: fallback, source: 'deterministic' }

  const trusted = await listTrustedResources(state)
  const catalog = skill.resources
    .map((id) => state.resources[id])
    .filter(Boolean) as ResourceRecord[]

  const candidates = (catalog.length ? catalog : trusted.filter((r) => r.skillIds.includes(skillId))).slice(0, 12)
  if (!candidates.length) {
    return { state, resource: fallback, source: 'deterministic' }
  }

  const memoryLines = await import('./aiAdapter').then((m) => m.ensureMemoryLoaded())
  const skillBodies = await loadSkillsForPrompt('resource_search', [skillId])
  const mastery = state.mastery[skillId]

  const task = [
    'resource_search',
    `Select the best teaching video/resource for skill ${skillId} (${skill.name}).`,
    `Mastery: ${Math.round((mastery?.masteryScore ?? 0.4) * 100)}%. Session pace: ${state.sessionPace ?? 'normal'}.`,
    `Candidates (choose resource_id from this list only): ${JSON.stringify(
      candidates.map((r) => ({
        resource_id: r.id,
        title: r.title,
        source: r.source,
        effectiveness: r.effectivenessScore,
        duration: r.duration,
      })),
    )}`,
    'Return JSON only: { "resource_id": string, "rationale": string }.',
  ].join(' ')

  const { state: logged, result } = await invokeCodexForTask(state, task, {
    memoryLines,
    skillBodies,
    forceNewSession: true,
  })

  const failure = codexFailureKind(result, true)
  if (failure) {
    return {
      state: logged,
      resource: fallback,
      rationale: failure === 'timed_out' ? 'Codex timed out — using top-ranked local resource.' : undefined,
      source: 'deterministic',
    }
  }

  const payload = parseResourceSearchResponse(result.stdout, logged)
  if (!payload) {
    return { state: logged, resource: fallback, source: 'deterministic' }
  }

  const resource = logged.resources[payload.resourceId]
  return {
    state: {
      ...logged,
      changelog: [
        `${new Date().toISOString()}: Codex resource search picked "${resource.title}" for ${skill.name}.`,
        ...logged.changelog,
      ],
    },
    resource,
    rationale: payload.rationale,
    source: 'codex',
  }
}
