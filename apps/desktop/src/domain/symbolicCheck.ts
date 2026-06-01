import type { CheckAnswerResult } from './mathEngine'

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
