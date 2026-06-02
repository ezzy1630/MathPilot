type TauriWindow = Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }

export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as TauriWindow
  return Boolean(w.__TAURI__ ?? w.__TAURI_INTERNALS__)
}

function shellBackgroundForTheme(): { r: number; g: number; b: number } {
  const dark = document.documentElement.classList.contains('theme-dark')
  return dark ? { r: 28, g: 28, b: 30 } : { r: 244, g: 244, b: 245 }
}

export async function syncNativeWindowBackground(): Promise<void> {
  if (!isTauriRuntime()) return
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const { r, g, b } = shellBackgroundForTheme()
    await getCurrentWindow().setBackgroundColor({ red: r, green: g, blue: b, alpha: 255 })
  } catch {
    // Window color API unavailable in this build
  }
}

export async function initNativeChrome(): Promise<void> {
  if (!isTauriRuntime()) return

  document.documentElement.classList.add('platform-tauri', 'platform-macos')
  await syncNativeWindowBackground()

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
