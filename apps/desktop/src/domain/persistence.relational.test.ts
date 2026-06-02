import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialState } from './learningEngine'
import { hydrateState } from './hydrateState'
import { loadRelationalLocal, saveRelationalLocal } from './relationalStore'

const memoryStore = new Map<string, string>()

describe('relational persistence parity', () => {
  beforeEach(() => {
    memoryStore.clear()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => memoryStore.get(k) ?? null,
        setItem: (k: string, v: string) => memoryStore.set(k, v),
        removeItem: (k: string) => memoryStore.delete(k),
        clear: () => memoryStore.clear(),
      },
      configurable: true,
    })
  })

  it('round-trips mistake patterns, ai calls, and diagnostic flags', () => {
    const state = createInitialState('Calculus 1')
    state.mastery.chain_rule.masteryScore = 0.42
    state.mistakePatterns = {
      'setup:missing_equation': {
        tag: 'setup:missing_equation',
        skillIds: ['related_rates'],
        count: 3,
        lastSeen: '2026-06-01T12:00:00Z',
        note: 'Forgot constraint',
      },
    }
    state.aiCalls = [
      {
        id: 'ai-1',
        createdAt: '2026-06-01T12:00:00Z',
        task: 'hint',
        mode: 'codex_cli',
        promptPreview: 'hint chain',
        status: 'received',
        responsePreview: '{"ok":true}',
        sessionId: 'sess-1',
      },
    ]
    state.continuingDiagnosticPending = true
    state.mapViewMode = 'list'
    state.activeVideo = {
      resourceId: 'ka-chain-rule',
      skillIds: ['chain_rule'],
      startedAt: '2026-06-01T12:30:00Z',
      postCheckProblemId: 'p-1',
    }
    state.workedExamples = {
      'ex-1': {
        problemId: 'p-1',
        steps: ['Set up the derivative.', 'Apply the chain rule.'],
        source: 'homework',
        createdAt: '2026-06-01T12:31:00Z',
      },
    }
    state.developerState = {
      pendingDiffPreview: 'diff -- preview',
      lastTestRun: { ok: true, output: 'pass', at: '2026-06-01T12:32:00Z' },
    }
    state.codeChangeProposals = [
      {
        id: 'code-change-1',
        createdAt: '2026-06-01T12:33:00Z',
        summary: 'Test proposal',
        files: ['apps/desktop/src/App.tsx'],
        diffPreview: 'preview',
        status: 'pending_approval',
      },
    ]
    state.diagnostic = {
      id: 'diag-1',
      startedAt: '2026-06-01T10:00:00Z',
      targetCount: 10,
      answeredCount: 2,
      currentIndex: 2,
      queue: [],
      weakSkills: [],
      strongSkills: [],
      completed: false,
      continuing: true,
      triggerReason: 'review_failures',
      skillProbes: {},
    }
    saveRelationalLocal(state)
    const hydrated = hydrateState(loadRelationalLocal()!)
    expect(hydrated.mastery.chain_rule.masteryScore).toBe(0.42)
    expect(hydrated.mistakePatterns['setup:missing_equation']?.count).toBe(3)
    expect(hydrated.aiCalls?.[0]?.sessionId).toBe('sess-1')
    expect(hydrated.continuingDiagnosticPending).toBe(true)
    expect(hydrated.diagnostic?.continuing).toBe(true)
    expect(hydrated.mapViewMode).toBe('list')
    expect(hydrated.activeVideo?.resourceId).toBe('ka-chain-rule')
    expect(hydrated.workedExamples?.['ex-1']?.steps).toHaveLength(2)
    expect(hydrated.developerState?.lastTestRun?.ok).toBe(true)
    expect(hydrated.codeChangeProposals?.[0]?.status).toBe('pending_approval')
  })

  it('ignores corrupt relational localStorage instead of crashing startup', () => {
    memoryStore.set('mathpilot.relational.v1.mastery', '{not-json')
    expect(loadRelationalLocal()).toBeNull()
  })
})
