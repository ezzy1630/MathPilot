function isTauri(): boolean {
  return typeof window !== 'undefined' && Boolean((window as Window & { __TAURI__?: unknown }).__TAURI__)
}

export async function ocrHomeworkImage(dataUrl: string): Promise<string> {
  if (!isTauri() || !dataUrl.startsWith('data:')) return ''
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const raw = await invoke<string>('ocr_homework_base64', { dataUrl })
    const parsed = JSON.parse(raw) as { ok?: boolean; text?: string }
    return parsed.ok && parsed.text ? parsed.text.trim() : ''
  } catch {
    return ''
  }
}
