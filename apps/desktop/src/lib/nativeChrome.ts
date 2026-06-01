type TauriWindow = Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }

export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as TauriWindow
  return Boolean(w.__TAURI__ ?? w.__TAURI_INTERNALS__)
}

export async function initNativeChrome(): Promise<void> {
  if (!isTauriRuntime()) return

  document.documentElement.classList.add('platform-tauri', 'platform-macos')

  try {
    const { getCurrentWindow, Effect, EffectState } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    await win.setEffects({
      effects: [Effect.Sidebar],
      state: EffectState.FollowsWindowActiveState,
    })
  } catch {
    // Rust setup applies Sidebar effect when available — CSS fallback still applies
  }
}
