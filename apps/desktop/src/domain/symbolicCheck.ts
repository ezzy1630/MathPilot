import type { CheckAnswerResult } from './mathEngine'

export interface CalculusVerifyInput {
  expression: string
  expected: string
  mode: 'derivative' | 'integral'
  variables?: string[]
}

/** Payload for Tauri `check_math_symbolic` calculus verification. */
export function buildCalculusCheckInput(input: CalculusVerifyInput): Record<string, unknown> {
  const primaryVar = input.variables?.[0] ?? 'x'
  return {
    verify_mode: input.mode,
    expression: input.expression,
    ...(input.mode === 'derivative'
      ? { expected_derivative: input.expected }
      : { expected_integral: input.expected }),
    variable: primaryVar,
  }
}

export async function checkAnswerSymbolic(
  expected: string,
  actual: string,
  variables?: string[],
): Promise<CheckAnswerResult | null> {
  if (typeof window === 'undefined' || !(window as Window & { __TAURI__?: unknown }).__TAURI__) {
    return null
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const raw = await invoke<string>('check_math_symbolic', {
      input: { expected, actual, variables: variables ?? ['x'] },
    })
    const parsed = JSON.parse(raw) as {
      ok?: boolean
      correct?: boolean
      method?: CheckAnswerResult['method']
      feedback?: string
    }
    if (!parsed.ok && parsed.correct === undefined) return null
    return {
      correct: Boolean(parsed.correct),
      method: parsed.method ?? 'symbolic',
      confidence: parsed.correct ? 0.97 : 0.75,
      normalizedExpected: expected,
      normalizedActual: actual,
      mistakeTags: parsed.correct ? [] : ['answer_form:non_equivalent'],
      feedback: parsed.feedback ?? (parsed.correct ? 'Equivalent form accepted.' : 'Not equivalent.'),
    }
  } catch {
    return null
  }
}

/** Verify derivative/integral relationship via SymPy when available, else numeric probe. */
export async function verifyCalculusSymbolic(
  input: CalculusVerifyInput,
): Promise<'passed' | 'failed' | 'skipped' | null> {
  const variables = input.variables ?? ['x']
  const primaryVar = variables[0] ?? 'x'

  const tauriResult = await invokeCalculusCheck(input)
  if (tauriResult !== null) return tauriResult

  return numericCalculusCheck(input.expression, input.expected, input.mode, variables, primaryVar)
}

async function invokeCalculusCheck(input: CalculusVerifyInput): Promise<'passed' | 'failed' | null> {
  if (typeof window === 'undefined' || !(window as Window & { __TAURI__?: unknown }).__TAURI__) {
    return null
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const raw = await invoke<string>('check_math_symbolic', {
      input: buildCalculusCheckInput(input),
    })
    const parsed = JSON.parse(raw) as { ok?: boolean; correct?: boolean }
    if (parsed.correct !== undefined) {
      return parsed.correct ? 'passed' : 'failed'
    }
    return null
  } catch {
    return null
  }
}

function evaluateExpression(expression: string, context: Record<string, number>): number {
  const names = Object.keys(context)
  const values = Object.values(context)
  const safe = expression
    .replace(/\*\*/g, '^')
    .replace(/\^/g, '**')
    .replace(/\bsin\(/g, 'Math.sin(')
    .replace(/\bcos\(/g, 'Math.cos(')
    .replace(/\btan\(/g, 'Math.tan(')
    .replace(/\blog\(/g, 'Math.log(')
    .replace(/\bln\(/g, 'Math.log(')
    .replace(/\bsqrt\(/g, 'Math.sqrt(')
    .replace(/\bpi\b/g, 'Math.PI')
    .replace(/\barcsin\(/g, 'Math.asin(')
    .replace(/\barctan\(/g, 'Math.atan(')
    .replace(/\bexp\(/g, 'Math.exp(')
  const fn = new Function(...names, `"use strict"; return (${safe});`)
  return Number(fn(...values))
}

function numericCalculusCheck(
  expression: string,
  expected: string,
  mode: 'derivative' | 'integral',
  variables: string[],
  primaryVar: string,
): 'passed' | 'failed' | 'skipped' {
  try {
    const points = [-1.5, -0.4, 0.3, 1.1, 2.2]
    const h = 1e-4

    for (const point of points) {
      const context: Record<string, number> = {}
      for (let i = 0; i < variables.length; i += 1) {
        context[variables[i]] = i === 0 ? point : point + i * 0.17
      }
      const ctxPlus = { ...context, [primaryVar]: context[primaryVar] + h }
      const ctxMinus = { ...context, [primaryVar]: context[primaryVar] - h }

      if (mode === 'derivative') {
        const numerical =
          (evaluateExpression(expression, ctxPlus) - evaluateExpression(expression, ctxMinus)) / (2 * h)
        const expectedVal = evaluateExpression(expected, context)
        if (!Number.isFinite(numerical) || !Number.isFinite(expectedVal)) continue
        if (Math.abs(numerical - expectedVal) > 1e-3) return 'failed'
      } else {
        const numerical =
          (evaluateExpression(expected, ctxPlus) - evaluateExpression(expected, ctxMinus)) / (2 * h)
        const integrandVal = evaluateExpression(expression, context)
        if (!Number.isFinite(numerical) || !Number.isFinite(integrandVal)) continue
        if (Math.abs(numerical - integrandVal) > 1e-3) return 'failed'
      }
    }
    return 'passed'
  } catch {
    return 'skipped'
  }
}
