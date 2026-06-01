import type { MathPilotState } from '../domain/types'

export function pushToast(
  state: MathPilotState,
  message: string,
  tone: 'success' | 'info' | 'warning' = 'info',
): MathPilotState {
  const id = `toast-${Date.now()}`
  return {
    ...state,
    toastQueue: [...(state.toastQueue ?? []), { id, message, tone }].slice(-4),
  }
}

export function dismissToast(state: MathPilotState, id: string): MathPilotState {
  return {
    ...state,
    toastQueue: (state.toastQueue ?? []).filter((t) => t.id !== id),
  }
}
