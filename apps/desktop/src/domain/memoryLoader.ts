const MEMORY_SNIPPETS: Record<string, string> = {
  profile: `- Learner prefers serious, direct, research-backed explanations.
- Learner wants strict mastery with supportive tutoring.
- Learner benefits from clear step-by-step explanations.`,
  learning_model: `- Learner may need setup-focused explanations for application problems.
- Learner should receive delayed mixed review before mastery is trusted.`,
  durable_notes: `- MathPilot stores progress locally; no cloud account required.`,
  preferences: `- Default session pace: normal.
- Raw homework images deleted unless user opts in.`,
}

export function loadMemorySnippet(name: keyof typeof MEMORY_SNIPPETS): string {
  return MEMORY_SNIPPETS[name] ?? ''
}

export function loadAllMemoryForPrompt(): string[] {
  return Object.entries(MEMORY_SNIPPETS).map(([key, body]) => `## ${key}\n${body}`)
}

export async function loadMemoryFromDisk(): Promise<string[]> {
  if (typeof window === 'undefined' || !(window as Window & { __TAURI__?: unknown }).__TAURI__) {
    return loadAllMemoryForPrompt()
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const files = await invoke<string[]>('read_memory_files')
    return files.length ? files : loadAllMemoryForPrompt()
  } catch {
    return loadAllMemoryForPrompt()
  }
}
