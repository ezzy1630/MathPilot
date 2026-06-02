import { describe, expect, it } from 'vitest'
import {
  DIAGNOSTIC_PLANNER_INTERVAL,
  parseDiagnosticPlannerResponse,
  shouldRunDiagnosticPlanner,
} from './diagnosticPlanner'
import type { DiagnosticSessionState } from './types'

function session(
  partial: Partial<DiagnosticSessionState & { continuing?: boolean }>,
): DiagnosticSessionState & { continuing?: boolean } {
  return {
    id: 'diag-test',
    startedAt: new Date().toISOString(),
    targetCount: 25,
    answeredCount: 0,
    currentIndex: 0,
    queue: [],
    weakSkills: [],
    strongSkills: [],
    completed: false,
    continuing: false,
    ...partial,
  }
}

describe('diagnosticPlanner', () => {
  it('runs every N answers when not continuing', () => {
    expect(DIAGNOSTIC_PLANNER_INTERVAL).toBe(3)
    expect(shouldRunDiagnosticPlanner(session({ answeredCount: 3 }))).toBe(true)
    expect(shouldRunDiagnosticPlanner(session({ answeredCount: 2 }))).toBe(false)
    expect(shouldRunDiagnosticPlanner(session({ answeredCount: 0 }))).toBe(false)
    expect(shouldRunDiagnosticPlanner(session({ answeredCount: 6, continuing: true }))).toBe(false)
    expect(shouldRunDiagnosticPlanner(session({ answeredCount: 6, completed: true }))).toBe(false)
  })

  it('parses codex planner JSON', () => {
    const payload = parseDiagnosticPlannerResponse(
      'noise\n{"priority_skill_ids":["chain_rule","limits"],"rationale":"probe gaps"}',
    )
    expect(payload?.priority_skill_ids).toEqual(['chain_rule', 'limits'])
    expect(payload?.rationale).toBe('probe gaps')
  })
})
