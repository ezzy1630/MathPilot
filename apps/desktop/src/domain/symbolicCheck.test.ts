import { beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}))

import { buildCalculusCheckInput, verifyCalculusSymbolic } from './symbolicCheck'

describe('symbolicCheck calculus payload', () => {
  beforeEach(() => {
    invoke.mockReset()
    vi.stubGlobal('window', { __TAURI__: {} } as Window & { __TAURI__: unknown })
  })

  it('buildCalculusCheckInput maps derivative mode to verify_mode and expected_derivative', () => {
    expect(
      buildCalculusCheckInput({
        expression: 'x^3',
        expected: '3*x^2',
        mode: 'derivative',
        variables: ['x'],
      }),
    ).toEqual({
      verify_mode: 'derivative',
      expression: 'x^3',
      expected_derivative: '3*x^2',
      variable: 'x',
    })
  })

  it('buildCalculusCheckInput maps integral mode to expected_integral', () => {
    expect(
      buildCalculusCheckInput({
        expression: '2*x',
        expected: 'x^2',
        mode: 'integral',
      }),
    ).toEqual({
      verify_mode: 'integral',
      expression: '2*x',
      expected_integral: 'x^2',
      variable: 'x',
    })
  })

  it('verifyCalculusSymbolic forwards calculus fields to check_math_symbolic', async () => {
    invoke.mockResolvedValue(JSON.stringify({ ok: true, correct: true, method: 'symbolic' }))

    const result = await verifyCalculusSymbolic({
      expression: 'x^2',
      expected: '2*x',
      mode: 'derivative',
      variables: ['x'],
    })

    expect(result).toBe('passed')
    expect(invoke).toHaveBeenCalledWith('check_math_symbolic', {
      input: {
        verify_mode: 'derivative',
        expression: 'x^2',
        expected_derivative: '2*x',
        variable: 'x',
      },
    })
  })
})
