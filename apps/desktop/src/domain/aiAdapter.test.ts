import { describe, expect, it } from 'vitest'
import {
  buildCodexSessionId,
  createPromptPacket,
  resolveCodexSession,
  wrapPacketForChatGPT,
} from './aiAdapter'
import { createInitialState } from './learningEngine'

describe('ai adapter', () => {
  it('includes skill, memory, problem, and review context', () => {
    const state = createInitialState('Calculus 1')
    state.reviewQueue = [
      {
        id: 'r',
        skillId: 'chain_rule',
        due: '2020-01-01',
        intervalDays: 1,
        priority: 80,
        reason: 'due',
      },
    ]
    const packet = createPromptPacket(state, 'hint', state.problems['diagnostic-chain-setup'], '6x(x^2+1)^2', undefined, [
      '## skills/teaching/teach_chain_rule.md\nChain rule teaching content.',
    ])
    expect(packet).toContain('## Memory')
    expect(packet).toContain('Skill instructions')
    expect(packet).toContain('teach_chain_rule')
    expect(packet).toContain('Review due')
    expect(packet).toContain('chain_rule')
    expect(packet).toContain('6x(x^2+1)^2')
  })

  it('embeds session metadata for continuity tasks', () => {
    const state = createInitialState('Calculus 1')
    const problem = state.problems['diagnostic-chain-setup']
    const packet = createPromptPacket(state, 'explain chain rule', problem, undefined, [], [], {
      sessionId: 'tutor_session_chain_rule',
      resume: true,
    })
    expect(packet).toContain('Session-Id: tutor_session_chain_rule')
    expect(packet).toContain('Resume: true')
  })

  it('persists codex session ids per task family', () => {
    const state = createInitialState('Calculus 1')
    const { sessionId, state: next } = resolveCodexSession(state, 'homework_analysis', undefined, 'hw-1')
    expect(sessionId).toMatch(/^grading_session_/)
    expect(next.codexSessions).toBeDefined()
  })

  it('builds tutor session id from skill', () => {
    expect(buildCodexSessionId('tutor', 'explain', { id: 'p', skillIds: ['chain_rule'] } as never)).toBe(
      'tutor_session_chain_rule',
    )
  })

  it('wraps packets for ChatGPT', () => {
    const wrapped = wrapPacketForChatGPT('TASK BODY')
    expect(wrapped).toContain('MathPilot')
    expect(wrapped).toContain('TASK BODY')
  })
})
