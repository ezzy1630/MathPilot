/** Extract the first JSON object from Codex stdout (strips markdown fences and prose). */
export function extractJsonObject(stdout: string): Record<string, unknown> | null {
  let trimmed = stdout.trim()
  if (!trimmed) return null

  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i)
  if (fence) trimmed = fence[1].trim()

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}
