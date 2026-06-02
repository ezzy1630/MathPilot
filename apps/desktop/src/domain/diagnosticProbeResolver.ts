import {
  diagnosticMixForSkills,
  inferDiagnosticQuestionKind,
  type DiagnosticQuestionKind,
} from './diagnosticQuestionMix'
import { diagnosticProblemForSkill } from './diagnosticTemplates'
import { problemBankForDiagnostic } from './problemBank'
import { generateProblemForSkillAsync } from './problemGenerator'
import { validateDiagnosticCandidate } from './problemValidation'
import { enrichProblemWithLatex } from '../lib/problemLatex'
import {
  isDuplicateProbe,
  promptHash,
  type CodexProbeProblem,
  type DiagnosticProbeIntent,
  type DiagnosticSessionProbeContext,
} from './diagnosticBatchPlan'
import type { ValidateProblemResult } from './problemValidation'
import type { MathPilotState, Problem } from './types'

export interface DiagnosticProbeResult {
  intent: DiagnosticProbeIntent
  problemId: string
  validation: ValidateProblemResult
  source: 'codex_generated' | 'template_engine' | 'diagnostic_mix' | 'problem_bank' | 'diagnostic_template'
}

function shuffleChoicesDeterministic(choices: string[], seed: string): string[] {
  const out = [...choices]
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  for (let i = out.length - 1; i > 0; i -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0
    const j = hash % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function problemFromCodexPayload(
  probe: DiagnosticProbeIntent,
  payload: CodexProbeProblem,
  seed: number,
): Problem {
  const id = `diag-codex-${probe.skillId}-${seed}`
  const answerType = payload.answerType ?? 'expression'
  const choices =
    answerType === 'choice' && payload.choices?.length
      ? shuffleChoicesDeterministic(payload.choices, `${probe.skillId}-${seed}`)
      : payload.choices

  return enrichProblemWithLatex({
    id,
    title: payload.title ?? `Diagnostic: ${probe.skillId}`,
    prompt: payload.prompt,
    skillIds: [probe.skillId],
    difficulty: payload.difficulty ?? probe.difficultyTarget,
    mode: 'diagnostic',
    answerType,
    expectedAnswer: payload.expectedAnswer,
    choices,
    hintSequence: payload.hintSequence ?? ['Review the relevant skill.'],
    verificationStatus: 'unverified_used',
    source: `diagnostic_${probe.questionKind}`,
    requiresShowWork: probe.requiresShowWork,
  })
}

function mixProblemForProbe(
  probe: DiagnosticProbeIntent,
  session: DiagnosticSessionProbeContext,
  seed: number,
): Problem | null {
  const items = diagnosticMixForSkills([probe.skillId]).filter(
    (p) => inferDiagnosticQuestionKind(p) === probe.questionKind,
  )
  const pool = items.length ? items : diagnosticMixForSkills([probe.skillId])
  for (let i = 0; i < pool.length; i += 1) {
    const candidate = pool[(seed + i) % pool.length]
    if (!isDuplicateProbe(session, probe.skillId, probe.questionKind, candidate.prompt, candidate.id)) {
      return { ...candidate, mode: 'diagnostic' }
    }
  }
  return null
}

function bankProblemForProbe(
  state: MathPilotState,
  probe: DiagnosticProbeIntent,
  session: DiagnosticSessionProbeContext,
  used: Set<string>,
): Problem | null {
  const pool = problemBankForDiagnostic(state).filter(
    (p) =>
      !p.deprecated &&
      p.skillIds.includes(probe.skillId) &&
      !used.has(p.id) &&
      !(session.shownProblemIds ?? []).includes(p.id),
  )
  for (const problem of pool) {
    const kind = inferDiagnosticQuestionKind(problem)
    if (probe.questionKind !== 'procedural' && kind !== probe.questionKind) continue
    if (isDuplicateProbe(session, probe.skillId, probe.questionKind, problem.prompt, problem.id)) continue
    return { ...problem, mode: 'diagnostic' }
  }
  for (const problem of pool) {
    if (isDuplicateProbe(session, probe.skillId, probe.questionKind, problem.prompt, problem.id)) continue
    return { ...problem, mode: 'diagnostic' }
  }
  return null
}

async function validateAndAccept(
  problem: Problem,
  probe: DiagnosticProbeIntent,
): Promise<{ ok: boolean; validation: ValidateProblemResult }> {
  const validation = await validateDiagnosticCandidate(problem, probe)
  return { ok: validation.ok, validation }
}

/** Resolve one probe into a validated diagnostic problem (fallback chain). */
export async function resolveDiagnosticProbeAsync(
  state: MathPilotState,
  probe: DiagnosticProbeIntent,
  session: DiagnosticSessionProbeContext,
  seed: number,
  usedProblemIds: Set<string>,
): Promise<{ state: MathPilotState; result: DiagnosticProbeResult | null }> {
  const tryAccept = async (
    problem: Problem,
    source: DiagnosticProbeResult['source'],
  ): Promise<{ state: MathPilotState; result: DiagnosticProbeResult | null } | null> => {
    if (isDuplicateProbe(session, probe.skillId, probe.questionKind, problem.prompt, problem.id)) return null
    if (usedProblemIds.has(problem.id)) return null

    const { ok, validation } = await validateAndAccept(problem, probe)
    if (!ok && problem.answerType === 'expression') return null

    const status = ok ? 'verified' : 'unverified_used'
    const finalized: Problem = {
      ...problem,
      mode: 'diagnostic',
      verificationStatus: status,
      requiresShowWork: probe.requiresShowWork ?? problem.requiresShowWork,
    }

    return {
      state: {
        ...state,
        problems: { ...state.problems, [finalized.id]: finalized },
      },
      result: {
        intent: probe,
        problemId: finalized.id,
        validation,
        source,
      },
    }
  }

  if (probe.problem) {
    const codexProblem = problemFromCodexPayload(probe, probe.problem, seed)
    const accepted = await tryAccept(codexProblem, 'codex_generated')
    if (accepted) return accepted
  }

  const template = diagnosticProblemForSkill(probe.skillId, seed)
  if (template) {
    const accepted = await tryAccept(template, 'diagnostic_template')
    if (accepted) return accepted
  }

  const generated = await generateProblemForSkillAsync(state, probe.skillId, seed)
  if (generated) {
    const problem = { ...generated.record.problem, mode: 'diagnostic' as const }
    const accepted = await tryAccept(problem, 'template_engine')
    if (accepted) {
      return {
        state: {
          ...accepted.state,
          changelog: generated.state.changelog,
        },
        result: accepted.result,
      }
    }
  }

  const mix = mixProblemForProbe(probe, session, seed)
  if (mix) {
    const accepted = await tryAccept(mix, 'diagnostic_mix')
    if (accepted) return accepted
  }

  const bank = bankProblemForProbe(state, probe, session, usedProblemIds)
  if (bank) {
    const accepted = await tryAccept(bank, 'problem_bank')
    if (accepted) return accepted
  }

  return { state, result: null }
}

export function priorDiagnosticProblemIds(state: MathPilotState): Set<string> {
  return new Set(state.attempts.filter((a) => a.mode === 'diagnostic').map((a) => a.problemId))
}

export function trackAnsweredProblem(
  session: DiagnosticSessionProbeContext,
  problem: Problem,
): DiagnosticSessionProbeContext {
  const kind = inferDiagnosticQuestionKind(problem) as DiagnosticQuestionKind
  return {
    ...session,
    shownProblemIds: [...new Set([...(session.shownProblemIds ?? []), problem.id])],
    shownPromptHashes: [...new Set([...(session.shownPromptHashes ?? []), promptHash(problem.prompt)])],
    kindsBySkill: {
      ...(session.kindsBySkill ?? {}),
      [problem.skillIds[0] ?? '']: [
        ...(session.kindsBySkill?.[problem.skillIds[0] ?? ''] ?? []),
        kind,
      ],
    },
  }
}
