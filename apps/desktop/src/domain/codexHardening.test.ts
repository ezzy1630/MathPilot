import { describe, expect, it } from 'vitest'
import { extractJsonObject } from './codexJson'
import {
  applyCodexResponse,
  parseCodexInspectResponse,
  parseCodexResponse,
  parseHomeworkCodexResponse,
} from './codexParser'
import {
  codexInspectConfidenceAllowsOverride,
  sanitizeCodexResponse,
  sanitizeStateUpdates,
} from './codexTrust'
import { stripSecretsFromLog } from './aiAdapter'
import { logCodexCall } from './aiAdapter'
import { resolveAnswerDisagreement } from './mathDisagreement'
import { filterKnownSkillIds } from './codexTrust'
import { createInitialState } from './learningEngine'

describe('codexJson', () => {
  it('parses JSON wrapped in markdown fences', () => {
    const parsed = extractJsonObject('```json\n{"feedback_to_user":"ok"}\n```')
    expect(parsed?.feedback_to_user).toBe('ok')
  })

  it('returns null for partial JSON', () => {
    expect(extractJsonObject('{"feedback_to_user": "incomplete')).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    expect(extractJsonObject('not json at all')).toBeNull()
    expect(extractJsonObject('{broken: true}')).toBeNull()
  })
})

describe('codexTrust', () => {
  it('ignores mastery updates for unknown skills', () => {
    const state = createInitialState('Calculus 1')
    const updates = sanitizeStateUpdates(state, {
      skills_to_increase: [{ skill_id: 'fake_skill', delta: 0.5 }],
      skills_to_decrease: ['also_fake'],
    })
    expect(updates).toBeUndefined()
  })

  it('caps large mastery deltas from Codex', () => {
    const state = createInitialState('Calculus 1')
    const before = state.mastery.chain_rule.masteryScore
    const updates = sanitizeStateUpdates(state, {
      skills_to_increase: [{ skill_id: 'chain_rule', delta: 0.9 }],
    })
    const next = applyCodexResponse(state, { state_updates: updates })
    expect(next.mastery.chain_rule.masteryScore - before).toBeLessThanOrEqual(0.1501)
  })

  it('drops untrusted recommended_next_action kinds', () => {
    const state = createInitialState('Calculus 1')
    const safe = sanitizeCodexResponse(state, {
      recommended_next_action: {
        kind: 'run_arbitrary_shell' as never,
        title: 'Inject',
        reason: 'x'.repeat(500),
        skillIds: ['nonexistent'],
        cta: 'Go',
      },
      state_updates: {
        skills_to_increase: [{ skill_id: 'chain_rule', masteryScore: 0.99 }],
      },
    })
    expect(safe.recommended_next_action).toBeUndefined()
    expect(safe.state_updates?.skills_to_increase?.[0].skill_id).toBe('chain_rule')
  })

  it('requires high confidence for Codex inspect override', () => {
    expect(codexInspectConfidenceAllowsOverride(0.84)).toBe(false)
    expect(codexInspectConfidenceAllowsOverride(0.9)).toBe(true)
  })
})

describe('parseCodexResponse', () => {
  it('parses tutor payload from noisy stdout', () => {
    const payload = parseCodexResponse('Here is help:\n{"feedback_to_user":"Try u-sub"}')
    expect(payload?.feedback_to_user).toContain('u-sub')
  })
})

describe('parseHomeworkCodexResponse', () => {
  it('parses homework-specific schema', () => {
    const payload = parseHomeworkCodexResponse(
      JSON.stringify({
        problem_text: 'Find dy/dx',
        extracted_work_summary: 'Used chain rule',
        detected_topic: 'Derivatives',
        correctness: 'incorrect',
        mistake_tags: ['setup:algebra'],
        skills_affected: ['chain_rule'],
        feedback_summary: 'Check inner derivative',
      }),
    )
    expect(payload?.problemText).toBe('Find dy/dx')
    expect(payload?.skillsAffected).toContain('chain_rule')
  })
})

describe('parseCodexInspectResponse', () => {
  it('parses inspect resolution payload', () => {
    const payload = parseCodexInspectResponse(
      JSON.stringify({
        resolution: 'codex',
        correct: true,
        feedback_to_user: 'Equivalent form',
        confidence: 0.92,
      }),
    )
    expect(payload?.resolution).toBe('codex')
    expect(payload?.confidence).toBe(0.92)
  })
})

describe('logCodexCall status', () => {
  it('records timed_out and cancelled', () => {
    const state = createInitialState('Calculus 1')
    const timed = logCodexCall(state, 'hint', 'packet', {
      ok: false,
      stdout: '',
      stderr: 'timeout',
      mode: 'codex_cli',
      timedOut: true,
    })
    expect(timed.aiCalls[0].status).toBe('timed_out')

    const cancelled = logCodexCall(state, 'hint', 'packet', {
      ok: false,
      stdout: '',
      stderr: 'cancelled',
      mode: 'codex_cli',
      cancelled: true,
    })
    expect(cancelled.aiCalls[0].status).toBe('cancelled')
  })
})

describe('stripSecretsFromLog', () => {
  it('redacts embedded homework images', () => {
    const blob = `data:image/png;base64,${'A'.repeat(120)}`
    const sanitized = stripSecretsFromLog(`image: ${blob}`)
    expect(sanitized).toContain('[redacted]')
    expect(sanitized).not.toContain('AAAA')
  })
})

describe('filterKnownSkillIds', () => {
  it('drops unknown map highlight skills', () => {
    const state = createInitialState('Calculus 1')
    expect(filterKnownSkillIds(state, ['chain_rule', 'fake_skill'])).toEqual(['chain_rule'])
  })
})

describe('resolveAnswerDisagreement', () => {
  it('prefers symbolic when checker disagrees with low-trust Codex', () => {
    const resolution = resolveAnswerDisagreement(
      {
        correct: true,
        feedback: 'Symbolic match',
        method: 'symbolic',
        confidence: 0.95,
        normalizedExpected: '1',
        normalizedActual: '1',
        mistakeTags: [],
      },
      false,
      'Codex says wrong',
    )
    expect(resolution.correct).toBe(true)
    expect(resolution.usedAiOverride).toBe(false)
  })
})
