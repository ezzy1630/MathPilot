import { sha256HexSync } from './promptHash'
import { sortSkillsByDiagnosticWeight } from './diagnosticEngine'
import type { DiagnosticQuestionKind } from './diagnosticQuestionMix'
import type { MathPilotState } from './types'

export type DiagnosticProbeIntentType =
  | 'broad_scan'
  | 'confirm_weakness'
  | 'disconfirm_strength'
  | 'prerequisite_check'
  | 'method_selection'

export interface CodexProbeProblem {
  title?: string
  prompt: string
  expectedAnswer: string
  answerType?: 'expression' | 'text' | 'choice'
  choices?: string[]
  difficulty?: number
  hintSequence?: string[]
}

export interface DiagnosticProbeIntent {
  skillId: string
  questionKind: DiagnosticQuestionKind
  intent: DiagnosticProbeIntentType
  rationale: string
  difficultyTarget: number
  requiresShowWork?: boolean
  problem?: CodexProbeProblem
}

export interface DiagnosticBatchPlan {
  batchIndex: number
  source: 'codex' | 'deterministic'
  batchRationale: string
  probes: DiagnosticProbeIntent[]
  generatedAt: string
}

export interface DiagnosticPlanHistoryEntry {
  batchIndex: number
  source: 'codex' | 'deterministic'
  batchRationale: string
  probeCount: number
  generatedAt: string
}

export interface DiagnosticSessionProbeContext {
  weakSkills: string[]
  strongSkills: string[]
  suspectedWeakSkills?: string[]
  skillProbes?: Record<string, { correct: number; attempts: number }>
  shownProblemIds?: string[]
  shownPromptHashes?: string[]
  kindsBySkill?: Record<string, DiagnosticQuestionKind[]>
  continuing?: boolean
}

const QUESTION_KIND_ROTATION: DiagnosticQuestionKind[] = [
  'choice',
  'error_identification',
  'procedural',
  'graph',
]

export function normalizePromptForHash(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function promptHash(prompt: string): string {
  return sha256HexSync(normalizePromptForHash(prompt))
}

export function batchSizeForSession(session: DiagnosticSessionProbeContext): number {
  return session.continuing ? 4 : 6
}

function kindCountForSkill(session: DiagnosticSessionProbeContext, skillId: string, kind: DiagnosticQuestionKind): number {
  return (session.kindsBySkill?.[skillId] ?? []).filter((k) => k === kind).length
}

export function isDuplicateProbe(
  session: DiagnosticSessionProbeContext,
  skillId: string,
  kind: DiagnosticQuestionKind,
  prompt: string,
  problemId?: string,
): boolean {
  if (problemId && (session.shownProblemIds ?? []).includes(problemId)) return true
  const hash = promptHash(prompt)
  if ((session.shownPromptHashes ?? []).includes(hash)) return true
  if (kindCountForSkill(session, skillId, kind) >= 2) return true
  return false
}

export function pickQuestionKind(
  session: DiagnosticSessionProbeContext,
  skillId: string,
  intent: DiagnosticProbeIntentType,
  index: number,
): DiagnosticQuestionKind {
  if (intent === 'confirm_weakness') return index % 2 === 0 ? 'error_identification' : 'procedural'
  if (intent === 'prerequisite_check' || intent === 'method_selection') return 'choice'
  if (intent === 'disconfirm_strength') return 'procedural'
  const kinds = session.kindsBySkill?.[skillId] ?? []
  const unused = QUESTION_KIND_ROTATION.find((k) => !kinds.includes(k))
  return unused ?? QUESTION_KIND_ROTATION[index % QUESTION_KIND_ROTATION.length]
}

function probeForSkill(
  state: MathPilotState,
  session: DiagnosticSessionProbeContext,
  skillId: string,
  intent: DiagnosticProbeIntentType,
  rationale: string,
  index: number,
): DiagnosticProbeIntent | null {
  if (!state.skills[skillId]) return null
  const probes = session.skillProbes?.[skillId]
  if (probes && probes.correct >= 2 && intent !== 'confirm_weakness') return null

  const questionKind = pickQuestionKind(session, skillId, intent, index)
  const mastery = state.mastery[skillId]?.masteryScore ?? 0.3
  let difficultyTarget = Math.min(0.85, Math.max(0.22, mastery + 0.12))
  if (intent === 'disconfirm_strength') difficultyTarget = Math.min(0.9, difficultyTarget + 0.15)
  if (intent === 'prerequisite_check') difficultyTarget = Math.max(0.22, difficultyTarget - 0.08)

  return {
    skillId,
    questionKind,
    intent,
    rationale,
    difficultyTarget,
    requiresShowWork: intent === 'confirm_weakness' && difficultyTarget >= 0.5,
  }
}

function prerequisiteCandidates(state: MathPilotState, session: DiagnosticSessionProbeContext): string[] {
  const out = new Set<string>()
  for (const weakId of [...session.weakSkills, ...(session.suspectedWeakSkills ?? [])]) {
    const weakSkill = state.skills[weakId]
    if (!weakSkill) continue
    for (const prereq of weakSkill.prerequisites) {
      if (!state.skills[prereq]) continue
      const probes = session.skillProbes?.[prereq]
      if (!probes || probes.attempts < 1) out.add(prereq)
    }
  }
  return [...out]
}

/** Deterministic batch plan from session signals (offline-safe). */
export function computeDeterministicBatchPlan(
  state: MathPilotState,
  session: DiagnosticSessionProbeContext,
  batchIndex: number,
): DiagnosticBatchPlan {
  const batchSize = batchSizeForSession(session)
  const ordered = sortSkillsByDiagnosticWeight(state, Object.keys(state.skills), {
    ...session,
    suspectedWeakSkills: session.suspectedWeakSkills ?? [],
  })
  const probes: DiagnosticProbeIntent[] = []
  const usedSkills = new Set<string>()

  const addProbe = (skillId: string, intent: DiagnosticProbeIntentType, rationale: string) => {
    if (probes.length >= batchSize || usedSkills.has(skillId)) return
    const probe = probeForSkill(state, session, skillId, intent, rationale, probes.length)
    if (!probe) return
    probes.push(probe)
    usedSkills.add(skillId)
  }

  for (const skillId of session.weakSkills) {
    addProbe(skillId, 'confirm_weakness', `Confirm weakness on ${state.skills[skillId]?.name ?? skillId}.`)
  }

  for (const skillId of session.suspectedWeakSkills ?? []) {
    if (session.weakSkills.includes(skillId)) continue
    addProbe(skillId, 'confirm_weakness', `Second look at suspected gap: ${state.skills[skillId]?.name ?? skillId}.`)
  }

  for (const prereq of prerequisiteCandidates(state, session)) {
    addProbe(prereq, 'prerequisite_check', `Prerequisite check for ${state.skills[prereq]?.name ?? prereq}.`)
  }

  for (const skillId of session.strongSkills) {
    const counts = session.skillProbes?.[skillId]
    if (counts && counts.correct >= 1 && counts.attempts === 1) {
      addProbe(skillId, 'disconfirm_strength', `Confirm strength on ${state.skills[skillId]?.name ?? skillId}.`)
    }
  }

  for (const skillId of ordered) {
    if (probes.length >= batchSize) break
    if (usedSkills.has(skillId)) continue
    const counts = session.skillProbes?.[skillId]
    if (counts && counts.correct >= 2) continue
    addProbe(skillId, 'broad_scan', `Broad coverage: ${state.skills[skillId]?.name ?? skillId}.`)
  }

  return {
    batchIndex,
    source: 'deterministic',
    batchRationale: probes.length
      ? `Offline plan — focus: ${probes.slice(0, 3).map((p) => state.skills[p.skillId]?.name ?? p.skillId).join(', ')}`
      : 'Offline plan — maintain coverage from problem bank.',
    probes,
    generatedAt: new Date().toISOString(),
  }
}

function parseProbe(raw: unknown, state: MathPilotState): DiagnosticProbeIntent | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const skillId = String(row.skill_id ?? row.skillId ?? '')
  if (!skillId || !state.skills[skillId]) return null

  const intentRaw = String(row.intent ?? 'broad_scan')
  const intent = (
    ['broad_scan', 'confirm_weakness', 'disconfirm_strength', 'prerequisite_check', 'method_selection'] as const
  ).includes(intentRaw as DiagnosticProbeIntentType)
    ? (intentRaw as DiagnosticProbeIntentType)
    : 'broad_scan'

  const kindRaw = String(row.question_kind ?? row.questionKind ?? 'choice')
  const questionKind = (
    ['procedural', 'choice', 'graph', 'error_identification'] as const
  ).includes(kindRaw as DiagnosticQuestionKind)
    ? (kindRaw as DiagnosticQuestionKind)
    : 'choice'

  const rationale = typeof row.rationale === 'string' ? row.rationale : 'Codex probe'
  const difficultyTarget =
    typeof row.difficulty_target === 'number'
      ? row.difficulty_target
      : typeof row.difficultyTarget === 'number'
        ? row.difficultyTarget
        : 0.4

  let problem: CodexProbeProblem | undefined
  const problemRaw = row.problem
  if (problemRaw && typeof problemRaw === 'object') {
    const p = problemRaw as Record<string, unknown>
    const prompt = String(p.prompt ?? '')
    const expectedAnswer = String(p.expected_answer ?? p.expectedAnswer ?? '')
    if (prompt && expectedAnswer) {
      problem = {
        title: p.title ? String(p.title) : undefined,
        prompt,
        expectedAnswer,
        answerType:
          p.answer_type === 'text' || p.answerType === 'text'
            ? 'text'
            : p.answer_type === 'choice' || p.answerType === 'choice'
              ? 'choice'
              : 'expression',
        choices: Array.isArray(p.choices) ? p.choices.map(String) : undefined,
        difficulty: typeof p.difficulty === 'number' ? p.difficulty : difficultyTarget,
        hintSequence: Array.isArray(p.hintSequence)
          ? p.hintSequence.map(String)
          : Array.isArray(p.hints)
            ? p.hints.map(String)
            : undefined,
      }
    }
  }

  return {
    skillId,
    questionKind,
    intent,
    rationale,
    difficultyTarget,
    requiresShowWork: row.requires_show_work === true || row.requiresShowWork === true,
    problem,
  }
}

/** Parse Codex diagnostic batch JSON (legacy skill-only payloads return null). */
export function parseCodexBatchPlanResponse(
  stdout: string,
  state: MathPilotState,
  batchIndex: number,
): DiagnosticBatchPlan | null {
  const match = stdout.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const raw = JSON.parse(match[0]) as Record<string, unknown>
    if (Array.isArray(raw.priority_skill_ids) && !Array.isArray(raw.probes)) return null

    const probesRaw = raw.probes ?? raw.probe_list
    if (!Array.isArray(probesRaw) || !probesRaw.length) return null

    const probes = probesRaw
      .map((entry) => parseProbe(entry, state))
      .filter((p): p is DiagnosticProbeIntent => p !== null)
    if (!probes.length) return null

    const batchRationale =
      typeof raw.batch_rationale === 'string'
        ? raw.batch_rationale
        : typeof raw.batchRationale === 'string'
          ? raw.batchRationale
          : typeof raw.rationale === 'string'
            ? raw.rationale
            : 'Codex adaptive batch'

    return {
      batchIndex,
      source: 'codex',
      batchRationale,
      probes: probes.slice(0, 8),
      generatedAt: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function mergeBatchPlans(
  codex: DiagnosticBatchPlan | null,
  deterministic: DiagnosticBatchPlan,
): DiagnosticBatchPlan {
  if (!codex?.probes.length) return deterministic
  return codex
}

export function recordShownProbe(
  session: DiagnosticSessionProbeContext,
  problemId: string,
  prompt: string,
  skillId: string,
  kind: DiagnosticQuestionKind,
): DiagnosticSessionProbeContext {
  const shownProblemIds = [...(session.shownProblemIds ?? [])]
  if (!shownProblemIds.includes(problemId)) shownProblemIds.push(problemId)

  const hash = promptHash(prompt)
  const shownPromptHashes = [...(session.shownPromptHashes ?? [])]
  if (!shownPromptHashes.includes(hash)) shownPromptHashes.push(hash)

  const kindsBySkill = { ...(session.kindsBySkill ?? {}) }
  const kinds = [...(kindsBySkill[skillId] ?? []), kind]
  kindsBySkill[skillId] = kinds

  return { ...session, shownProblemIds, shownPromptHashes, kindsBySkill }
}
